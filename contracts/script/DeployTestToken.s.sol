// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";

/// @notice Deploy a test USDC token on opBNB testnet for E2E testing.
contract DeployTestToken is Script {
    function run() external {
        vm.startBroadcast();

        MockERC20 token = new MockERC20("Test USDC", "tUSDC", 18);
        console.log("TestUSDC deployed:", address(token));

        // Mint 10,000 tUSDC to the deployer
        token.mint(msg.sender, 10_000 ether);
        console.log("Minted 10,000 tUSDC to deployer:", msg.sender);

        vm.stopBroadcast();
    }
}
