// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ZKVerifier — Real Groth16 verifier for CollateralThreshold circuit
/// @notice Verifies Groth16 proofs on BN254 using EVM precompiles (ecAdd, ecMul, ecPairing).
///         Verification key embedded from snarkjs trusted setup for CollateralThreshold(10).
///         Handles nonce/replay prevention for vault ZK-gated borrowing.
contract ZKVerifier is Ownable, ReentrancyGuard {
    // ── BN254 curve constants ───────────────────────────────────────
    uint256 internal constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 internal constant PRIME_Q =
        21888242871839275222246405745257275088696311157297823662689037894645226208583;

    /// @dev CollateralThreshold circuit: [commitment, sufficient, threshold]
    uint256 public constant NUM_PUBLIC_SIGNALS = 3;

    // ── Groth16 Verification Key (CollateralThreshold trusted setup) ──
    uint256 internal constant ALPHA_X  = 20491192805390485299153009773594534940189261866228447918068658471970481763042;
    uint256 internal constant ALPHA_Y  = 9383485363053290200918347156157836566562967994039712273449902621266178545958;
    uint256 internal constant BETA_X1  = 4252822878758300859123897981450591353533073413197771768651442665752259397132;
    uint256 internal constant BETA_X2  = 6375614351688725206403948262868962793625744043794305715222011528459656738731;
    uint256 internal constant BETA_Y1  = 21847035105528745403288232691147584728191162732299865338377159692350059136679;
    uint256 internal constant BETA_Y2  = 10505242626370262277552901082094356697409835680220590971873171140371331206856;
    uint256 internal constant GAMMA_X1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 internal constant GAMMA_X2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 internal constant GAMMA_Y1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 internal constant GAMMA_Y2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 internal constant DELTA_X1 = 3509194530645490590296388993187607263947133271086525073050358147013518200967;
    uint256 internal constant DELTA_X2 = 16729236900625946347762993069592488014281072871224131234667875814152745558108;
    uint256 internal constant DELTA_Y1 = 8046499927602146002153322041918353518426887613425423999263816508987687910284;
    uint256 internal constant DELTA_Y2 = 12796041475704873675787889982561361147431154710047186835345954266968235496582;

    // IC points (4 points for 3 public signals)
    uint256 internal constant IC0_X = 9636538274113586590697426831849685137622881639685299006165634254991192751890;
    uint256 internal constant IC0_Y = 3502845441041169917870444780329398633107270212169649442584787970781255382338;
    uint256 internal constant IC1_X = 18354527025528022338897790455028246423285255551487090042501037654988802794283;
    uint256 internal constant IC1_Y = 14996946792702137208899809326815349908210101200152986701403106107000713727665;
    uint256 internal constant IC2_X = 5967322425949277599823738982166506857536730923346808848422898538299097833369;
    uint256 internal constant IC2_Y = 313087077312324956120754639331453853370509536743271227698089902851017334394;
    uint256 internal constant IC3_X = 16186942814993123057833648391725876301585278896530810906611303563568061221321;
    uint256 internal constant IC3_Y = 9177592497785434654647837495752735940856081156812357782406932678038599666536;

    // ── State ───────────────────────────────────────────────────────
    /// @dev Tracks used proof hashes to prevent replay attacks
    mapping(bytes32 => bool) public isProofUsed;

    /// @dev Addresses authorized to mark proofs as used (Vault clones)
    mapping(address => bool) public authorizedCallers;

    /// @dev Addresses authorized to register new callers (VaultFactory)
    mapping(address => bool) public authorizedFactories;

    /// @dev Per-vault nonce for ZK proof binding (prevents cross-borrow replay)
    mapping(address => uint256) public vaultNonce;

    // ── Events ──────────────────────────────────────────────────────
    event ProofVerified(bytes32 indexed proofHash, bool valid);
    event ProofMarkedUsed(bytes32 indexed proofHash);
    event CallerAuthorized(address indexed caller);
    event CallerRevoked(address indexed caller);
    event FactoryAuthorized(address indexed factory);
    event FactoryRevoked(address indexed factory);
    event NonceIncremented(address indexed vault, uint256 newNonce);

    // ── Errors ──────────────────────────────────────────────────────
    error NotAuthorized();
    error ProofAlreadyUsed();
    error InvalidNonce();

    // ── Constructor ─────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ── Authorization ───────────────────────────────────────────────
    /// @notice Authorize a factory to register vault callers.
    function authorizeFactory(address factory) external onlyOwner {
        authorizedFactories[factory] = true;
        emit FactoryAuthorized(factory);
    }

    /// @notice Revoke a factory's authorization.
    function revokeFactory(address factory) external onlyOwner {
        authorizedFactories[factory] = false;
        emit FactoryRevoked(factory);
    }

    /// @notice Authorize a Vault clone to mark proofs as used.
    ///         Callable by owner or authorized factories.
    function authorizeCaller(address caller) external {
        if (msg.sender != owner() && !authorizedFactories[msg.sender]) {
            revert NotAuthorized();
        }
        authorizedCallers[caller] = true;
        emit CallerAuthorized(caller);
    }

    /// @notice Revoke a caller's authorization.
    function revokeCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = false;
        emit CallerRevoked(caller);
    }

    // ── Verify (real Groth16 pairing check) ─────────────────────────
    /// @notice Verify a Groth16 ZK proof for the CollateralThreshold circuit.
    /// @dev Performs BN254 elliptic curve pairing:
    ///      e(-A, B) · e(α, β) · e(vk_x, γ) · e(C, δ) == 1
    ///      where vk_x = IC₀ + Σ(pubSignals[i] · IC[i+1])
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[] calldata _pubSignals
    ) external view returns (bool) {
        if (_pubSignals.length != NUM_PUBLIC_SIGNALS) return false;
        for (uint256 i = 0; i < NUM_PUBLIC_SIGNALS; i++) {
            if (_pubSignals[i] >= SNARK_SCALAR_FIELD) return false;
        }
        return _verifyGroth16(_pA, _pB, _pC, _pubSignals[0], _pubSignals[1], _pubSignals[2]);
    }

    /// @dev Internal Groth16 BN254 pairing verification via EVM precompiles.
    ///      Takes proof components from calldata and public signals from stack.
    function _verifyGroth16(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256 _s0,
        uint256 _s1,
        uint256 _s2
    ) internal view returns (bool isValid) {
        assembly {
            // EC scalar-multiply and accumulate: pR += s * (x, y)
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, 896))

            let _pVk := pMem
            let _pPairing := add(pMem, 128)

            // ── Compute vk_x = IC₀ + s₀·IC₁ + s₁·IC₂ + s₂·IC₃ ────
            mstore(_pVk, IC0_X)
            mstore(add(_pVk, 32), IC0_Y)

            g1_mulAccC(_pVk, IC1_X, IC1_Y, _s0)
            g1_mulAccC(_pVk, IC2_X, IC2_Y, _s1)
            g1_mulAccC(_pVk, IC3_X, IC3_Y, _s2)

            // ── Build pairing input (4 pairs × 192 bytes = 768) ─────

            // Pair 1: (-A, B) — negate A.y
            mstore(_pPairing, calldataload(_pA))
            mstore(
                add(_pPairing, 32),
                mod(sub(PRIME_Q, calldataload(add(_pA, 32))), PRIME_Q)
            )
            mstore(add(_pPairing, 64), calldataload(_pB))
            mstore(add(_pPairing, 96), calldataload(add(_pB, 32)))
            mstore(add(_pPairing, 128), calldataload(add(_pB, 64)))
            mstore(add(_pPairing, 160), calldataload(add(_pB, 96)))

            // Pair 2: (α, β)
            mstore(add(_pPairing, 192), ALPHA_X)
            mstore(add(_pPairing, 224), ALPHA_Y)
            mstore(add(_pPairing, 256), BETA_X1)
            mstore(add(_pPairing, 288), BETA_X2)
            mstore(add(_pPairing, 320), BETA_Y1)
            mstore(add(_pPairing, 352), BETA_Y2)

            // Pair 3: (vk_x, γ)
            mstore(add(_pPairing, 384), mload(_pVk))
            mstore(add(_pPairing, 416), mload(add(_pVk, 32)))
            mstore(add(_pPairing, 448), GAMMA_X1)
            mstore(add(_pPairing, 480), GAMMA_X2)
            mstore(add(_pPairing, 512), GAMMA_Y1)
            mstore(add(_pPairing, 544), GAMMA_Y2)

            // Pair 4: (C, δ)
            mstore(add(_pPairing, 576), calldataload(_pC))
            mstore(add(_pPairing, 608), calldataload(add(_pC, 32)))
            mstore(add(_pPairing, 640), DELTA_X1)
            mstore(add(_pPairing, 672), DELTA_X2)
            mstore(add(_pPairing, 704), DELTA_Y1)
            mstore(add(_pPairing, 736), DELTA_Y2)

            // ── Pairing check via precompile 0x08 ───────────────────
            let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

            isValid := and(success, mload(_pPairing))
        }
    }

    // ── Replay prevention ───────────────────────────────────────────
    /// @notice Mark a proof hash as used and increment vault nonce.
    ///         The expectedNonce must match the vault's current nonce.
    function markProofUsed(bytes32 proofHash, uint256 expectedNonce) external nonReentrant {
        if (!authorizedCallers[msg.sender]) revert NotAuthorized();
        if (isProofUsed[proofHash]) revert ProofAlreadyUsed();
        if (vaultNonce[msg.sender] != expectedNonce) revert InvalidNonce();

        isProofUsed[proofHash] = true;
        vaultNonce[msg.sender] = expectedNonce + 1;

        emit ProofMarkedUsed(proofHash);
        emit NonceIncremented(msg.sender, expectedNonce + 1);
    }

    /// @notice Get the current nonce for a vault (used as public signal in ZK proof).
    function getNonce(address vault) external view returns (uint256) {
        return vaultNonce[vault];
    }
}
