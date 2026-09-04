# Reserva

*Loyalty points a merchant has actually set money aside for.*

---

## What it is

Reserva is a loyalty system where every point issued is backed by real money held in escrow.

A merchant funds a program with USDC. Points issued to customers are collateralised against that balance — the program cannot promise more than it holds. When a customer redeems, settlement releases from the vault on-chain in the same second, not as a favour the merchant chooses to grant.

The merchant runs the whole thing by messaging an AI agent. No dashboard to log into, no wallet to manage, no seed phrase to lose.

---

## The problem

**Loyalty points are the largest category of unfunded liability nobody audits.** Airlines and hotels reserve against theirs because regulators and auditors make them. A café with 400 members reserves against nothing. Those points exist in a spreadsheet, and they're worth exactly as much as the owner's continued goodwill and continued solvency.

That produces two failures that feed each other:

**Customers don't trust small-merchant loyalty.** Everyone has a punch card from a shop that closed, or a balance that quietly expired when the terms changed. So redemption rates at small businesses are poor, and a program that nobody redeems never changes anyone's behaviour — which means the merchant concludes loyalty doesn't work and stops investing in it.

**Merchants can't see what they owe.** Issued points are a real future cost that arrives unpredictably. Most owners have no idea what their outstanding liability is. So they either over-issue and get hurt on a busy month, or under-issue so cautiously that the reward is too small to notice.

Escrow fixes both at once. The customer can verify the money exists. The merchant sees liability as a funded number rather than a guess.

**Why this is buildable now:** settlement finally costs less than the thing being settled. A $2 cashback cannot survive a $3 network fee. On a stablecoin-native chain with sub-cent fees, small frequent obligations settle economically for the first time. That's the only honest reason to put this on-chain at all — not decentralisation, not tokens, just the fact that the unit economics of micro-settlement recently crossed zero.

---

## Who it's for

**The merchant.** Cafés, salons, gyms, clinics, small retail — 200 to 2,000 repeat customers. Concentrated in markets where chat is the default business channel: UAE, India, Southeast Asia.

They are not crypto users and never will be. They will not install a browser extension, will not write down twelve words, and will not open a new dashboard every morning. Any design that assumes otherwise has already failed.

**The customer.** Enrols by message, earns by visiting, redeems at the counter. Should never learn a blockchain was involved. Their experience improves in exactly one way: they can check the reward is funded.

**Not for:** DeFi users, enterprise programs that already have reserve accounting, or anyone who wants points to be tradeable.

---

## How it works

### 1. Open and fund

The merchant lands on a single onboarding page and signs in with email or phone. A wallet is created for the business behind the scenes, with spend policies applied at creation — daily limits, and a second-approver requirement on anything that withdraws from the program.

They fund the program in USDC. That balance is the ceiling on everything the program can promise.

This is the only time the merchant sees a web page. Everything afterwards happens in chat.

### 2. Configure by message

> *"Start 5% cashback for the next month."*
> *"Double points on weekday mornings."*
> *"How much have I got left?"*

The agent translates intent into program configuration. No forms, no settings screens.

### 3. Enrol

A customer joins by message. Enrolment passes a lightweight biometric liveness check — a selfie, once — which confirms a real person is behind the number without collecting an identity.

This exists for one specific reason: signup-bonus farming is the oldest attack on loyalty and it's trivial with disposable phone numbers. Funded rewards make that attack profitable, so it has to be closed before the rewards are generous enough to matter.

### 4. Earn

Points are issued on purchase. Every issuance checks against the funded balance. If the program is fully committed, it stops issuing rather than quietly going underwater — the constraint is the product, not a limitation of it.

### 5. Redeem and settle

The customer redeems at the counter. A one-time code confirms presence, settlement releases from the vault on-chain, and both parties get confirmation in seconds. There is no reconciliation step and no argument about whether the reward was honoured.

### 6. Account

> *"What do I owe right now?"*

Funded versus issued, live, with the transaction history behind it. The number the merchant has never had before.

---

## Interfaces

**Web, once.** Onboarding and funding. A browser is unavoidable for taking money in; the design goal is to need it exactly one time.

