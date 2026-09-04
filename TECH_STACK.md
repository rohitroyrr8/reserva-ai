# Tech Stack & Sponsor Integrations

Reference for the technology and infrastructure Reserva is built on, split by how critical each piece is to the demo. Core = the demo fails without it. Second tier = one bounty each, must drop cleanly if time runs out.

---

## Core — the demo fails without these

### Circle / Arc

| Piece | Role |
|---|---|
| Arc L1 (EVM) | Vault, campaign logic, settlement contracts |
| USDC on Arc | The funded balance and every payout |
| Testnet → mainnet | Build and demo on testnet faucet funds, then deploy to mainnet |

**Optional if time allows:**
- App Kits for the payment/treasury flow
- Paymaster, so the merchant never holds gas

### Privy

| Piece | Role |
|---|---|
| Auth SDK | Email/phone sign-in, no seed phrase |
| Embedded/server wallets | One per merchant program |
| Policies | Spend limits, second-approver on withdrawal |
| Key quorum / signers | Backs the approval flow |
| Funding/onramp | Likely mocked |

**Policies are what this track actually scores.** A policy that never fires proves nothing — the demo must show one *blocking* a transaction, not just existing in config.

Funding/onramp can be mocked without losing eligibility, but wallet creation and policy enforcement must stay live and real.

---

## Second tier — one bounty each, drop cleanly if needed

### World

| Piece | Role |
|---|---|
| Selfie Check | Liveness check at enrolment |
| IDKit | Integration SDK |
| World ID Sandbox App | Access requested — **not instant, apply early** |
| Feedback document | Required deliverable — keep running notes from hour one |

### Bazantic

| Piece | Role |
|---|---|
| x402 / MPP Gateway | Wraps the liability/program API |
| Recipe | Describes when and how an agent should call the gateway |
| Account | Create early so the username is ready for submission |

---

## Action items with a clock on them

- [ ] Request World ID Sandbox App access **today** — approval likely isn't instant
- [ ] Start the World feedback doc now, log notes as you go rather than reconstructing later
- [ ] Create the Bazantic account early to lock in the username before submission
- [ ] Get testnet USDC from the Arc faucet before building against the vault
- [ ] Decide early whether Paymaster/App Kits are in scope, or explicitly cut

---

## Mapping to Reserva's architecture

From [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md):

- **Program vault / campaign logic / settlement** → Arc L1 + USDC (Circle/Arc)
- **Custody through policy, not seed phrase** → Privy embedded wallets + policy layer
- **Human approval on irreversible actions** → Privy spend limits + second-approver/key quorum
- **Liveness check at enrolment** → World Selfie Check + IDKit
- **Agent-readable service layer** → Bazantic x402/MPP Gateway + Recipe
