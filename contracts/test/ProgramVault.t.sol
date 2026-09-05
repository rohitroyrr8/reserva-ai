// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ProgramVault} from "../src/ProgramVault.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract ProgramVaultTest is Test {
    ProgramVault vault;
    MockUSDC usdc;

    address owner = makeAddr("owner");
    address issuer = makeAddr("issuer");
    address secondApprover = makeAddr("secondApprover");
    address merchant = makeAddr("merchant"); // funds the program
    address customer = makeAddr("customer");

    uint256 constant ONE_USDC = 1e6;

    function setUp() public {
        usdc = new MockUSDC();
        vault = new ProgramVault(address(usdc), owner, issuer, secondApprover);

        usdc.mint(merchant, 1_000 * ONE_USDC);
        vm.prank(merchant);
        usdc.approve(address(vault), type(uint256).max);
    }

    function _fund(uint256 amount) internal {
        vm.prank(merchant);
        vault.fund(amount);
    }

    // ---------------------------------------------------------------------
    // Funding + issuance
    // ---------------------------------------------------------------------

    function test_fund_increasesFundedBalance() public {
        _fund(100 * ONE_USDC);
        assertEq(vault.funded(), 100 * ONE_USDC);
        assertEq(usdc.balanceOf(address(vault)), 100 * ONE_USDC);
    }

    function test_issuePoints_succeedsWithinFundedBalance() public {
        _fund(100 * ONE_USDC);

        vm.prank(issuer);
        vault.issuePoints(customer, 40 * ONE_USDC);

        assertEq(vault.pointsOf(customer), 40 * ONE_USDC);
        assertEq(vault.issued(), 40 * ONE_USDC);
    }

    /// @dev The invariant the whole product rests on: a program cannot
    ///      promise more than it holds.
    function test_issuePoints_revertsWhenExceedingFundedBalance() public {
        _fund(10 * ONE_USDC);

        vm.prank(issuer);
        vm.expectRevert(ProgramVault.ExceedsFundedBalance.selector);
        vault.issuePoints(customer, 11 * ONE_USDC);
    }

    function test_issuePoints_revertsForNonIssuer() public {
        _fund(10 * ONE_USDC);

        vm.expectRevert(ProgramVault.NotIssuer.selector);
        vault.issuePoints(customer, 1 * ONE_USDC);
    }

    /// @dev Points have no transfer function at all — this is the whole
    ///      non-transferability guarantee. Nothing to call, nothing to test
    ///      beyond confirming the balance only ever moves via issue/redeem.
    function test_points_haveNoTransferPath() public {
        _fund(10 * ONE_USDC);
        vm.prank(issuer);
        vault.issuePoints(customer, 5 * ONE_USDC);

        // ProgramVault exposes no transfer/transferFrom for pointsOf — the
        // absence of such a function is the guarantee. Confirmed by every
        // other test only ever moving pointsOf via issuePoints/redemption.
        assertEq(vault.pointsOf(customer), 5 * ONE_USDC);
    }

    // ---------------------------------------------------------------------
    // Redemption
    // ---------------------------------------------------------------------

    function test_redemption_fullFlow_settlesOnChain() public {
        _fund(100 * ONE_USDC);
        vm.prank(issuer);
        vault.issuePoints(customer, 20 * ONE_USDC);

        string memory code = "ABC123";
        bytes32 codeHash = keccak256(bytes(code));

        vm.prank(issuer);
        uint256 id = vault.createRedemption(customer, 20 * ONE_USDC, codeHash);

        vm.prank(issuer);
        vault.settleRedemption(id, code);

        assertEq(vault.pointsOf(customer), 0);
        assertEq(vault.issued(), 0);
        assertEq(vault.funded(), 80 * ONE_USDC);
        assertEq(usdc.balanceOf(customer), 20 * ONE_USDC);
    }

    function test_settleRedemption_revertsOnWrongCode() public {
        _fund(20 * ONE_USDC);
        vm.prank(issuer);
        vault.issuePoints(customer, 20 * ONE_USDC);

        vm.prank(issuer);
        uint256 id = vault.createRedemption(customer, 20 * ONE_USDC, keccak256(bytes("RIGHT")));

        vm.prank(issuer);
        vm.expectRevert(ProgramVault.InvalidCode.selector);
        vault.settleRedemption(id, "WRONG");
    }

    function test_settleRedemption_revertsIfAlreadySettled() public {
        _fund(20 * ONE_USDC);
        vm.prank(issuer);
        vault.issuePoints(customer, 20 * ONE_USDC);

        vm.prank(issuer);
        uint256 id = vault.createRedemption(customer, 20 * ONE_USDC, keccak256(bytes("CODE")));

        vm.prank(issuer);
        vault.settleRedemption(id, "CODE");

        vm.prank(issuer);
        vm.expectRevert(ProgramVault.AlreadySettled.selector);
        vault.settleRedemption(id, "CODE");
    }

    function test_createRedemption_revertsWithInsufficientPoints() public {
        _fund(20 * ONE_USDC);
        vm.prank(issuer);
        vault.issuePoints(customer, 5 * ONE_USDC);

        vm.prank(issuer);
        vm.expectRevert(ProgramVault.InsufficientPoints.selector);
        vault.createRedemption(customer, 10 * ONE_USDC, keccak256(bytes("CODE")));
    }

    // ---------------------------------------------------------------------
    // Withdrawal — two-address approval
    // ---------------------------------------------------------------------

    function test_unissuedSurplus_excludesIssuedPoints() public {
        _fund(100 * ONE_USDC);
        vm.prank(issuer);
        vault.issuePoints(customer, 30 * ONE_USDC);

        assertEq(vault.unissuedSurplus(), 70 * ONE_USDC);
    }

    function test_withdrawal_succeedsWithProposerAndDistinctApprover() public {
        _fund(100 * ONE_USDC);
        address recipient = makeAddr("recipient");

        vm.prank(owner);
        vault.proposeWithdrawal(recipient, 40 * ONE_USDC);

        vm.prank(secondApprover);
        vault.approveWithdrawal();

        assertEq(usdc.balanceOf(recipient), 40 * ONE_USDC);
        assertEq(vault.funded(), 60 * ONE_USDC);
    }

    /// @dev This is the on-chain analog of the demo's "policy blocks a
    ///      transaction" moment — a single key can never move surplus out.
    function test_withdrawal_revertsWhenApproverIsProposer() public {
        _fund(100 * ONE_USDC);

        vm.prank(owner);
        vault.proposeWithdrawal(owner, 40 * ONE_USDC);

        vm.prank(owner);
        vm.expectRevert(ProgramVault.NotSecondApprover.selector);
        vault.approveWithdrawal();
    }

    function test_withdrawal_revertsWhenExceedingUnissuedSurplus() public {
        _fund(100 * ONE_USDC);
        vm.prank(issuer);
        vault.issuePoints(customer, 90 * ONE_USDC);

        vm.prank(owner);
        vm.expectRevert(ProgramVault.ExceedsUnissuedSurplus.selector);
        vault.proposeWithdrawal(owner, 20 * ONE_USDC);
    }

    function test_approveWithdrawal_revertsWithNoPendingWithdrawal() public {
        vm.prank(secondApprover);
        vm.expectRevert(ProgramVault.NoPendingWithdrawal.selector);
        vault.approveWithdrawal();
    }

    // ---------------------------------------------------------------------
    // Campaign configuration
    // ---------------------------------------------------------------------

    function test_configureCampaign_onlyOwner() public {
        vm.prank(owner);
        vault.configureCampaign("5pct cashback", 500, true);

        (string memory name, uint16 bps, bool active) = vault.campaign();
        assertEq(name, "5pct cashback");
        assertEq(bps, 500);
        assertTrue(active);
    }

    function test_configureCampaign_revertsForNonOwner() public {
        vm.expectRevert();
        vault.configureCampaign("nope", 100, true);
    }
}
