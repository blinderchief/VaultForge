// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ZKVerifier} from "../src/ZKVerifier.sol";
import {VaultFactory} from "../src/VaultFactory.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {LTVOracle} from "../src/LTVOracle.sol";

/// @notice Deploy all VaultForge core contracts to opBNB testnet.
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        // 1. ZKVerifier (no dependencies)
        ZKVerifier zkVerifier = new ZKVerifier();
        console.log("ZKVerifier:", address(zkVerifier));

        // 2. VaultFactory (needs ZKVerifier address; deploys Vault implementation internally)
        VaultFactory factory = new VaultFactory(address(zkVerifier));
        console.log("VaultFactory:", address(factory));
        console.log("VaultImpl:", factory.vaultImplementation());

        // 3. AgentRegistry (no dependencies)
        AgentRegistry agentRegistry = new AgentRegistry();
        console.log("AgentRegistry:", address(agentRegistry));

        // 4. LTVOracle (no dependencies)
        LTVOracle ltvOracle = new LTVOracle();
        console.log("LTVOracle:", address(ltvOracle));

        vm.stopBroadcast();
    }
}
