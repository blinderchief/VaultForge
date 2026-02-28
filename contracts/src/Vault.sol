// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {IZKVerifier} from "./interfaces/IVault.sol";

/// @title Vault — Non-custodial collateral vault with ZK-gated borrowing
/// @notice Each user gets their own Vault clone via VaultFactory (EIP-1167).
///         Borrowing requires a valid Groth16 ZK proof. Seizure is always partial.
contract Vault is Initializable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Constants ───────────────────────────────────────────────────
    /// @dev 105% of debt — penalty multiplier for seizure (scaled by 1e18)
    uint256 public constant SEIZURE_PENALTY = 1.05e18;
    /// @dev Max 50% of any single collateral token can be seized
    uint256 public constant MAX_SEIZURE_RATIO = 0.5e18;
    /// @dev Scaling factor
    uint256 private constant WAD = 1e18;

    // ── State ───────────────────────────────────────────────────────
    address public owner;
    IZKVerifier public zkVerifier;
    bool public isDefaulted;

    /// @dev token → deposited collateral balance
    mapping(address => uint256) public collateral;
    /// @dev token → outstanding debt balance
    mapping(address => uint256) public debt;

    // ── Events ──────────────────────────────────────────────────────
    event Deposited(address indexed token, uint256 amount);
    event Withdrawn(address indexed token, uint256 amount);
    event Borrowed(address indexed token, uint256 amount, bytes32 proofHash);
    event Repaid(address indexed token, uint256 amount);
    event DefaultTriggered(address indexed by, uint256 debtAtDefault);
    event Seized(address indexed token, uint256 amount);

    // ── Errors ──────────────────────────────────────────────────────
    error NotOwner();
    error ZeroAmount();
    error InsufficientCollateral();
    error InsufficientDebt();
    error VaultDefaulted();
    error VaultNotDefaulted();
    error InvalidProof();
    error ProofAlreadyUsed();

    // ── Modifiers ───────────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier notDefaulted() {
        if (isDefaulted) revert VaultDefaulted();
        _;
    }

    // ── Initializer (called by VaultFactory after clone) ────────────
    function initialize(address _owner, address _zkVerifier) external initializer {
        owner = _owner;
        zkVerifier = IZKVerifier(_zkVerifier);
    }

    // ── Deposit ─────────────────────────────────────────────────────
    /// @notice Deposit ERC-20 collateral into the vault.
    function deposit(address token, uint256 amount) external onlyOwner notDefaulted nonReentrant {
        if (amount == 0) revert ZeroAmount();
        collateral[token] += amount;
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(token, amount);
    }

    // ── Withdraw ────────────────────────────────────────────────────
    /// @notice Withdraw collateral (only if no outstanding debt for that token).
    function withdraw(address token, uint256 amount) external onlyOwner notDefaulted nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (collateral[token] < amount) revert InsufficientCollateral();
        collateral[token] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit Withdrawn(token, amount);
    }

    // ── Borrow (ZK-gated) ──────────────────────────────────────────
    /// @notice Borrow against collateral. Requires a valid Groth16 proof
    ///         proving the vault's total value ≥ borrow threshold.
    /// @dev The proof hash is recorded to prevent replay attacks.
    function borrow(
        address token,
        uint256 amount,
        uint256[2] calldata pA,
        uint256[2][2] calldata pB,
        uint256[2] calldata pC,
        uint256[] calldata pubSignals
    ) external onlyOwner notDefaulted nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (collateral[token] < debt[token] + amount) revert InsufficientCollateral();

        // Hash the proof for replay prevention
        bytes32 proofHash = keccak256(abi.encodePacked(pA, pB, pC, pubSignals));
        if (zkVerifier.isProofUsed(proofHash)) revert ProofAlreadyUsed();

        // Verify the ZK proof
        if (!zkVerifier.verifyProof(pA, pB, pC, pubSignals)) revert InvalidProof();

        // Mark proof as used and increment nonce (replay + nonce prevention)
        uint256 currentNonce = zkVerifier.vaultNonce(address(this));
        zkVerifier.markProofUsed(proofHash, currentNonce);

        debt[token] += amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit Borrowed(token, amount, proofHash);
    }

    // ── Repay ───────────────────────────────────────────────────────
    /// @notice Repay outstanding debt. Anyone can repay on behalf of the vault.
    function repay(address token, uint256 amount) external notDefaulted nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (debt[token] < amount) revert InsufficientDebt();
        debt[token] -= amount;
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit Repaid(token, amount);
    }

    // ── Default ─────────────────────────────────────────────────────
    /// @notice Trigger default on the vault. Can be called by anyone if
    ///         conditions are met (e.g., oracle-driven health check).
    ///         For MVP, any non-owner can trigger default when debt > 0.
    function triggerDefault(address token) external notDefaulted {
        if (debt[token] == 0) revert InsufficientDebt();
        isDefaulted = true;
        emit DefaultTriggered(msg.sender, debt[token]);
    }

    // ── Seize (partial only) ────────────────────────────────────────
    /// @notice Seize collateral after default.
    ///         seizeAmount = min(debt * 1.05, collateral * 0.5)
    ///         This enforces the partial-seizure invariant — at most 50%
    ///         of any single collateral token can be seized, even if debt
    ///         exceeds that amount.
    function seize(address token) external nonReentrant {
        if (!isDefaulted) revert VaultNotDefaulted();

        uint256 col = collateral[token];
        uint256 dbt = debt[token];
        if (col == 0 || dbt == 0) revert ZeroAmount();

        // Partial seizure math: seize = min(debt * 1.05, collateral * 0.5, actualBalance)
        uint256 penaltyAmount = (dbt * SEIZURE_PENALTY) / WAD;
        uint256 maxSeizable = (col * MAX_SEIZURE_RATIO) / WAD;
        uint256 seizeAmount = penaltyAmount < maxSeizable ? penaltyAmount : maxSeizable;

        // Cap at actual token balance (collateral accounting != balance after borrows)
        uint256 actualBalance = IERC20(token).balanceOf(address(this));
        if (seizeAmount > actualBalance) seizeAmount = actualBalance;

        collateral[token] -= seizeAmount;
        // Reduce debt by the pre-penalty debt amount (capped proportionally)
        uint256 debtReduction = penaltyAmount <= maxSeizable ? dbt : (seizeAmount * WAD) / SEIZURE_PENALTY;
        debt[token] -= debtReduction;

        IERC20(token).safeTransfer(msg.sender, seizeAmount);
        emit Seized(token, seizeAmount);
    }

    // ── View helpers ────────────────────────────────────────────────
    /// @notice Return the deposited collateral balance for a given token.
    function getCollateral(address token) external view returns (uint256) {
        return collateral[token];
    }

    /// @notice Return the outstanding debt balance for a given token.
    function getDebt(address token) external view returns (uint256) {
        return debt[token];
    }
}
