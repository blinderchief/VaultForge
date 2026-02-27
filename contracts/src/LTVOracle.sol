// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title LTVOracle — On-chain optimistic LTV optimization oracle
/// @notice Off-chain optimizer submits optimal LTV values with proof.
///         Anyone can challenge within a dispute window. After finalization
///         the LTV is used by vaults for borrow/risk calculations.
contract LTVOracle is Ownable, ReentrancyGuard {
    // ── Types ───────────────────────────────────────────────────────
    struct Optimization {
        address submitter;
        address vault;
        uint256 ltv;          // LTV in basis points (e.g., 7500 = 75%)
        bytes proof;          // Off-chain optimization proof (opaque bytes)
        uint256 submittedAt;
        bool challenged;
        bool finalized;
    }

    // ── Constants ───────────────────────────────────────────────────
    /// @dev Challenge window: 1 hour for testnet (would be longer in prod)
    uint256 public constant CHALLENGE_WINDOW = 1 hours;
    /// @dev Max LTV in basis points (90%)
    uint256 public constant MAX_LTV_BPS = 9000;
    /// @dev Min LTV in basis points (10%)
    uint256 public constant MIN_LTV_BPS = 1000;

    // ── State ───────────────────────────────────────────────────────
    /// @dev optimizationId → Optimization
    mapping(bytes32 => Optimization) public optimizations;
    /// @dev vault → latest finalized LTV (basis points)
    mapping(address => uint256) public optimalLTV;
    /// @dev vault → latest optimization id
    mapping(address => bytes32) public latestOptimization;

    uint256 public optimizationCount;

    // ── Events ──────────────────────────────────────────────────────
    event OptimizationSubmitted(bytes32 indexed id, address indexed submitter, address indexed vault, uint256 ltv);
    event OptimizationChallenged(bytes32 indexed id, address indexed challenger);
    event OptimizationFinalized(bytes32 indexed id, uint256 ltv);

    // ── Errors ──────────────────────────────────────────────────────
    error InvalidLTV();
    error AlreadyChallenged();
    error AlreadyFinalized();
    error ChallengeWindowActive();
    error ChallengeWindowExpired();
    error OptimizationNotFound();
    error ZeroAddress();

    // ── Constructor ─────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ── Submit ──────────────────────────────────────────────────────
    /// @notice Submit an optimized LTV value for a vault with proof.
    function submitOptimization(
        address vault,
        uint256 ltv,
        bytes calldata proof
    ) external returns (bytes32 id) {
        if (vault == address(0)) revert ZeroAddress();
        if (ltv < MIN_LTV_BPS || ltv > MAX_LTV_BPS) revert InvalidLTV();

        id = keccak256(abi.encodePacked(vault, ltv, block.timestamp, optimizationCount));
        optimizationCount++;

        optimizations[id] = Optimization({
            submitter: msg.sender,
            vault: vault,
            ltv: ltv,
            proof: proof,
            submittedAt: block.timestamp,
            challenged: false,
            finalized: false
        });

        latestOptimization[vault] = id;
        emit OptimizationSubmitted(id, msg.sender, vault, ltv);
    }

    // ── Challenge ───────────────────────────────────────────────────
    /// @notice Challenge an optimization within the challenge window.
    ///         Challenged optimizations cannot be finalized.
    function challengeOptimization(bytes32 id, bytes calldata /* counterProof */) external {
        Optimization storage opt = optimizations[id];
        if (opt.submitter == address(0)) revert OptimizationNotFound();
        if (opt.finalized) revert AlreadyFinalized();
        if (opt.challenged) revert AlreadyChallenged();
        if (block.timestamp > opt.submittedAt + CHALLENGE_WINDOW) revert ChallengeWindowExpired();

        opt.challenged = true;
        emit OptimizationChallenged(id, msg.sender);
    }

    // ── Finalize ────────────────────────────────────────────────────
    /// @notice Finalize an unchallenged optimization after the challenge window.
    function finalizeOptimization(bytes32 id) external nonReentrant {
        Optimization storage opt = optimizations[id];
        if (opt.submitter == address(0)) revert OptimizationNotFound();
        if (opt.finalized) revert AlreadyFinalized();
        if (opt.challenged) revert AlreadyChallenged();
        if (block.timestamp < opt.submittedAt + CHALLENGE_WINDOW) revert ChallengeWindowActive();

        opt.finalized = true;
        optimalLTV[opt.vault] = opt.ltv;

        emit OptimizationFinalized(id, opt.ltv);
    }

    // ── Views ───────────────────────────────────────────────────────
    /// @notice Get the current optimal LTV for a vault (basis points).
    function getOptimalLTV(address vault) external view returns (uint256) {
        return optimalLTV[vault];
    }
}
