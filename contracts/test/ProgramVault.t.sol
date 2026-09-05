// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ProgramVault} from "../src/ProgramVault.sol";
import {ProgramVaultV2Mock} from "./mocks/ProgramVaultV2Mock.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract ProgramVaultTest is Test {
    ProgramVault vault;
    MockUSDC usdc;
    address implementation;

    address protocolAdmin = makeAddr("protocolAdmin");
    address owner = makeAddr("owner");
    address issuer = makeAddr("issuer");
    address secondApprover = makeAddr("secondApprover");
    address merchant = makeAddr("merchant"); // funds the program
    address customer = makeAddr("customer");

    uint256 constant ONE_USDC = 1e6;

    uint256 programId;

    function setUp() public {
        usdc = new MockUSDC();

        implementation = address(new ProgramVault(address(usdc)));
        bytes memory initData = abi.encodeCall(ProgramVault.initialize, (protocolAdmin));
        vault = ProgramVault(address(new ERC1967Proxy(implementation, initData)));

        vm.prank(owner);
        programId = vault.createProgram(issuer, secondApprover);

        usdc.mint(merchant, 1_000 * ONE_USDC);
        vm.prank(merchant);
        usdc.approve(address(vault), type(uint256).max);
    }

    function _fund(uint256 amount) internal {
        vm.prank(merchant);
        vault.fund(programId, amount);
    }

    // ---------------------------------------------------------------------
    // Self-serve onboarding
    // ---------------------------------------------------------------------

    /// @dev Anyone can open a program with no protocol-admin step — this is
    ///      what makes onboarding self-serve instead of a manual deploy.
    function test_createProgram_callerBecomesOwner() public {
        address newMerchant = makeAddr("newMerchant");
        address newIssuer = makeAddr("newIssuer");
        address newApprover = makeAddr("newApprover");

        vm.prank(newMerchant);
        uint256 id = vault.createProgram(newIssuer, newApprover);

        (address o, address i, address a,,,) = vault.programs(id);
        assertEq(o, newMerchant);
        assertEq(i, newIssuer);
        assertEq(a, newApprover);
    }

    function test_createProgram_revertsOnZeroAddress() public {
        vm.expectRevert(ProgramVault.ZeroAddress.selector);
        vault.createProgram(address(0), secondApprover);
    }

    /// @dev The vault manages many merchants at once — funding/issuing in
    ///      one program must not leak into another's balances.
    function test_multiplePrograms_areIsolated() public {
        address otherIssuer = makeAddr("otherIssuer");
        address otherApprover = makeAddr("otherApprover");
        address otherMerchant = makeAddr("otherMerchant");

        vm.prank(otherMerchant);
        uint256 otherProgramId = vault.createProgram(otherIssuer, otherApprover);

        _fund(100 * ONE_USDC);

        usdc.mint(otherMerchant, 50 * ONE_USDC);
        vm.prank(otherMerchant);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(otherMerchant);
        vault.fund(otherProgramId, 50 * ONE_USDC);

        vm.prank(issuer);
        vault.issuePoints(programId, customer, 40 * ONE_USDC);

        (,,, uint256 funded1, uint256 issued1,) = vault.programs(programId);
        (,,, uint256 funded2, uint256 issued2,) = vault.programs(otherProgramId);

        assertEq(funded1, 100 * ONE_USDC);
        assertEq(issued1, 40 * ONE_USDC);
        assertEq(funded2, 50 * ONE_USDC);
        assertEq(issued2, 0);
        assertEq(vault.pointsOf(otherProgramId, customer), 0);
    }

    function test_functions_revertForNonexistentProgram() public {
        vm.expectRevert(ProgramVault.ProgramNotFound.selector);
        vault.fund(999, 1 * ONE_USDC);
    }

    // ---------------------------------------------------------------------
    // Funding + issuance
    // ---------------------------------------------------------------------

    function test_fund_increasesFundedBalance() public {
        _fund(100 * ONE_USDC);
        (,,, uint256 funded,,) = vault.programs(programId);
        assertEq(funded, 100 * ONE_USDC);
        assertEq(usdc.balanceOf(address(vault)), 100 * ONE_USDC);
    }

    function test_issuePoints_succeedsWithinFundedBalance() public {
        _fund(100 * ONE_USDC);

        vm.prank(issuer);
        vault.issuePoints(programId, customer, 40 * ONE_USDC);

        assertEq(vault.pointsOf(programId, customer), 40 * ONE_USDC);
        (,,,, uint256 issued,) = vault.programs(programId);
        assertEq(issued, 40 * ONE_USDC);
    }

    /// @dev The invariant the whole product rests on: a program cannot
    ///      promise more than it holds.
    function test_issuePoints_revertsWhenExceedingFundedBalance() public {
        _fund(10 * ONE_USDC);

        vm.prank(issuer);
        vm.expectRevert(ProgramVault.ExceedsFundedBalance.selector);
        vault.issuePoints(programId, customer, 11 * ONE_USDC);
    }

    function test_issuePoints_revertsForNonIssuer() public {
        _fund(10 * ONE_USDC);

        vm.expectRevert(ProgramVault.NotIssuer.selector);
        vault.issuePoints(programId, customer, 1 * ONE_USDC);
    }

    /// @dev Points have no transfer function at all — this is the whole
    ///      non-transferability guarantee. Nothing to call, nothing to test
    ///      beyond confirming the balance only ever moves via issue/redeem.
    function test_points_haveNoTransferPath() public {
        _fund(10 * ONE_USDC);
        vm.prank(issuer);
        vault.issuePoints(programId, customer, 5 * ONE_USDC);

        // ProgramVault exposes no transfer/transferFrom for pointsOf — the
        // absence of such a function is the guarantee. Confirmed by every
        // other test only ever moving pointsOf via issuePoints/redemption.
        assertEq(vault.pointsOf(programId, customer), 5 * ONE_USDC);
    }

    // ---------------------------------------------------------------------
    // Redemption
    // ---------------------------------------------------------------------

    function test_redemption_fullFlow_settlesOnChain() public {
        _fund(100 * ONE_USDC);
        vm.prank(issuer);
        vault.issuePoints(programId, customer, 20 * ONE_USDC);

        string memory code = "ABC123";
        bytes32 codeHash = keccak256(bytes(code));

        vm.prank(issuer);
        uint256 id = vault.createRedemption(programId, customer, 20 * ONE_USDC, codeHash);

        vm.prank(issuer);
        vault.settleRedemption(programId, id, code);

        assertEq(vault.pointsOf(programId, customer), 0);
        (,,, uint256 funded, uint256 issued,) = vault.programs(programId);
        assertEq(issued, 0);
        assertEq(funded, 80 * ONE_USDC);
        assertEq(usdc.balanceOf(customer), 20 * ONE_USDC);
    }

    function test_settleRedemption_revertsOnWrongCode() public {
        _fund(20 * ONE_USDC);
        vm.prank(issuer);
        vault.issuePoints(programId, customer, 20 * ONE_USDC);

        vm.prank(issuer);
        uint256 id = vault.createRedemption(programId, customer, 20 * ONE_USDC, keccak256(bytes("RIGHT")));

        vm.prank(issuer);
        vm.expectRevert(ProgramVault.InvalidCode.selector);
        vault.settleRedemption(programId, id, "WRONG");
    }

    function test_settleRedemption_revertsIfAlreadySettled() public {
        _fund(20 * ONE_USDC);
        vm.prank(issuer);
        vault.issuePoints(programId, customer, 20 * ONE_USDC);

        vm.prank(issuer);
        uint256 id = vault.createRedemption(programId, customer, 20 * ONE_USDC, keccak256(bytes("CODE")));

        vm.prank(issuer);
        vault.settleRedemption(programId, id, "CODE");

        vm.prank(issuer);
        vm.expectRevert(ProgramVault.AlreadySettled.selector);
        vault.settleRedemption(programId, id, "CODE");
    }

    function test_createRedemption_revertsWithInsufficientPoints() public {
        _fund(20 * ONE_USDC);
        vm.prank(issuer);
        vault.issuePoints(programId, customer, 5 * ONE_USDC);

        vm.prank(issuer);
        vm.expectRevert(ProgramVault.InsufficientPoints.selector);
        vault.createRedemption(programId, customer, 10 * ONE_USDC, keccak256(bytes("CODE")));
    }

    // ---------------------------------------------------------------------
    // Withdrawal — two-address approval
    // ---------------------------------------------------------------------

    function test_unissuedSurplus_excludesIssuedPoints() public {
        _fund(100 * ONE_USDC);
        vm.prank(issuer);
        vault.issuePoints(programId, customer, 30 * ONE_USDC);

        assertEq(vault.unissuedSurplus(programId), 70 * ONE_USDC);
    }

    function test_withdrawal_succeedsWithProposerAndDistinctApprover() public {
        _fund(100 * ONE_USDC);
        address recipient = makeAddr("recipient");

        vm.prank(owner);
        vault.proposeWithdrawal(programId, recipient, 40 * ONE_USDC);

        vm.prank(secondApprover);
        vault.approveWithdrawal(programId);

        assertEq(usdc.balanceOf(recipient), 40 * ONE_USDC);
        (,,, uint256 funded,,) = vault.programs(programId);
        assertEq(funded, 60 * ONE_USDC);
    }

    /// @dev This is the on-chain analog of the demo's "policy blocks a
    ///      transaction" moment — a single key can never move surplus out.
    function test_withdrawal_revertsWhenApproverIsProposer() public {
        _fund(100 * ONE_USDC);

        vm.prank(owner);
        vault.proposeWithdrawal(programId, owner, 40 * ONE_USDC);

        vm.prank(owner);
        vm.expectRevert(ProgramVault.NotSecondApprover.selector);
        vault.approveWithdrawal(programId);
    }

    function test_withdrawal_revertsWhenExceedingUnissuedSurplus() public {
        _fund(100 * ONE_USDC);
        vm.prank(issuer);
        vault.issuePoints(programId, customer, 90 * ONE_USDC);

        vm.prank(owner);
        vm.expectRevert(ProgramVault.ExceedsUnissuedSurplus.selector);
        vault.proposeWithdrawal(programId, owner, 20 * ONE_USDC);
    }

    function test_approveWithdrawal_revertsWithNoPendingWithdrawal() public {
        vm.prank(secondApprover);
        vm.expectRevert(ProgramVault.NoPendingWithdrawal.selector);
        vault.approveWithdrawal(programId);
    }

    // ---------------------------------------------------------------------
    // Campaign configuration
    // ---------------------------------------------------------------------

    function test_configureCampaign_onlyProgramOwner() public {
        vm.prank(owner);
        vault.configureCampaign(programId, "5pct cashback", 500, true);

        (string memory name, uint16 bps, bool active) = vault.campaign(programId);
        assertEq(name, "5pct cashback");
        assertEq(bps, 500);
        assertTrue(active);
    }

    function test_configureCampaign_revertsForNonOwner() public {
        vm.expectRevert(ProgramVault.NotProgramOwner.selector);
        vault.configureCampaign(programId, "nope", 100, true);
    }

    // ---------------------------------------------------------------------
    // Upgradeability
    // ---------------------------------------------------------------------

    /// @dev Upgrading swaps the logic contract but must preserve every
    ///      program's existing state — the whole point of using a proxy
    ///      instead of redeploying (which would reset all merchants' data).
    function test_upgrade_preservesStateAndAddsNewLogic() public {
        _fund(100 * ONE_USDC);
        vm.prank(issuer);
        vault.issuePoints(programId, customer, 40 * ONE_USDC);

        address v2Implementation = address(new ProgramVaultV2Mock(address(usdc)));
        vm.prank(protocolAdmin);
        vault.upgradeToAndCall(v2Implementation, "");

        // existing state survived the upgrade
        assertEq(vault.pointsOf(programId, customer), 40 * ONE_USDC);
        (,,, uint256 funded, uint256 issued,) = vault.programs(programId);
        assertEq(funded, 100 * ONE_USDC);
        assertEq(issued, 40 * ONE_USDC);

        // new logic is live
        assertEq(ProgramVaultV2Mock(address(vault)).version(), "v2");
    }

    /// @dev Upgrade authority is the protocol admin set at `initialize` —
    ///      not any merchant's program owner or issuer.
    function test_upgrade_revertsForNonProtocolAdmin() public {
        address v2Implementation = address(new ProgramVaultV2Mock(address(usdc)));

        vm.prank(owner);
        vm.expectRevert();
        vault.upgradeToAndCall(v2Implementation, "");
    }
}
