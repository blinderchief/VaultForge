// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AgentRegistry — Register AI agents, execute actions, claim fees, slash
/// @notice Part of the BNB AI Framework integration. Agents stake to register,
///         can execute actions on vaults, earn fees, and get slashed for misbehavior.
contract AgentRegistry is Ownable, ReentrancyGuard {
    // ── Types ───────────────────────────────────────────────────────
    struct Agent {
        address owner;
        uint256 stake;
        uint256 earnedFees;
        bool active;
    }

    // ── State ───────────────────────────────────────────────────────
    uint256 public constant MIN_STAKE = 0.01 ether;

    mapping(address => Agent) public agents;
    address[] public agentList;

    // ── Events ──────────────────────────────────────────────────────
    event AgentRegistered(address indexed agent, address indexed agentOwner, uint256 stake);
    event AgentRemoved(address indexed agent);
    event ActionExecuted(address indexed agent, address indexed vault, bytes4 selector);
    event FeeClaimed(address indexed agent, uint256 amount);
    event AgentSlashed(address indexed agent, uint256 amount);

    // ── Errors ──────────────────────────────────────────────────────
    error AgentAlreadyRegistered();
    error AgentNotRegistered();
    error AgentNotActive();
    error InsufficientStake();
    error NotAgentOwner();
    error TransferFailed();
    error ZeroAmount();
    error NoFeesToClaim();
    error CallFailed();

    // ── Constructor ─────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ── Register ────────────────────────────────────────────────────
    /// @notice Register a new agent by staking native token (tBNB/BNB).
    ///         msg.sender becomes the agent owner, `agent` is the executor address.
    function registerAgent(address agent) external payable {
        if (agents[agent].active) revert AgentAlreadyRegistered();
        if (msg.value < MIN_STAKE) revert InsufficientStake();

        agents[agent] = Agent({
            owner: msg.sender,
            stake: msg.value,
            earnedFees: 0,
            active: true
        });
        agentList.push(agent);

        emit AgentRegistered(agent, msg.sender, msg.value);
    }

    // ── Remove ──────────────────────────────────────────────────────
    /// @notice Deregister an agent and return its stake. Only the agent owner can call.
    function removeAgent(address agent) external nonReentrant {
        Agent storage a = agents[agent];
        if (!a.active) revert AgentNotRegistered();
        if (a.owner != msg.sender) revert NotAgentOwner();

        uint256 stakeReturn = a.stake;
        a.active = false;
        a.stake = 0;

        (bool ok, ) = msg.sender.call{value: stakeReturn}("");
        if (!ok) revert TransferFailed();

        emit AgentRemoved(agent);
    }

    // ── Execute ─────────────────────────────────────────────────────
    /// @notice Execute an action on a vault. Only active agents can call.
    ///         The agent calls this, which forwards the call to the vault.
    function executeAction(address vault, bytes calldata data) external nonReentrant {
        Agent storage a = agents[msg.sender];
        if (!a.active) revert AgentNotActive();

        (bool ok, ) = vault.call(data);
        if (!ok) revert CallFailed();

        // Credit a small fee (0.001 ether per action, paid from contract balance)
        a.earnedFees += 0.001 ether;

        emit ActionExecuted(msg.sender, vault, bytes4(data[:4]));
    }

    // ── Claim fees ──────────────────────────────────────────────────
    /// @notice Claim accumulated fees. Only the agent owner can claim.
    function claimFee(address agent) external nonReentrant {
        Agent storage a = agents[agent];
        if (!a.active) revert AgentNotRegistered();
        if (a.owner != msg.sender) revert NotAgentOwner();
        if (a.earnedFees == 0) revert NoFeesToClaim();

        uint256 fees = a.earnedFees;
        a.earnedFees = 0;

        (bool ok, ) = msg.sender.call{value: fees}("");
        if (!ok) revert TransferFailed();

        emit FeeClaimed(agent, fees);
    }

    // ── Slash ───────────────────────────────────────────────────────
    /// @notice Slash an agent's stake. Only contract owner (admin) can slash.
    function slash(address agent, uint256 amount) external onlyOwner {
        Agent storage a = agents[agent];
        if (!a.active) revert AgentNotRegistered();
        if (amount == 0) revert ZeroAmount();
        if (amount > a.stake) amount = a.stake;

        a.stake -= amount;

        // Slashed amount stays in contract (protocol treasury)
        emit AgentSlashed(agent, amount);
    }

    // ── Views ───────────────────────────────────────────────────────
    function isAgent(address agent) external view returns (bool) {
        return agents[agent].active;
    }

    function agentOwner(address agent) external view returns (address) {
        return agents[agent].owner;
    }

    function totalAgents() external view returns (uint256) {
        return agentList.length;
    }

    /// @notice Allow contract to receive native token for fee pool.
    receive() external payable {}
}