**Chat, forever.** Configuration, issuance, enrolment, redemption, approvals, reporting. WhatsApp is the target channel because it is where these businesses already conduct their day. The moment there's a separate app to remember, the product becomes another tool the owner stops opening.

---

## Architecture

```
Merchant ──web (once)──► Onboarding
                              │  creates org wallet + policies
                              │  funds program in USDC
                              ▼
Merchant ──chat──► Agent ──► Reserva API ──► Program vault (on-chain)
Customer ──chat──┘              │              · funded balance
                                │              · issuance ceiling
                                │              · conditional payouts
                                │              · settlement
                                ▼
                        Liveness check at enrolment
```

**Program vault** — holds USDC, tracks issued against funded, releases on authorised redemption.
**Campaign logic** — conditional payouts expressed on-chain: spend ≥ X, release Y.
**Policy layer** — spend limits and multi-approval sitting between the agent and the treasury.
**Agent layer** — natural-language intent translated into program operations.

---

## Design decisions worth defending

**Chat is the operating interface.** Not because a dashboard is hard, but because a dashboard is forgettable. Reaching the merchant where they already are is the difference between a program that runs and one that's abandoned in week three.

**Custody through policy, not through a seed phrase.** An owner losing twelve words is a business-ending event. That failure mode is removed rather than mitigated: policy-controlled wallets, recoverable sign-in, approvals on anything irreversible.

**Points are non-transferable.** Transferability creates a secondary market, and a secondary market turns every program into a farm. Loyalty that can be traded stops being loyalty.

**Human approval on irreversible actions.** An agent can propose a treasury movement. It cannot complete one alone. Agents that spend money without a gate are a liability dressed as a feature.

**The program can refuse to issue.** Running out of funded capacity is a designed behaviour, not an error state. The whole premise collapses if the system will issue points it can't back.

---

## Infrastructure

**Stablecoin settlement chain.** Vault, campaign logic, and settlement, denominated in USDC. Chosen for sub-cent fees and fast finality — a loyalty reward is often worth under a dollar, so settlement cost has to be a rounding error against the reward itself.

**Managed wallet and policy infrastructure.** Business wallets created from an email sign-in, with spend limits, approval quorums, and programmatic transaction signing. This is what makes the no-seed-phrase promise real rather than aspirational.

**Proof-of-personhood.** A low-friction liveness credential at enrolment. Narrow scope, one job: make each real person eligible once.

**Agent-readable service layer.** Program and liability data exposed as a callable service with usage documentation, so a merchant's other tools and agents can query program state without a human wiring up an API first.

---

## Value created

**For the merchant**
- Outstanding liability becomes a known, funded number instead of unpriced risk
- Redemption settles automatically — no reconciliation, no counter disputes
- Operated from chat, so there's no adoption cliff and no training
- Farming resistance means rewards can be generous enough to actually shift behaviour

**For the customer**
- Can verify the reward is funded, not merely promised
- Redemption is instant and can't be quietly refused
- Terms can't be changed retroactively on money already escrowed
- No wallet, no app, no crypto knowledge

**More broadly**
- A stablecoin use case with a non-speculative reason to exist: settling small, frequent, real-world obligations
- A demonstration that agent-operated treasuries are safe when policy and human approval sit between the agent and the money

---

## Scope boundaries

Deliberately not built:

| Not building | Why |
|---|---|
| Merchant web dashboard | Undermines the chat-first thesis and creates a surface nobody returns to |
| Transferable or tradeable points | Invites farming and a secondary market; changes the legal shape of the product |
| Multi-currency support | One stablecoin proves the mechanism; more currencies prove nothing extra |
| Token issuance | There is no problem here a token solves |
| POS hardware integration | Real, but it's an integration problem, not a product-thesis problem |
| Customer-facing app | The customer's interface is chat and a counter code. Anything more is friction. |

---

## What comes next

The vault is the reusable piece. Loyalty is the first application because the market is understood and the pain is immediate, but the primitive generalises: a funded, policy-gated, agent-operated obligation pool covers deposits, refund guarantees, service credits, and prepaid balances.

Any promise a small business makes that a customer currently has to take on faith.
