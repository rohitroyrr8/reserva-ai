# Reserva

**Collateralised loyalty points on Arc, operated through an agent.**

ETHGlobal Online 2026 · Arc (Circle) · Privy · World · Bazantic

> Product pitch, problem framing, and market context live in [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md).
> Sponsor-integration scope, priority tiers, and open action items live in [`TECH_STACK.md`](./TECH_STACK.md).
> This file is the technical entry point: architecture, components, and how to run it.

---

## System overview

Reserva is an on-chain vault + off-chain agent system. A merchant's program balance (USDC) lives in a smart contract on Arc. Issuance and redemption are both gated against that on-chain balance, so a program cannot go underwater. All merchant-facing interaction — configuration, enrolment, redemption, reporting — is mediated by an LLM agent over chat, which calls a policy-gated API in front of the vault. There is no merchant dashboard.

```
                          ┌──────────────────────────┐
  Merchant ──web (once)──►│  Onboarding               │
                          │  · Privy auth (email/phone)│
                          │  · org wallet + policy setup│
                          │  · fund program (USDC)     │
                          └────────────┬─────────────┘
                                       │
  Merchant ──chat──►┌─────────────┐   │
                     │   Agent     │   │
  Customer ──chat──► │ (NL → intent)│  │
                     └──────┬──────┘   │
                            │           │
                            ▼           ▼
                     ┌─────────────────────────┐
                     │   Reserva API            │
                     │   · policy checks (Privy)│
                     │   · liveness gate (World) │
                     │   · agent-callable layer  │
                     │     (Bazantic x402/MPP)   │
                     └────────────┬─────────────┘
                                  ▼
                     ┌─────────────────────────┐
                     │  Program Vault (Arc, EVM)│
                     │  · funded balance (USDC)  │
                     │  · issuance ceiling       │
                     │  · campaign/payout logic  │
                     │  · redemption settlement  │
                     └─────────────────────────┘
```

---

## Components

| Component | Responsibility | Built with |
|---|---|---|
| **Program Vault** | Holds USDC, tracks issued vs. funded, enforces the issuance ceiling, releases funds on authorised redemption | Solidity, deployed on Arc (EVM L1) |
| **Campaign Logic** | Conditional payout rules expressed on-chain (`spend ≥ X → release Y`) | Solidity, on-chain alongside the vault |
| **Reserva API** | Policy enforcement, request validation, agent-callable interface in front of the vault | Backend service (language/framework TBD) |
| **Agent Layer** | Translates natural-language merchant/customer intent into API calls | LLM-backed chat agent, WhatsApp as the target channel |
| **Custody & Policy** | Wallet creation, spend limits, second-approver/key-quorum enforcement | Privy (Auth SDK, embedded/server wallets, Policies) |
| **Proof-of-personhood** | One-time liveness check at customer enrolment | World (Selfie Check, IDKit) |
| **Agent-readable service layer** | Exposes program/liability state as a documented, callable service for external agents | Bazantic (x402/MPP Gateway + Recipe) |

---

## On-chain design

**Chain:** Arc (Circle's EVM-compatible L1) — chosen for sub-cent fees and fast finality, required for micro-settlement (rewards frequently under $1) to be economical.

**Settlement asset:** USDC, native to the vault. No other currency is supported (see scope boundaries in `PROJECT_OVERVIEW.md`).

**Contracts** *(planned — addresses filled in once deployed)*:

| Contract | Network | Address |
|---|---|---|
| `ProgramVault` | Arc Testnet | `TBD` |
| `ProgramVault` | Arc Mainnet | `TBD` |
| USDC | Arc | see [Circle's Arc docs](https://developers.circle.com) for canonical address |

**Core invariants the vault enforces:**
- `issued ≤ funded` at all times — no issuance transaction may push liability above the funded balance.
- Redemption is atomic: settlement and balance decrement happen in the same on-chain transaction, no off-chain reconciliation step.
- Points are non-transferable — no transfer function is exposed at the contract level.

---

## Off-chain design

**Auth & custody (Privy):**
- Merchant signs in via email/phone — no seed phrase exposure at any point.
- An embedded/server wallet is created per merchant program at onboarding.
- Policies attached at wallet creation: daily spend limits, second-approver requirement on any withdrawal-class transaction.
- The agent can *propose* a treasury action; it cannot execute a withdrawal unilaterally — policy/quorum sits between agent intent and signed transaction.

**Proof-of-personhood (World):**
- One-time Selfie Check liveness credential at customer enrolment, integrated via IDKit.
- Scope is deliberately narrow: confirms a real, unique person, does not collect or store identity data.
- Exists specifically to make signup-bonus farming with disposable numbers uneconomical.

**Agent-callable API (Bazantic):**
- Program state and liability data are wrapped behind an x402/MPP Gateway.
- A Recipe defines when and how an external agent is expected to call it, so a merchant's other tools can query program state without custom API integration work.

---

## Repository structure

```
reserva-ai/
├── README.md            # this file — technical entry point
├── PROJECT_OVERVIEW.md  # product, problem, market, design rationale
├── TECH_STACK.md        # sponsor integration scope, priorities, action items
└── (implementation — in progress)
```

Contracts, API service, and agent implementation are not yet in this repo. This README will be updated with setup/run instructions as each piece lands.

---

## Getting started

> Implementation is in progress for ETHGlobal Online 2026 — the steps below are the target flow, filled in as each piece ships.

### Prerequisites
- Node.js (version TBD once the API/agent service is scaffolded)
- Foundry or Hardhat for contract development
- Arc testnet RPC access + testnet USDC (via Arc faucet)
- Privy app ID/secret ([dashboard.privy.io](https://dashboard.privy.io))
- World ID Sandbox App credentials (access requested — see `TECH_STACK.md`)
- Bazantic account/API credentials

### Environment variables

```bash
# Chain
ARC_RPC_URL=
ARC_CHAIN_ID=
PROGRAM_VAULT_ADDRESS=
USDC_ADDRESS=

# Privy
PRIVY_APP_ID=
PRIVY_APP_SECRET=

# World
WORLD_APP_ID=
WORLD_ACTION_ID=

# Bazantic
BAZANTIC_API_KEY=
```

### Install & run
```bash
# contracts
cd contracts && forge install && forge build

# API / agent service
cd api && npm install && npm run dev
```
*(Commands are illustrative until the corresponding directories exist.)*

---

## Security model

- **No agent-held custody of irreversible actions.** The agent proposes; Privy policy/quorum gates execution.
- **On-chain enforcement of the core invariant.** `issued ≤ funded` is a contract-level check, not an application-layer convention — the API cannot bypass it even if compromised.
- **Liveness at enrolment only.** No biometric data retained beyond the one-time check; scoped narrowly to prevent Sybil-style farming.
- **Non-transferable points.** No transfer path exists in the contract, closing off secondary-market/farming incentives by design.

---

## Status

Pre-hackathon design phase → active build for ETHGlobal Online 2026. See [`TECH_STACK.md`](./TECH_STACK.md) for what's core to the demo, what's optional, and outstanding time-sensitive action items (World ID sandbox access, Bazantic account creation, testnet faucet funding).

## Docs

- [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) — the problem, who it's for, value created, scope boundaries
- [`TECH_STACK.md`](./TECH_STACK.md) — sponsor tracks, core vs. second-tier integrations, action items
