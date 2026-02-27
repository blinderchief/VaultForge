// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ZKVerifier — Groth16 verifier stub
/// @notice This is a placeholder that always returns true.
///         It will be replaced by the auto-generated snarkjs Solidity verifier
///         in Phase 3 (ZK Circuits). Includes nonce/replay prevention.
contract ZKVerifier is Ownable, ReentrancyGuard {
    // ── State ───────────────────────────────────────────────────────
    /// @dev Tracks used proof hashes to prevent replay attacks
    mapping(bytes32 => bool) public isProofUsed;

    /// @dev Addresses authorized to mark proofs as used (Vault clones)
    mapping(address => bool) public authorizedCallers;

    /// @dev Per-vault nonce for ZK proof binding (prevents cross-borrow replay)
    mapping(address => uint256) public vaultNonce;

    // ── Events ──────────────────────────────────────────────────────
    event ProofVerified(bytes32 indexed proofHash, bool valid);
    event ProofMarkedUsed(bytes32 indexed proofHash);
    event CallerAuthorized(address indexed caller);
    event CallerRevoked(address indexed caller);
    event NonceIncremented(address indexed vault, uint256 newNonce);

    // ── Errors ──────────────────────────────────────────────────────
    error NotAuthorized();
    error ProofAlreadyUsed();
    error InvalidNonce();

    // ── Constructor ─────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ── Authorization ───────────────────────────────────────────────
    /// @notice Authorize a Vault clone to mark proofs as used.
    function authorizeCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = true;
        emit CallerAuthorized(caller);
    }

    /// @notice Revoke a caller's authorization.
    function revokeCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = false;
        emit CallerRevoked(caller);
    }

    // ── Verify ──────────────────────────────────────────────────────
    /// @notice Verify a Groth16 proof.
    /// @dev STUB: always returns true. Will be replaced by real verifier.
    ///      In production, this checks the elliptic curve pairing equation.
    function verifyProof(
        uint256[2] calldata, /* pA */
        uint256[2][2] calldata, /* pB */
        uint256[2] calldata, /* pC */
        uint256[] calldata /* pubSignals */
    ) external pure returns (bool) {
        // STUB: Always valid. Replaced by snarkjs-generated verifier in Phase 3.
        return true;
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
