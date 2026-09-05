// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from
    "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title ProgramVault
/// @notice Multi-tenant vault: any merchant can self-serve `createProgram`
///         to open its own loyalty program, denominated in the same `asset`
///         (USDC) for every program. Each program enforces, independently,
///         that points issued to its customers can never exceed what it has
///         actually funded. Points are a plain internal balance, not a
///         token — there is deliberately no transfer function, so points
///         cannot become a secondary market.
///
/// @dev 1 point == 1 unit of `asset` (e.g. 1e-6 USDC). No separate exchange
///      rate for the MVP — the campaign's cashback rate is applied off-chain
///      by the issuer when it decides how many points to issue.
///
/// @dev Upgradeable via UUPS. `asset` is `immutable`, set in the
///      implementation contract's constructor — safe under delegatecall
///      because immutables are baked into the implementation's bytecode,
///      not stored in proxy storage, so every proxy sees the same value.
///      `_authorizeUpgrade` is gated by the contract-level `owner()`, which
///      is the Reserva protocol admin — a role distinct from any individual
///      merchant's per-program `owner`/`issuer`/`secondApprover`.
contract ProgramVault is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    /// @notice USDC (or equivalent stablecoin) backing every point issued,
    ///         across every program.
    IERC20 public immutable asset;

    struct Program {
        /// @notice Merchant's policy-controlled wallet — set to the caller
        ///         of `createProgram`. Gates campaign config and withdrawal.
        address owner;
        /// @notice Address authorized to issue points and settle
        ///         redemptions — the Reserva API/agent's signer, not the
        ///         merchant's own key. Kept separate from `owner` so
        ///         day-to-day issuance never carries withdrawal rights.
        address issuer;
        /// @notice Second address required to approve any withdrawal of
        ///         unissued surplus. Distinct from `owner` — the on-chain
        ///         half of the "second-approver" policy Privy enforces
        ///         off-chain.
        address secondApprover;
        /// @notice Cumulative USDC ever deposited into this program.
        uint256 funded;
        /// @notice Points currently outstanding for this program (issued,
        ///         not yet redeemed). Core invariant enforced throughout
        ///         this contract, per program: issued <= funded.
        uint256 issued;
        uint256 redemptionCount;
    }

    struct Campaign {
        string name;
        uint16 cashbackBps; // basis points; informational — issuance amounts are passed explicitly
        bool active;
    }

    struct Redemption {
        address customer;
        uint256 amount;
        bytes32 codeHash;
        bool settled;
    }

    struct PendingWithdrawal {
        address to;
        uint256 amount;
        address proposer;
    }

    /// @notice Number of programs ever created; also the next program's id.
    uint256 public programCount;

    mapping(uint256 => Program) public programs;
    mapping(uint256 => Campaign) public campaign;

    /// @notice programId => customer => point balance.
    mapping(uint256 => mapping(address => uint256)) public pointsOf;

    /// @notice programId => redemptionId => Redemption. `codeHash =
    ///         keccak256(bytes(code))` — the plaintext code is generated and
    ///         shown to the customer off-chain, only its hash is committed
    ///         on-chain.
    mapping(uint256 => mapping(uint256 => Redemption)) public redemptions;

    /// @notice At most one withdrawal in flight per program, by design —
    ///         keeps the approval story unambiguous for the demo.
    mapping(uint256 => PendingWithdrawal) public pendingWithdrawal;

    event ProgramCreated(uint256 indexed programId, address indexed owner, address indexed issuer, address secondApprover);
    event Funded(uint256 indexed programId, address indexed from, uint256 amount);
    event CampaignConfigured(uint256 indexed programId, string name, uint16 cashbackBps, bool active);
    event PointsIssued(uint256 indexed programId, address indexed customer, uint256 amount);
    event RedemptionCreated(uint256 indexed programId, uint256 indexed id, address indexed customer, uint256 amount);
    event RedemptionSettled(uint256 indexed programId, uint256 indexed id, address indexed customer, uint256 amount);
    event IssuerUpdated(uint256 indexed programId, address indexed issuer);
    event SecondApproverUpdated(uint256 indexed programId, address indexed secondApprover);
    event WithdrawalProposed(uint256 indexed programId, address indexed to, uint256 amount, address indexed proposer);
    event WithdrawalExecuted(uint256 indexed programId, address indexed to, uint256 amount);

    error ProgramNotFound();
    error NotProgramOwner();
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

    modifier programExists(uint256 programId) {
        if (programId >= programCount) revert ProgramNotFound();
        _;
    }

    modifier onlyProgramOwner(uint256 programId) {
        if (msg.sender != programs[programId].owner) revert NotProgramOwner();
        _;
    }

    modifier onlyProgramIssuer(uint256 programId) {
        if (msg.sender != programs[programId].issuer) revert NotIssuer();
        _;
    }

    /// @dev `_asset` is set once, in the implementation contract's
    ///      constructor, and applies to every program on every proxy that
    ///      points at this implementation. `_disableInitializers` prevents
    ///      the implementation contract itself (as opposed to a proxy
    ///      pointing at it) from ever being initialized.
    constructor(address _asset) {
        if (_asset == address(0)) revert ZeroAddress();
        asset = IERC20(_asset);
        _disableInitializers();
    }

    /// @notice Runs once, at proxy deployment. `protocolAdmin` is the
    ///         Reserva-side key authorized to ship contract upgrades — not
    ///         a merchant.
    function initialize(address protocolAdmin) external initializer {
        __Ownable_init(protocolAdmin);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ---------------------------------------------------------------------
    // Self-serve onboarding
    // ---------------------------------------------------------------------

    /// @notice Open a new program. The caller becomes its `owner` — no
    ///         protocol-admin step required, so a merchant's own
    ///         Privy-managed wallet can call this directly at onboarding.
    function createProgram(address issuer, address secondApprover) external returns (uint256 programId) {
        if (issuer == address(0) || secondApprover == address(0)) revert ZeroAddress();
        programId = programCount++;
        programs[programId] = Program({
            owner: msg.sender,
            issuer: issuer,
            secondApprover: secondApprover,
            funded: 0,
            issued: 0,
            redemptionCount: 0
        });
        emit ProgramCreated(programId, msg.sender, issuer, secondApprover);
    }

    // ---------------------------------------------------------------------
    // Funding
    // ---------------------------------------------------------------------

    /// @notice Deposit `amount` of `asset` into `programId`, raising the
    ///         ceiling on what that program can issue. Open to any caller so
    ///         both the merchant's Privy wallet and a later top-up work the
    ///         same way.
    function fund(uint256 programId, uint256 amount) external nonReentrant programExists(programId) {
        asset.safeTransferFrom(msg.sender, address(this), amount);
        programs[programId].funded += amount;
        emit Funded(programId, msg.sender, amount);
    }

    // ---------------------------------------------------------------------
    // Campaign configuration
    // ---------------------------------------------------------------------

    /// @notice Set the active campaign for `programId`. One campaign at a
    ///         time per program for the MVP — see BUILD_PLAN.md's scope
    ///         notes on why.
    function configureCampaign(uint256 programId, string calldata name, uint16 cashbackBps, bool active)
        external
        programExists(programId)
        onlyProgramOwner(programId)
    {
        campaign[programId] = Campaign(name, cashbackBps, active);
        emit CampaignConfigured(programId, name, cashbackBps, active);
    }

    // ---------------------------------------------------------------------
    // Issuance
    // ---------------------------------------------------------------------

    /// @notice Issue `amount` points to `customer` under `programId`.
    ///         Reverts if doing so would push that program's total
    ///         outstanding points above its funded balance — the invariant
    ///         the entire product rests on.
    function issuePoints(uint256 programId, address customer, uint256 amount)
        external
        programExists(programId)
        onlyProgramIssuer(programId)
    {
        Program storage p = programs[programId];
        if (p.issued + amount > p.funded) revert ExceedsFundedBalance();
        p.issued += amount;
        pointsOf[programId][customer] += amount;
        emit PointsIssued(programId, customer, amount);
    }

    // ---------------------------------------------------------------------
    // Redemption
    // ---------------------------------------------------------------------

    /// @notice Commit to a redemption of `amount` points for `customer`
    ///         under `programId`, storing only `codeHash`. The plaintext
    ///         one-time code is generated and shown to the customer
    ///         off-chain.
    function createRedemption(uint256 programId, address customer, uint256 amount, bytes32 codeHash)
        external
        programExists(programId)
        onlyProgramIssuer(programId)
        returns (uint256 id)
    {
        if (pointsOf[programId][customer] < amount) revert InsufficientPoints();
        Program storage p = programs[programId];
        id = p.redemptionCount++;
        redemptions[programId][id] = Redemption(customer, amount, codeHash, false);
        emit RedemptionCreated(programId, id, customer, amount);
    }

    /// @notice Settle a redemption once the customer has shown the code at
    ///         the counter. Called by the program's issuer (merchant's
    ///         agent/API), not the customer directly — the code confirms
    ///         presence, it isn't a self-service claim function.
    function settleRedemption(uint256 programId, uint256 id, string calldata code)
        external
        nonReentrant
        programExists(programId)
        onlyProgramIssuer(programId)
    {
        Redemption storage r = redemptions[programId][id];
        if (r.settled) revert AlreadySettled();
        if (keccak256(bytes(code)) != r.codeHash) revert InvalidCode();
        if (pointsOf[programId][r.customer] < r.amount) revert InsufficientPoints();

        r.settled = true;
        pointsOf[programId][r.customer] -= r.amount;
        Program storage p = programs[programId];
        p.issued -= r.amount;
        p.funded -= r.amount;

        asset.safeTransfer(r.customer, r.amount);
        emit RedemptionSettled(programId, id, r.customer, r.amount);
    }

    // ---------------------------------------------------------------------
    // Withdrawal of unissued surplus — two-step, two-address approval
    // ---------------------------------------------------------------------

    /// @notice Unissued surplus for `programId` is `funded - issued`. Only
    ///         this amount can ever leave via withdrawal — money already
    ///         backing outstanding points is untouchable by construction.
    function unissuedSurplus(uint256 programId) public view programExists(programId) returns (uint256) {
        Program storage p = programs[programId];
        return p.funded - p.issued;
    }

    /// @notice Program owner proposes a withdrawal of surplus funds. Moves
    ///         nothing — `approveWithdrawal` from a *different* address is
    ///         required before anything executes.
    function proposeWithdrawal(uint256 programId, address to, uint256 amount)
        external
        programExists(programId)
        onlyProgramOwner(programId)
    {
        if (amount > unissuedSurplus(programId)) revert ExceedsUnissuedSurplus();
        pendingWithdrawal[programId] = PendingWithdrawal(to, amount, msg.sender);
        emit WithdrawalProposed(programId, to, amount, msg.sender);
    }

    /// @notice Program's second approver confirms and executes the pending
    ///         withdrawal. Reverts if called by the address that proposed
    ///         it — this is the on-chain half of "no single key moves money
    ///         out"; Privy policy enforces the off-chain half.
    function approveWithdrawal(uint256 programId) external nonReentrant programExists(programId) {
        PendingWithdrawal memory w = pendingWithdrawal[programId];
        if (w.amount == 0) revert NoPendingWithdrawal();
        if (msg.sender != programs[programId].secondApprover) revert NotSecondApprover();
        if (msg.sender == w.proposer) revert ApproverIsProposer();
        if (w.amount > unissuedSurplus(programId)) revert ExceedsUnissuedSurplus();

        delete pendingWithdrawal[programId];
        programs[programId].funded -= w.amount;
        asset.safeTransfer(w.to, w.amount);
        emit WithdrawalExecuted(programId, w.to, w.amount);
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function setIssuer(uint256 programId, address _issuer) external programExists(programId) onlyProgramOwner(programId) {
        if (_issuer == address(0)) revert ZeroAddress();
        programs[programId].issuer = _issuer;
        emit IssuerUpdated(programId, _issuer);
    }

    function setSecondApprover(uint256 programId, address _secondApprover)
        external
        programExists(programId)
        onlyProgramOwner(programId)
    {
        if (_secondApprover == address(0)) revert ZeroAddress();
        programs[programId].secondApprover = _secondApprover;
        emit SecondApproverUpdated(programId, _secondApprover);
    }

    /// @dev Reserved storage slots so future versions can append new state
    ///      variables without shifting the layout of existing ones.
    uint256[50] private __gap;
}
