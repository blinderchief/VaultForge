// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vault} from "../src/Vault.sol";
import {VaultFactory} from "../src/VaultFactory.sol";
import {ZKVerifier} from "../src/ZKVerifier.sol";
import {LTVOracle} from "../src/LTVOracle.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract VaultTest is Test {
    // ── Contracts ───────────────────────────────────────────────────
    VaultFactory public factory;
    ZKVerifier public verifier;
    Vault public vault;
    MockERC20 public token;

    // ── Actors ──────────────────────────────────────────────────────
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public admin = makeAddr("admin");

    // ── Real Groth16 proof from snarkjs (CollateralThreshold circuit) ──
    // Proof from zk-circuits/build/CollateralThreshold/proof.json
    // B-point coordinates swapped per snarkjs → Solidity convention
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

    // Public signals from zk-circuits/build/CollateralThreshold/public.json
    // [commitment, sufficient, threshold]
    function _pubSignals() internal pure returns (uint256[] memory) {
        uint256[] memory sigs = new uint256[](3);
        sigs[0] = 10701395941502774979696515461883671971228744800004823607239438080880607796877; // commitment
        sigs[1] = 1; // sufficient
        sigs[2] = 100000000000000000000; // threshold (100e18)
        return sigs;
    }

    // ── Setup ───────────────────────────────────────────────────────
    function setUp() public {
        vm.startPrank(admin);

        // Deploy verifier and factory
        verifier = new ZKVerifier();
        factory = new VaultFactory(address(verifier));

        // Authorize factory to register vault callers
        verifier.authorizeFactory(address(factory));

        // Deploy Alice's vault via factory
        address vaultAddr = factory.deployVault(alice);
        vault = Vault(vaultAddr);

        vm.stopPrank();

        // Deploy mock token and fund Alice
        token = new MockERC20("Mock USDC", "mUSDC", 18);
        token.mint(alice, 1000e18);
        token.mint(bob, 1000e18);
    }

    // ════════════════════════════════════════════════════════════════
    //  DEPOSIT TESTS
    // ════════════════════════════════════════════════════════════════

    function test_deposit() public {
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(address(token), 100e18);
        vm.stopPrank();

        assertEq(vault.collateral(address(token)), 100e18);
        assertEq(token.balanceOf(address(vault)), 100e18);
    }

    function test_deposit_revert_notOwner() public {
        vm.startPrank(bob);
        token.approve(address(vault), 100e18);
        vm.expectRevert(Vault.NotOwner.selector);
        vault.deposit(address(token), 100e18);
        vm.stopPrank();
    }

    function test_deposit_revert_zeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(Vault.ZeroAmount.selector);
        vault.deposit(address(token), 0);
    }

    // ════════════════════════════════════════════════════════════════
    //  WITHDRAW TESTS
    // ════════════════════════════════════════════════════════════════

    function test_withdraw() public {
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(address(token), 100e18);
        vault.withdraw(address(token), 40e18);
        vm.stopPrank();

        assertEq(vault.collateral(address(token)), 60e18);
        assertEq(token.balanceOf(alice), 940e18);
    }

    function test_withdraw_revert_insufficientCollateral() public {
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(address(token), 100e18);
        vm.expectRevert(Vault.InsufficientCollateral.selector);
        vault.withdraw(address(token), 200e18);
        vm.stopPrank();
    }

    // ════════════════════════════════════════════════════════════════
    //  BORROW TESTS (ZK-gated)
    // ════════════════════════════════════════════════════════════════

    function test_borrow() public {
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(address(token), 100e18);

        uint256[] memory sigs = _pubSignals();
        vault.borrow(address(token), 50e18, pA, pB, pC, sigs);
        vm.stopPrank();

        assertEq(vault.debt(address(token)), 50e18);
        assertEq(vault.collateral(address(token)), 100e18); // collateral unchanged
        assertEq(token.balanceOf(alice), 950e18); // 900 + 50 borrowed
    }

    function test_borrow_revert_replayProof() public {
        vm.startPrank(alice);
        token.approve(address(vault), 200e18);
        vault.deposit(address(token), 200e18);

        uint256[] memory sigs = _pubSignals();
        vault.borrow(address(token), 50e18, pA, pB, pC, sigs);

        // Same proof should be rejected
        vm.expectRevert(Vault.ProofAlreadyUsed.selector);
        vault.borrow(address(token), 50e18, pA, pB, pC, sigs);
        vm.stopPrank();
    }

    function test_borrow_revert_insufficientCollateral() public {
        vm.startPrank(alice);
        token.approve(address(vault), 10e18);
        vault.deposit(address(token), 10e18);

        uint256[] memory sigs = _pubSignals();
        vm.expectRevert(Vault.InsufficientCollateral.selector);
        vault.borrow(address(token), 50e18, pA, pB, pC, sigs);
        vm.stopPrank();
    }

    function test_borrow_revert_notOwner() public {
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(address(token), 100e18);
        vm.stopPrank();

        vm.prank(bob);
        uint256[] memory sigs = _pubSignals();
        vm.expectRevert(Vault.NotOwner.selector);
        vault.borrow(address(token), 50e18, pA, pB, pC, sigs);
    }

    // ════════════════════════════════════════════════════════════════
    //  REPAY TESTS
    // ════════════════════════════════════════════════════════════════

    function test_repay() public {
        // Setup: deposit + borrow
        vm.startPrank(alice);
        token.approve(address(vault), 200e18);
        vault.deposit(address(token), 100e18);
        uint256[] memory sigs = _pubSignals();
        vault.borrow(address(token), 50e18, pA, pB, pC, sigs);

        // Repay
        token.approve(address(vault), 50e18);
        vault.repay(address(token), 50e18);
        vm.stopPrank();

        assertEq(vault.debt(address(token)), 0);
    }

    function test_repay_partial() public {
        vm.startPrank(alice);
        token.approve(address(vault), 200e18);
        vault.deposit(address(token), 100e18);
        uint256[] memory sigs = _pubSignals();
        vault.borrow(address(token), 50e18, pA, pB, pC, sigs);

        token.approve(address(vault), 20e18);
        vault.repay(address(token), 20e18);
        vm.stopPrank();

        assertEq(vault.debt(address(token)), 30e18);
    }

    function test_repay_byAnyone() public {
        // Alice deposits and borrows
        vm.startPrank(alice);
        token.approve(address(vault), 200e18);
        vault.deposit(address(token), 100e18);
        uint256[] memory sigs = _pubSignals();
        vault.borrow(address(token), 50e18, pA, pB, pC, sigs);
        vm.stopPrank();

        // Bob repays on behalf
        vm.startPrank(bob);
        token.approve(address(vault), 50e18);
        vault.repay(address(token), 50e18);
        vm.stopPrank();

        assertEq(vault.debt(address(token)), 0);
    }

    function test_repay_revert_insufficientDebt() public {
        vm.startPrank(alice);
        token.approve(address(vault), 200e18);
        vault.deposit(address(token), 100e18);
        uint256[] memory sigs = _pubSignals();
        vault.borrow(address(token), 50e18, pA, pB, pC, sigs);

        token.approve(address(vault), 100e18);
        vm.expectRevert(Vault.InsufficientDebt.selector);
        vault.repay(address(token), 100e18);
        vm.stopPrank();
    }

    // ════════════════════════════════════════════════════════════════
    //  DEFAULT TESTS
    // ════════════════════════════════════════════════════════════════

    function test_triggerDefault() public {
        // Setup: deposit + borrow
        vm.startPrank(alice);
        token.approve(address(vault), 200e18);
        vault.deposit(address(token), 100e18);
        uint256[] memory sigs = _pubSignals();
        vault.borrow(address(token), 50e18, pA, pB, pC, sigs);
        vm.stopPrank();

        // Bob triggers default
        vm.prank(bob);
        vault.triggerDefault(address(token));

        assertTrue(vault.isDefaulted());
    }

    function test_triggerDefault_revert_noDebt() public {
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(address(token), 100e18);
        vm.stopPrank();

        vm.prank(bob);
        vm.expectRevert(Vault.InsufficientDebt.selector);
        vault.triggerDefault(address(token));
    }

    function test_defaulted_blocksDeposit() public {
        // Setup default
        vm.startPrank(alice);
        token.approve(address(vault), 200e18);
        vault.deposit(address(token), 100e18);
        uint256[] memory sigs = _pubSignals();
        vault.borrow(address(token), 50e18, pA, pB, pC, sigs);
        vm.stopPrank();

        vm.prank(bob);
        vault.triggerDefault(address(token));

        // Deposit should be blocked
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vm.expectRevert(Vault.VaultDefaulted.selector);
        vault.deposit(address(token), 100e18);
        vm.stopPrank();
    }

    // ════════════════════════════════════════════════════════════════
    //  PARTIAL SEIZURE TESTS
    //  seize = min(debt * 1.05, collateral * 0.5)
    // ════════════════════════════════════════════════════════════════

    function test_seize_debtSmall_penaltyLessThanHalfCollateral() public {
        // Deposit 100, borrow 20 → debt=20
        // penalty = 20 * 1.05 = 21
        // maxSeize = 100 * 0.5 = 50
        // seize = min(21, 50) = 21
        vm.startPrank(alice);
        token.approve(address(vault), 200e18);
        vault.deposit(address(token), 100e18);
        uint256[] memory sigs = _pubSignals();
        vault.borrow(address(token), 20e18, pA, pB, pC, sigs);
        vm.stopPrank();

        vm.prank(bob);
        vault.triggerDefault(address(token));

        uint256 bobBefore = token.balanceOf(bob);
        vm.prank(bob);
        vault.seize(address(token));

        uint256 seized = token.balanceOf(bob) - bobBefore;
        assertEq(seized, 21e18); // debt * 1.05

        // Collateral reduced by seized amount
        assertEq(vault.collateral(address(token)), 79e18);
        // Debt fully cleared (penalty < maxSeize means full debt reduction)
        assertEq(vault.debt(address(token)), 0);
    }

    function test_seize_debtLarge_cappedAtHalfCollateral() public {
        // Deposit 100, borrow 80 → debt=80, actual vault balance = 20
        // penalty = 80 * 1.05 = 84
        // maxSeize = 100 * 0.5 = 50
        // seize = min(84, 50) = 50  → but actual balance = 20, so capped at 20
        vm.startPrank(alice);
        token.approve(address(vault), 200e18);
        vault.deposit(address(token), 100e18);
        uint256[] memory sigs = _pubSignals();
        vault.borrow(address(token), 80e18, pA, pB, pC, sigs);
        vm.stopPrank();

        vm.prank(bob);
        vault.triggerDefault(address(token));

        uint256 bobBefore = token.balanceOf(bob);
        vm.prank(bob);
        vault.seize(address(token));

        uint256 seized = token.balanceOf(bob) - bobBefore;
        // Capped at actual vault balance: 100 deposited - 80 borrowed out = 20
        assertEq(seized, 20e18);

        // Collateral reduced
        assertEq(vault.collateral(address(token)), 80e18); // 100 - 20

        // Debt reduced proportionally: (20e18 * 1e18) / 1.05e18
        uint256 seizurePenalty = 1.05e18;
        uint256 expectedDebtReduction = (20e18 * 1e18) / seizurePenalty;
        uint256 expectedRemaining = 80e18 - expectedDebtReduction;
        assertEq(vault.debt(address(token)), expectedRemaining);
    }

    function test_seize_revert_notDefaulted() public {
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        vault.deposit(address(token), 100e18);
        vm.stopPrank();

        vm.prank(bob);
        vm.expectRevert(Vault.VaultNotDefaulted.selector);
        vault.seize(address(token));
    }

    // ════════════════════════════════════════════════════════════════
    //  FACTORY TESTS
    // ════════════════════════════════════════════════════════════════

    function test_factory_deployVault() public {
        vm.prank(admin);
        address bobVault = factory.deployVault(bob);

        assertEq(factory.getVault(bob), bobVault);
        assertEq(factory.totalVaults(), 2); // Alice's + Bob's
        assertEq(Vault(bobVault).owner(), bob);
    }

    function test_factory_revert_duplicateVault() public {
        vm.prank(admin);
        vm.expectRevert(VaultFactory.VaultAlreadyExists.selector);
        factory.deployVault(alice); // Alice already has a vault
    }

    // ════════════════════════════════════════════════════════════════
    //  ZK VERIFIER TESTS
    // ════════════════════════════════════════════════════════════════

    function test_verifier_realGroth16_returnsTrue() public view {
        uint256[] memory sigs = _pubSignals();
        bool valid = verifier.verifyProof(pA, pB, pC, sigs);
        assertTrue(valid, "Real Groth16 proof should verify");
    }

    function test_verifier_rejectsInvalidProof() public view {
        uint256[2] memory fakeA = [uint256(1), uint256(2)];
        uint256[] memory sigs = _pubSignals();
        bool valid = verifier.verifyProof(fakeA, pB, pC, sigs);
        assertFalse(valid, "Invalid proof should be rejected");
    }

    function test_verifier_rejectsWrongSignalCount() public view {
        uint256[] memory sigs = new uint256[](1);
        sigs[0] = 42;
        bool valid = verifier.verifyProof(pA, pB, pC, sigs);
        assertFalse(valid, "Wrong signal count should be rejected");
    }

    function test_verifier_replayPrevention() public {
        bytes32 proofHash = keccak256(abi.encodePacked(pA, pB, pC, _pubSignals()));

        // Authorize this test contract
        vm.prank(admin);
        verifier.authorizeCaller(address(this));

        verifier.markProofUsed(proofHash, 0);
        assertTrue(verifier.isProofUsed(proofHash));

        vm.expectRevert(ZKVerifier.ProofAlreadyUsed.selector);
        verifier.markProofUsed(proofHash, 1);
    }

    function test_verifier_unauthorizedCaller() public {
        bytes32 proofHash = keccak256("test");
        vm.prank(bob);
        vm.expectRevert(ZKVerifier.NotAuthorized.selector);
        verifier.markProofUsed(proofHash, 0);
    }

    function test_verifier_invalidNonce() public {
        bytes32 proofHash = keccak256("nonce-test");
        vm.prank(admin);
        verifier.authorizeCaller(address(this));

        // Nonce is 0, pass 1 → should revert
        vm.expectRevert(ZKVerifier.InvalidNonce.selector);
        verifier.markProofUsed(proofHash, 1);
    }

    function test_verifier_nonceIncrements() public {
        vm.prank(admin);
        verifier.authorizeCaller(address(this));

        bytes32 h1 = keccak256("proof1");
        bytes32 h2 = keccak256("proof2");

        assertEq(verifier.vaultNonce(address(this)), 0);
        verifier.markProofUsed(h1, 0);
        assertEq(verifier.vaultNonce(address(this)), 1);
        verifier.markProofUsed(h2, 1);
        assertEq(verifier.vaultNonce(address(this)), 2);
    }

    // ════════════════════════════════════════════════════════════════
    //  LTV ORACLE TESTS
    // ════════════════════════════════════════════════════════════════

    function test_ltvOracle_submitAndFinalize() public {
        LTVOracle oracle = new LTVOracle();
        address vaultAddr = address(vault);

        bytes32 id = oracle.submitOptimization(vaultAddr, 7500, "proof");

        // Warp past challenge window
        vm.warp(block.timestamp + 1 hours + 1);
        oracle.finalizeOptimization(id);

        assertEq(oracle.getOptimalLTV(vaultAddr), 7500);
    }

    function test_ltvOracle_challenge() public {
        LTVOracle oracle = new LTVOracle();
        address vaultAddr = address(vault);

        bytes32 id = oracle.submitOptimization(vaultAddr, 7500, "proof");
        oracle.challengeOptimization(id, "counter");

        // Cannot finalize after challenge
        vm.warp(block.timestamp + 1 hours + 1);
        vm.expectRevert(LTVOracle.AlreadyChallenged.selector);
        oracle.finalizeOptimization(id);
    }

    function test_ltvOracle_revert_invalidLTV() public {
        LTVOracle oracle = new LTVOracle();

        vm.expectRevert(LTVOracle.InvalidLTV.selector);
        oracle.submitOptimization(address(vault), 500, "proof"); // Below MIN_LTV_BPS

        vm.expectRevert(LTVOracle.InvalidLTV.selector);
        oracle.submitOptimization(address(vault), 9500, "proof"); // Above MAX_LTV_BPS
    }

    // ════════════════════════════════════════════════════════════════
    //  AGENT REGISTRY TESTS
    // ════════════════════════════════════════════════════════════════

    function test_agentRegistry_registerAndSlash() public {
        AgentRegistry registry = new AgentRegistry();
        address agent = makeAddr("agent1");

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        registry.registerAgent{value: 0.01 ether}(agent);

        assertTrue(registry.isAgent(agent));
        assertEq(registry.agentOwner(agent), alice);

        // Slash half the stake
        registry.slash(agent, 0.005 ether);
        (,uint256 stake,,) = registry.agents(agent);
        assertEq(stake, 0.005 ether);
    }

    function test_agentRegistry_revert_insufficientStake() public {
        AgentRegistry registry = new AgentRegistry();
        address agent = makeAddr("agent2");

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert(AgentRegistry.InsufficientStake.selector);
        registry.registerAgent{value: 0.001 ether}(agent);
    }
}
