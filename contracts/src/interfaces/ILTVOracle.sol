// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ILTVOracle {
    event OptimizationSubmitted(bytes32 indexed id, address indexed submitter, uint256 ltv);
    event OptimizationChallenged(bytes32 indexed id, address indexed challenger);
    event OptimizationFinalized(bytes32 indexed id, uint256 ltv);

    function submitOptimization(address vault, uint256 ltv, bytes calldata proof) external;
    function challengeOptimization(bytes32 id, bytes calldata counterProof) external;
    function getOptimalLTV(address vault) external view returns (uint256);
}
