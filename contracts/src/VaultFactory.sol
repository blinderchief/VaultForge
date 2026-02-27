// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Vault} from "./Vault.sol";

/// @title VaultFactory — Deploys per-user Vault clones via EIP-1167 minimal proxy
contract VaultFactory is Ownable, ReentrancyGuard {
    using Clones for address;

    // ── State ───────────────────────────────────────────────────────
    address public immutable vaultImplementation;
    address public zkVerifier;

    /// @dev owner → their vault address (one vault per user)
    mapping(address => address) public userVaults;
    address[] public allVaults;

    // ── Events ──────────────────────────────────────────────────────
    event VaultDeployed(address indexed owner, address indexed vault);
    event ZKVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    // ── Errors ──────────────────────────────────────────────────────
    error VaultAlreadyExists();
    error ZeroAddress();

    // ── Constructor ─────────────────────────────────────────────────
    constructor(address _zkVerifier) Ownable(msg.sender) {
        if (_zkVerifier == address(0)) revert ZeroAddress();
        vaultImplementation = address(new Vault());
        zkVerifier = _zkVerifier;
    }

    // ── Deploy a new vault for a user ───────────────────────────────
    /// @notice Deploy a minimal-proxy Vault for `vaultOwner`.
    ///         Each address can only have one vault.
    function deployVault(address vaultOwner) external nonReentrant returns (address vault) {
        if (vaultOwner == address(0)) revert ZeroAddress();
        if (userVaults[vaultOwner] != address(0)) revert VaultAlreadyExists();

        // Deploy EIP-1167 minimal proxy
        vault = vaultImplementation.clone();
        Vault(vault).initialize(vaultOwner, zkVerifier);

        userVaults[vaultOwner] = vault;
        allVaults.push(vault);

        emit VaultDeployed(vaultOwner, vault);
    }

    // ── Admin ───────────────────────────────────────────────────────
    /// @notice Update the ZK verifier (only affects future vaults).
    function setZKVerifier(address _zkVerifier) external onlyOwner {
        if (_zkVerifier == address(0)) revert ZeroAddress();
        address old = zkVerifier;
        zkVerifier = _zkVerifier;
        emit ZKVerifierUpdated(old, _zkVerifier);
    }

    // ── Views ───────────────────────────────────────────────────────
    function getVault(address user) external view returns (address) {
        return userVaults[user];
    }

    function totalVaults() external view returns (uint256) {
        return allVaults.length;
    }
}
