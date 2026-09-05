// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ProgramVault
/// @notice Holds a merchant's loyalty program funds in USDC and enforces
///         that points issued to customers can never exceed what's actually
///         funded. Points are a plain internal balance, not a token — there
///         is deliberately no transfer function, so points cannot become a
///         secondary market.
///
/// @dev 1 point == 1 unit of `asset` (e.g. 1e-6 USDC). No separate exchange
///      rate for the MVP — the campaign's cashback rate is applied off-chain
///      by the issuer when it decides how many points to issue.
contract ProgramVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice USDC (or equivalent stablecoin) backing every point issued.
    IERC20 public immutable asset;

    /// @notice Address authorized to issue points and settle redemptions —
    ///         the Reserva API/agent's signer, not the merchant's own key.
    ///         Kept separate from `owner` so day-to-day issuance never
    ///         carries withdrawal rights.
    address public issuer;

    /// @notice Second address required to approve any withdrawal of
    ///         unissued surplus. Distinct from `owner` — the on-chain half
    ///         of the "second-approver" policy Privy enforces off-chain.
    address public secondApprover;

    /// @notice Cumulative USDC ever deposited into the program.
    uint256 public funded;

    /// @notice Points currently outstanding (issued, not yet redeemed).
    ///         Core invariant enforced throughout this contract: issued <= funded.
    uint256 public issued;

    /// @notice Per-customer point balance.
    mapping(address => uint256) public pointsOf;

    struct Campaign {
        string name;
        uint16 cashbackBps; // basis points; informational — issuance amounts are passed explicitly
        bool active;
    }

    Campaign public campaign;

    struct Redemption {
        address customer;
        uint256 amount;
        bytes32 codeHash;
        bool settled;
    }

    /// @notice Redemptions by id. `codeHash = keccak256(bytes(code))` — the
    ///         plaintext code is generated and shown to the customer
    ///         off-chain, only its hash is committed on-chain.
    mapping(uint256 => Redemption) public redemptions;
    uint256 public redemptionCount;

    struct PendingWithdrawal {
        address to;
        uint256 amount;
        address proposer;
    }

    /// @notice At most one withdrawal in flight at a time, by design —
    ///         keeps the approval story unambiguous for the demo.
    PendingWithdrawal public pendingWithdrawal;

    event Funded(address indexed from, uint256 amount);
    event CampaignConfigured(string name, uint16 cashbackBps, bool active);
    event PointsIssued(address indexed customer, uint256 amount);
    event RedemptionCreated(uint256 indexed id, address indexed customer, uint256 amount);
    event RedemptionSettled(uint256 indexed id, address indexed customer, uint256 amount);
    event IssuerUpdated(address indexed issuer);
    event SecondApproverUpdated(address indexed secondApprover);
    event WithdrawalProposed(address indexed to, uint256 amount, address indexed proposer);
    event WithdrawalExecuted(address indexed to, uint256 amount);

    error NotIssuer();
    error NotSecondApprover();
    error ExceedsFundedBalance();
    error InsufficientPoints();
    error InvalidCode();
    error AlreadySettled();
    error NoPendingWithdrawal();
    error ApproverIsProposer();
    error ExceedsUnissuedSurplus();
    error ZeroAddress();

    modifier onlyIssuer() {
        if (msg.sender != issuer) revert NotIssuer();
        _;
    }

    constructor(address _asset, address _owner, address _issuer, address _secondApprover) Ownable(_owner) {
        if (_asset == address(0) || _issuer == address(0) || _secondApprover == address(0)) {
            revert ZeroAddress();
        }
        asset = IERC20(_asset);
        issuer = _issuer;
        secondApprover = _secondApprover;
    }

    // ---------------------------------------------------------------------
    // Funding
    // ---------------------------------------------------------------------

    /// @notice Deposit `amount` of `asset` into the program, raising the
    ///         ceiling on what can be issued. Open to any caller so both the
    ///         merchant's Privy wallet and a later top-up work the same way.
    function fund(uint256 amount) external nonReentrant {
        asset.safeTransferFrom(msg.sender, address(this), amount);
        funded += amount;
        emit Funded(msg.sender, amount);
    }

    // ---------------------------------------------------------------------
    // Campaign configuration
    // ---------------------------------------------------------------------

    /// @notice Set the active campaign. One campaign at a time for the MVP —
    ///         see BUILD_PLAN.md's scope notes on why.
    function configureCampaign(string calldata name, uint16 cashbackBps, bool active) external onlyOwner {
        campaign = Campaign(name, cashbackBps, active);
        emit CampaignConfigured(name, cashbackBps, active);
    }

    // ---------------------------------------------------------------------
    // Issuance
    // ---------------------------------------------------------------------

    /// @notice Issue `amount` points to `customer`. Reverts if doing so
    ///         would push total outstanding points above the funded
    ///         balance — the invariant the entire product rests on.
    function issuePoints(address customer, uint256 amount) external onlyIssuer {
        if (issued + amount > funded) revert ExceedsFundedBalance();
        issued += amount;
        pointsOf[customer] += amount;
        emit PointsIssued(customer, amount);
    }

    // ---------------------------------------------------------------------
    // Redemption
    // ---------------------------------------------------------------------

    /// @notice Commit to a redemption of `amount` points for `customer`,
    ///         storing only `codeHash`. The plaintext one-time code is
    ///         generated and shown to the customer off-chain.
    function createRedemption(address customer, uint256 amount, bytes32 codeHash)
        external
        onlyIssuer
        returns (uint256 id)
    {
        if (pointsOf[customer] < amount) revert InsufficientPoints();
        id = redemptionCount++;
        redemptions[id] = Redemption(customer, amount, codeHash, false);
        emit RedemptionCreated(id, customer, amount);
    }

    /// @notice Settle a redemption once the customer has shown the code at
    ///         the counter. Called by the issuer (merchant's agent/API), not
    ///         the customer directly — the code confirms presence, it isn't
    ///         a self-service claim function.
    function settleRedemption(uint256 id, string calldata code) external nonReentrant onlyIssuer {
        Redemption storage r = redemptions[id];
        if (r.settled) revert AlreadySettled();
        if (keccak256(bytes(code)) != r.codeHash) revert InvalidCode();
        if (pointsOf[r.customer] < r.amount) revert InsufficientPoints();

        r.settled = true;
        pointsOf[r.customer] -= r.amount;
        issued -= r.amount;
        funded -= r.amount;

        asset.safeTransfer(r.customer, r.amount);
        emit RedemptionSettled(id, r.customer, r.amount);
    }

    // ---------------------------------------------------------------------
    // Withdrawal of unissued surplus — two-step, two-address approval
    // ---------------------------------------------------------------------

    /// @notice Unissued surplus is `funded - issued`. Only this amount can
    ///         ever leave via withdrawal — money already backing
    ///         outstanding points is untouchable by construction.
    function unissuedSurplus() public view returns (uint256) {
        return funded - issued;
    }

    /// @notice Owner proposes a withdrawal of surplus funds. Moves nothing —
    ///         `approveWithdrawal` from a *different* address is required
    ///         before anything executes.
    function proposeWithdrawal(address to, uint256 amount) external onlyOwner {
        if (amount > unissuedSurplus()) revert ExceedsUnissuedSurplus();
        pendingWithdrawal = PendingWithdrawal(to, amount, msg.sender);
        emit WithdrawalProposed(to, amount, msg.sender);
    }

    /// @notice Second approver confirms and executes the pending
    ///         withdrawal. Reverts if called by the address that proposed
    ///         it — this is the on-chain half of "no single key moves money
    ///         out"; Privy policy enforces the off-chain half.
    function approveWithdrawal() external nonReentrant {
        PendingWithdrawal memory w = pendingWithdrawal;
        if (w.amount == 0) revert NoPendingWithdrawal();
        if (msg.sender != secondApprover) revert NotSecondApprover();
        if (msg.sender == w.proposer) revert ApproverIsProposer();
        if (w.amount > unissuedSurplus()) revert ExceedsUnissuedSurplus();

        delete pendingWithdrawal;
        funded -= w.amount;
        asset.safeTransfer(w.to, w.amount);
        emit WithdrawalExecuted(w.to, w.amount);
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function setIssuer(address _issuer) external onlyOwner {
        if (_issuer == address(0)) revert ZeroAddress();
        issuer = _issuer;
        emit IssuerUpdated(_issuer);
    }

    function setSecondApprover(address _secondApprover) external onlyOwner {
        if (_secondApprover == address(0)) revert ZeroAddress();
        secondApprover = _secondApprover;
        emit SecondApproverUpdated(_secondApprover);
    }
}
