# Web UI plan & wireframes — Reserva

Chat is the operating interface. The web UI exists only where a browser is unavoidable: taking money in, proving a person is real, and (optionally) typing a counter code. This file is the page plan for Days 2, 5, and 6 of `BUILD_PLAN.md`. It is not a merchant dashboard.

**Stack:** Next.js + shadcn, mobile-first. Merchants and customers arrive from Telegram on a phone.

**Tone:** a receipt, not a SaaS app. Calm, tabular, one number that matters — funded vs issued. No seed phrases, no chain names, no wallet addresses in the happy path.

---

## What is a page, and what is not

| Route | Who | Why a browser | Build day | Cut? |
|---|---|---|---|---|
| `/` | Merchant, judges | First impression + one CTA into onboard | Day 2 | Thin; do not grow into a marketing site |
| `/onboard` | Merchant | Sign-in, wallet + policy, fund USDC | Day 2 | **Never cut** |
| `/enroll/[code]` | Customer | World ID Selfie Check | Day 5 | Cut only if World ID is cut |
| `/redeem` | Merchant at the counter | Type the one-time code if chat is awkward with a queue | Day 5 | Optional; bot command is the default |
| `/withdraw` | Merchant, demo | The policy-block money shot | Day 6 | Keep tiny; do not turn into a treasury console |

Not building: a home dashboard, campaign settings, customer list, transaction explorer, wallet backup, chain switcher, or anything the bot already does.

After onboard, the UI's job is to hand the merchant to Telegram and get out of the way.

```
Telegram ── "join" ──► /enroll/[code] ──► back to Telegram
Telegram ── "redeem" ─► code in chat  ──► bot settles
                 └────► /redeem        ──► same settle API

Browser  ── first visit ──► / ──► /onboard ──► Telegram
Demo     ── money shot ────► /withdraw (blocked by policy)
```

---

## Design direction

- **Purpose:** move money into escrow once, verify a person once, settle a code if needed.
- **Audience:** café / salon / gym owners who will never be crypto users; customers who should not learn a chain was involved.
- **Scan order:** the funded/issued figure first, the next action second, everything else last.
- **Memorable detail:** a split bar — funded on the left, issued on the right, unissued surplus as the gap. Reuse it on onboard-done, withdraw, and nowhere else. It is the product.
- **Palette (when we build):** paper background, ink text, one status color (funded / blocked / settled). Tabular figures. No purple gradients, no hero blobs, no nested cards.

---

## Shared chrome

Every page uses the same thin frame. No sidebar. No app nav.

```
┌─────────────────────────────────────────┐
│  Reserva                          Arc   │   ← wordmark left; network pill only
│                                         │     in a small footer, not the header
│           (page content)                │
│                                         │
│  ─────────────────────────────────────  │
│  Reserva holds the money. Chat runs it. │
└─────────────────────────────────────────┘
```

Mobile: same layout, 16px side padding, primary button full-width and thumb-reachable. Desktop: content column ~420px, centered. These are one-job pages, not wide layouts.

---

## 1. `/` — Landing

One viewport. Judges and first-time merchants. Does not explain the architecture.

```
┌─────────────────────────────────────────┐
│  Reserva                                │
│                                         │
│  Loyalty points you have                │
│  actually set money aside for.          │
│                                         │
│  Fund a program in USDC.                │
│  Issue only what you hold.              │
│  Redeem at the counter in seconds.      │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Open a program                   │  │  → /onboard
│  └───────────────────────────────────┘  │
│                                         │
│  Already live? Message @reserva_bot     │
│                                         │
│  Funded $250 · Issued $40 · Open $210   │  ← static example of the split bar
│  ████████████████░░░░                   │     so the thesis is visible
│                                         │     before anyone signs in
└─────────────────────────────────────────┘
```

**States:** none that matter. This page does not load program data.

**Do not add:** feature grids, sponsor logos in the hero, "how it works" carousels, waitlists.

---

## 2. `/onboard` — Merchant, once

Four sequential steps in one route. Back is allowed between 1→2→3; after fund, no back. Query `?step=` is fine for us; the merchant should just see a 1 / 2 / 3 / done marker.

Exit criteria from the plan: a fresh sign-in produces a funded, policy-attached wallet with no manual steps outside this page.

### Step 1 — Sign in

```
┌─────────────────────────────────────────┐
│  Reserva                    1 · 2 · 3   │
│                                         │
│  Sign in                                │
│  Email or phone. No seed phrase.        │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Continue with email              │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Continue with phone              │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Privy modal handles the OTP.           │
│  We never show a wallet connect sheet.  │
└─────────────────────────────────────────┘
```

**States**

| State | What they see |
|---|---|
| Default | Two buttons |
| Privy open | Their modal, not ours |
| Error | "Couldn't sign in. Try again." + retry. No error codes. |

### Step 2 — Wallet + policy (automatic)

Fires on first login. Merchant waits. We name what was created in plain language.

