// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IAgentRegistry {
    event AgentRegistered(address indexed agent, address indexed owner);
    event AgentRemoved(address indexed agent);
    event ActionExecuted(address indexed agent, address indexed vault, bytes data);
    event AgentSlashed(address indexed agent, uint256 amount);
    event FeeClaimed(address indexed agent, uint256 amount);

    function registerAgent(address agent) external;
    function removeAgent(address agent) external;
    function executeAction(address vault, bytes calldata data) external;
    function claimFee() external;
    function slash(address agent, uint256 amount) external;
    function isAgent(address agent) external view returns (bool);
    function agentOwner(address agent) external view returns (address);
}
