// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IZKVerifier {
    function verifyProof(
        uint256[2] calldata pA,
        uint256[2][2] calldata pB,
        uint256[2] calldata pC,
        uint256[] calldata pubSignals
    ) external view returns (bool);

    function isProofUsed(bytes32 proofHash) external view returns (bool);
    function markProofUsed(bytes32 proofHash, uint256 expectedNonce) external;
    function getNonce(address vault) external view returns (uint256);
    function vaultNonce(address vault) external view returns (uint256);
}

interface IVault {
    // ── Events ──────────────────────────────────────────────────────
    event Deposited(address indexed token, uint256 amount);
    event Withdrawn(address indexed token, uint256 amount);
    event Borrowed(address indexed token, uint256 amount, bytes32 proofHash);
    event Repaid(address indexed token, uint256 amount);
    event DefaultTriggered(address indexed by, uint256 debtAtDefault);
    event Seized(address indexed token, uint256 amount);

    // ── Views ───────────────────────────────────────────────────────
    function owner() external view returns (address);
    function collateral(address token) external view returns (uint256);
    function debt(address token) external view returns (uint256);
    function isDefaulted() external view returns (bool);

    // ── Mutative ────────────────────────────────────────────────────
    function initialize(address owner, address zkVerifier) external;
    function deposit(address token, uint256 amount) external;
    function withdraw(address token, uint256 amount) external;
    function borrow(
        address token,
        uint256 amount,
        uint256[2] calldata pA,
        uint256[2][2] calldata pB,
        uint256[2] calldata pC,
        uint256[] calldata pubSignals
    ) external;
    function repay(address token, uint256 amount) external;
    function triggerDefault() external;
    function seize(address token) external;
}