```
┌─────────────────────────────────────────┐
│  Reserva                    1 · 2 · 3   │
│                                         │
│  Setting up the program                 │
│                                         │
│  ●  Signed in                           │
│  ◐  Creating the business wallet…       │
│  ○  Attaching spend rules               │
│                                         │
│  ─ once ready ─                         │
│                                         │
│  Ready.                                 │
│                                         │
│  Daily spend limit          $50         │
│  Withdrawals                need a      │
│                             second OK   │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Continue                         │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Copy rules:** say "business wallet" and "spend rules," never "embedded wallet," "policy engine," or an address. Address can live behind a "Details" disclosure for the demo, collapsed by default.

**States**

| State | What they see |
|---|---|
| Working | Checklist animating through the three lines |
| Ready | Checklist complete + the two policy facts + Continue |
| Fail | "Setup didn't finish. Retry." — same page, no support form |

### Step 3 — Fund

This is the only money-in screen. Presets plus custom. The split bar updates live as they type.

```
┌─────────────────────────────────────────┐
│  Reserva                    1 · 2 · 3   │
│                                         │
│  Fund the program                       │
│  This amount is the ceiling on          │
│  everything you can promise.            │
│                                         │
│  [ $100 ]  [ $250 ]  [ $500 ]           │
│                                         │
│  Custom                                 │
│  ┌─────────────────────────┐            │
│  │  250                 USDC│            │
│  └─────────────────────────┘            │
│                                         │
│  After this deposit                     │
│  Funded                 $250            │
│  Issued                 $0              │
│  Can still issue        $250            │
│  ████████████████████                   │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Fund program                     │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Testnet: funding may be a mocked       │
│  faucet transfer. Same screen either    │
│  way — do not fork the UI.              │
└─────────────────────────────────────────┘
```

**States**

| State | What they see |
|---|---|
| Idle | Presets + custom empty |
| Signing | Button → "Confirming…" disabled |
| Success | Advance to done (no toast-only success) |
| Rejected | "The deposit didn't go through. Nothing moved." + retry |
| Insufficient | "Not enough USDC in the wallet." + retry / smaller amount |

### Done — handoff to Telegram

```
┌─────────────────────────────────────────┐
│  Reserva                         Live   │
│                                         │
│  The program is funded.                 │
│                                         │
│  Funded                 $250            │
│  Issued                 $0              │
│  Can still issue        $250            │
│  ████████████████████                   │
│                                         │
│  Everything else happens in Telegram.   │
│                                         │
│  Message @reserva_bot                   │
│  “Start 5% cashback for the next        │
│   month.”                               │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Open Telegram                    │  │  → t.me/reserva_bot
│  └───────────────────────────────────┘  │
│                                         │
│  Need to pull unused money out?         │
│  Withdraw  →  /withdraw                 │  ← secondary, for Day 6 demo
└─────────────────────────────────────────┘
```

If they revisit `/onboard` while already funded, skip to this done state. Do not make them fund again.

---

## 3. `/enroll/[code]` — Customer, once

Opened from a Telegram link. The `[code]` is the enrolment token the bot already issued, not a wallet, not a World ID.

No sign-in. No Reserva account. One job: Selfie Check, then tell them to go back to chat.

```
┌─────────────────────────────────────────┐
│  Reserva                                │
│                                         │
│  Join Café Noor's loyalty               │
│                                         │
│  One selfie to confirm you're a         │
│  person. We don't keep the photo        │
│  and we don't take an ID.               │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Take a selfie                    │  │  → IDKit modal
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Success

```
┌─────────────────────────────────────────┐
│  Reserva                                │
│                                         │
│  You're in.                             │
│                                         │
│  Go back to Telegram.                   │
│  Points land when you visit.            │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Back to Telegram                 │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**States**

| State | What they see |
|---|---|
| Loading code | Blank + spinner. Invalid/expired → "This link expired. Ask the bot for a new one." |
| Ready | Copy above + Take a selfie |
| IDKit open | Their modal |
| Verifying | "Checking…" then POST `/api/enroll` |
| Already enrolled | "You're already in. Back to Telegram." |
| Fail / cancel | "That didn't work. Try the selfie again." Never dump a World error blob |

**Copy rules:** never say World ID, biometric, Sybil, or blockchain on this page. "Selfie" and "person" are enough.

---

## 4. `/redeem` — Counter, optional

Default path is the merchant typing the code into the bot. This page exists for the "phone in one hand, customer in front of me" moment, and as a fallback if the bot is slow during the demo.

```
┌─────────────────────────────────────────┐
│  Reserva                     Redeem     │
│                                         │
│  One-time code                          │
│                                         │
│  ┌──┬──┬──┬──┬──┬──┐                    │
│  │  │  │  │  │  │  │                    │
│  └──┴──┴──┴──┴──┴──┘                    │
│                                         │
│  ─ after lookup ─                       │
│                                         │
│  400 points                             │
│  $4.00 from the vault                   │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Settle                           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Settled

