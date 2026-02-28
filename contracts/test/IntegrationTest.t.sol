// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vault} from "../src/Vault.sol";
import {VaultFactory} from "../src/VaultFactory.sol";
import {ZKVerifier} from "../src/ZKVerifier.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {LTVOracle} from "../src/LTVOracle.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/// @title IntegrationTest — End-to-end flow:
///        wallet → VaultFactory tx → deposit → ZK borrow → repay → agent action
contract IntegrationTest is Test {
    VaultFactory public factory;
    ZKVerifier public verifier;
    AgentRegistry public registry;
    LTVOracle public oracle;
    MockERC20 public usdc;

    address public deployer = makeAddr("deployer");
    address public user = makeAddr("user");
    address public agentWallet = makeAddr("agentWallet");

    uint256[2] pA = [
        uint256(7501418155070697957886445575060222213855214501275462131512066891886260797522),
        uint256(20307960349622408087724662811457557377081981738727894655014255382300019349183)
    ];
    uint256[2][2] pB = [
        [
            uint256(10090863171021850233060917308111442514293021448090904360733241435633950134456),
            uint256(20514319163820469606716028119004784496615796526046539688792089896488849842644)
        ],
        [
            uint256(20328077676924037459990755442354571662269605852107790438311474812910010595491),
            uint256(282098938794764696965769496268380771436106555603842946113396473292615518483)
        ]
    ];
    uint256[2] pC = [
        uint256(15188614206463563129152732570408292639008973769821094020924759466080418510005),
        uint256(3210483392407363850290683052617417594252216771062307497254862380087632713208)
    ];

    function _pubSignals() internal pure returns (uint256[] memory) {
        uint256[] memory sigs = new uint256[](3);
        sigs[0] = 10701395941502774979696515461883671971228744800004823607239438080880607796877;
        sigs[1] = 1;
        sigs[2] = 100000000000000000000;
        return sigs;
    }

    function setUp() public {
        vm.startPrank(deployer);
        verifier = new ZKVerifier();
        factory = new VaultFactory(address(verifier));
        // Authorize factory to register vault callers
        verifier.authorizeFactory(address(factory));
        registry = new AgentRegistry();
        oracle = new LTVOracle();
        vm.stopPrank();

        usdc = new MockERC20("USDC", "USDC", 18);
        usdc.mint(user, 10_000e18);
        vm.deal(user, 10 ether);
    }

    /// @notice Full lifecycle: deploy vault → deposit → borrow → repay → withdraw
    function test_fullLifecycle() public {
        // ─── Step 1: Deploy vault via factory ───────────────────────
        vm.prank(deployer);
        address vaultAddr = factory.deployVault(user);
        Vault vault = Vault(vaultAddr);

        assertEq(vault.owner(), user);
        assertEq(factory.getVault(user), vaultAddr);
        assertEq(factory.totalVaults(), 1);

        // ─── Step 2: Deposit collateral ─────────────────────────────
        vm.startPrank(user);
        usdc.approve(vaultAddr, 1000e18);
        vault.deposit(address(usdc), 1000e18);

        assertEq(vault.collateral(address(usdc)), 1000e18);
        assertEq(usdc.balanceOf(vaultAddr), 1000e18);

        // ─── Step 3: Borrow with ZK proof ───────────────────────────
        uint256[] memory sigs = _pubSignals();
        vault.borrow(address(usdc), 500e18, pA, pB, pC, sigs);

        assertEq(vault.debt(address(usdc)), 500e18);
        assertEq(usdc.balanceOf(user), 9500e18); // 10000 - 1000 + 500

        // Verify proof was marked used (replay prevention)
        bytes32 proofHash = keccak256(abi.encodePacked(pA, pB, pC, sigs));
        assertTrue(verifier.isProofUsed(proofHash));

        // ─── Step 4: Repay full debt ────────────────────────────────
        usdc.approve(vaultAddr, 500e18);
        vault.repay(address(usdc), 500e18);

        assertEq(vault.debt(address(usdc)), 0);

        // ─── Step 5: Withdraw collateral ────────────────────────────
        vault.withdraw(address(usdc), 1000e18);
        assertEq(vault.collateral(address(usdc)), 0);
        assertEq(usdc.balanceOf(user), 10_000e18); // back to original
        vm.stopPrank();
    }

    /// @notice Factory → Vault + Agent executes action on vault
    function test_factoryAndAgentIntegration() public {
        // Deploy vault
        vm.prank(deployer);
        address vaultAddr = factory.deployVault(user);
        Vault vault = Vault(vaultAddr);

        // User deposits
        vm.startPrank(user);
        usdc.approve(vaultAddr, 500e18);
        vault.deposit(address(usdc), 500e18);
        vm.stopPrank();

        // Register agent
        vm.prank(user);
        registry.registerAgent{value: 0.01 ether}(agentWallet);
        assertTrue(registry.isAgent(agentWallet));

        // Agent cannot call vault directly (not owner) — this is expected
        vm.prank(agentWallet);
        vm.expectRevert(Vault.NotOwner.selector);
        vault.deposit(address(usdc), 0);
    }

    /// @notice LTV Oracle → submit, finalize, verify oracle state
    function test_oracleIntegration() public {
        vm.prank(deployer);
        address vaultAddr = factory.deployVault(user);

        // Submit & finalize optimization
        bytes32 optId = oracle.submitOptimization(vaultAddr, 7500, "proof-data");

        vm.warp(block.timestamp + 1 hours + 1);
        oracle.finalizeOptimization(optId);

        assertEq(oracle.getOptimalLTV(vaultAddr), 7500);
    }

    /// @notice Verify partial seizure after full lifecycle
    function test_defaultAndPartialSeizure() public {
        vm.prank(deployer);
        address vaultAddr = factory.deployVault(user);
        Vault vault = Vault(vaultAddr);

        // User deposits and borrows
        vm.startPrank(user);
        usdc.approve(vaultAddr, 1000e18);
        vault.deposit(address(usdc), 1000e18);
        uint256[] memory sigs = _pubSignals();
        vault.borrow(address(usdc), 400e18, pA, pB, pC, sigs);
        vm.stopPrank();

        // Third party triggers default
        address liquidator = makeAddr("liquidator");
        vm.prank(liquidator);
        vault.triggerDefault(address(usdc));
        assertTrue(vault.isDefaulted());

        // Seize — partial: min(400*1.05=420, 1000*0.5=500) = 420
        // But actual balance = 600 (1000 deposited - 400 borrowed out)
        uint256 balBefore = usdc.balanceOf(liquidator);
        vm.prank(liquidator);
        vault.seize(address(usdc));
        uint256 seized = usdc.balanceOf(liquidator) - balBefore;
        assertEq(seized, 420e18);

        // Debt fully cleared, collateral reduced
        assertEq(vault.debt(address(usdc)), 0);
        assertEq(vault.collateral(address(usdc)), 580e18); // 1000 - 420
    }

    /// @notice ZK proof replay across same vault is blocked
    function test_zkReplayBlocked() public {
        vm.prank(deployer);
        address vaultAddr = factory.deployVault(user);
        Vault vault = Vault(vaultAddr);

        vm.startPrank(user);
        usdc.approve(vaultAddr, 2000e18);
        vault.deposit(address(usdc), 2000e18);

        uint256[] memory sigs = _pubSignals();
        vault.borrow(address(usdc), 100e18, pA, pB, pC, sigs);

        // Same proof → reverted
        vm.expectRevert(Vault.ProofAlreadyUsed.selector);
        vault.borrow(address(usdc), 100e18, pA, pB, pC, sigs);
        vm.stopPrank();
    }
}
