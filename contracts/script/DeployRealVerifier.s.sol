// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ZKVerifier} from "../src/ZKVerifier.sol";
import {VaultFactory} from "../src/VaultFactory.sol";

/// @notice Deploy the real Groth16 ZKVerifier and update VaultFactory.
contract DeployRealVerifier is Script {
    function run() external {
        address vaultFactory = vm.envAddress("VAULT_FACTORY_ADDRESS");

        vm.startBroadcast();

        // 1. Deploy real ZKVerifier with Groth16 pairing verification
        ZKVerifier realVerifier = new ZKVerifier();
        console.log("Real ZKVerifier deployed at:", address(realVerifier));

        // 2. Update VaultFactory to use the new verifier for future vaults
        VaultFactory(vaultFactory).setZKVerifier(address(realVerifier));
        console.log("VaultFactory updated to use real verifier");

        vm.stopBroadcast();
    }
}