```
┌─────────────────────────────────────────┐
│  Reserva                                │
│                                         │
│  Settled                                │
│                                         │
│  $4.00 released                         │
│  400 points closed                      │
│                                         │
│  Funded now             $246            │
│  Issued now             $36             │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Next code                        │  │  → clear, stay on /redeem
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**States**

| State | What they see |
|---|---|
| Empty | Six boxes, Settle disabled |
| Looking up | Boxes filled, "Checking…" |
| Valid | Amount + Settle |
| Invalid / used | "That code isn't valid." Clear the boxes |
| Settling | Button → "Settling…" |
| Settled | Receipt + Next code |
| Policy / chain fail | "Settlement didn't go through. The points are still there." |

Merchant auth: same Privy session as onboard. If they are signed out, a compact sign-in on this page — not a bounce through the full onboard wizard.

---

## 5. `/withdraw` — Policy block (Day 6 money shot)

Not a treasury product. A single form whose job in the demo is to **fail on purpose** when the amount exceeds the daily limit or lacks the second approver.

```
┌─────────────────────────────────────────┐
│  Reserva                     Withdraw   │
│                                         │
│  Unused money only.                     │
│  Anything already promised stays put.   │
│                                         │
│  Funded                 $250            │
│  Issued                 $40             │
│  Can withdraw           $210            │
│  ████████░░░░                           │
│                                         │
│  Amount                                 │
│  ┌─────────────────────────┐            │
│  │  80                  USDC│            │
│  └─────────────────────────┘            │
│                                         │
│  Daily limit            $50             │
│  This request           over the limit  │  ← appears when amount > limit
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Request withdrawal               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Blocked — the shot we record

```
┌─────────────────────────────────────────┐
│  Reserva                                │
│                                         │
│  Blocked                                │
│                                         │
│  The spend rule stopped this.           │
│  Nothing left the vault.                │
│                                         │
│  Asked                  $80             │
│  Daily limit            $50             │
│                                         │
│  Funded                 $250            │
│  Issued                 $40             │
│  (unchanged)                            │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Try a smaller amount             │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

A policy that never fires proves nothing. This page is designed so the blocked state is the primary visual, not a red toast on an otherwise-happy form.

If we also demo the second-approver path: same page, amount under the daily limit, submit → "Waiting for the second approval" → a second device/session hits Approve, or we show the pending row and refuse a same-key confirm.

```
┌─────────────────────────────────────────┐
│  Waiting for a second OK                │
│                                         │
│  $40 to the business wallet             │
│  Proposed just now                      │
│                                         │
│  This device can't approve its          │
│  own request.                           │
└─────────────────────────────────────────┘
```

---

## Component inventory (shadcn, keep it small)

Build only what the pages above need.

| Piece | Used on | Notes |
|---|---|---|
| `Button` | every page | One primary, full-width on mobile |
| `Input` | fund amount, withdraw amount | Suffix "USDC" |
| `InputOTP` | `/redeem` | Six digits / chars |
| Privy `login` modal | `/onboard`, `/redeem` if signed out | Do not restyle into a custom wallet UI |
| IDKit widget | `/enroll/[code]` | Their modal |
| Split bar (`FundedBar`) | landing (static), onboard done, withdraw | The one custom visual |
| Step dots | `/onboard` | 1 · 2 · 3, not a sidebar stepper |
| Status word | done / settled / blocked | Live · Settled · Blocked — not badges everywhere |

No data table, no chart library, no command palette, no toast-as-architecture.

---

## Copy bank (use these, don't improvise crypto)

| Instead of | Say |
|---|---|
| Embedded wallet | Business wallet |
| Policy / policy engine | Spend rule / spend limit |
| Seed phrase / private key | (don't mention) |
| On-chain / Arc / transaction hash | (footer only, or Details disclosure) |
| World ID / proof of personhood | A selfie to confirm you're a person |
| Liability | What you still owe / issued |
| Unissued surplus | Can still issue / can withdraw |
| Issuer / signer | (never in UI) |

---

## Mapping onto the demo script

| Demo beat | Screen | What the camera sees |
|---|---|---|
| 1. Onboard + fund (~20s) | `/onboard` steps 1→done | Sign-in, checklist, $250 funded, Open Telegram |
| 2. Campaign via chat | Telegram | Not web |
| 3. Customer enrols (~20s) | `/enroll/[code]` | Selfie → You're in |
| 4. Earn + redeem (~30s) | Telegram, or `/redeem` if cleaner on camera | Settled receipt |
| 5. Funded vs issued (~15s) | Telegram, or the bar on `/withdraw` | The split bar |
| 6. Policy block (~30s) | `/withdraw` → Blocked | Asked $80 / limit $50 / nothing moved |
| 7. Bazantic | not a UI page | Skip or a one-line footer on `/` |

---

## Build order (do not start extra pages)

1. **Day 2** — `/` + `/onboard` (all four steps). Hard-code policy copy ($50 / second OK). Mock the faucet if live funding slips.
2. **Day 5** — `/enroll/[code]`. Add `/redeem` only if the bot-typed code feels clumsy in rehearsal.
3. **Day 6** — `/withdraw` blocked state. Polish type, spacing, and the split bar. Do not add navigation.

If the week compresses: ship `/onboard` + `/enroll/[code]` + `/withdraw`. Landing can be a redirect to onboard. `/redeem` drops first.
