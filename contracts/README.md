# contracts

`ProgramVault.sol` — the on-chain vault for Reserva's loyalty programs. It's **multi-tenant** (any merchant self-serves a program via `createProgram`, no per-merchant deploy) and **upgradeable** (UUPS proxy, so a logic fix or new feature ships without migrating existing merchants' data). Each program independently holds USDC, enforces `issued ≤ funded`, settles redemptions, and gates surplus withdrawal behind a two-address approval. Full technical context in [`../README.md`](../README.md); business/product context in [`../PROJECT_OVERVIEW.md`](../PROJECT_OVERVIEW.md); build sequencing in [`../BUILD_PLAN.md`](../BUILD_PLAN.md).

## Architecture in one paragraph

There is **one proxy contract, deployed once, ever, per network.** It holds every merchant's program state. A merchant onboards by calling `createProgram(issuer, secondApprover)` themselves — the caller becomes that program's `owner` — and gets back a `programId` used on every subsequent call (`fund`, `issuePoints`, `createRedemption`, `settleRedemption`, `proposeWithdrawal`, `approveWithdrawal`). All programs share the same `asset` (USDC), fixed at deploy time. A separate `protocolAdmin` role (Reserva's own key, not any merchant's) can push a new implementation via `upgradeToAndCall` without touching merchant data.

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`, `anvil`) — install/update with:
  ```shell
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  ```
- An Arc testnet RPC URL and a funded (via faucet) deployer key, for the testnet-deploy steps below.

## 1. Install dependencies

`lib/` (forge-std, OpenZeppelin, OpenZeppelin Upgradeable) is **gitignored**, not committed — a fresh clone starts without it. Restore it with:

```shell
cd contracts
forge install foundry-rs/forge-std --no-commit
forge install OpenZeppelin/openzeppelin-contracts@v5.7.0 --no-commit
forge install OpenZeppelin/openzeppelin-contracts-upgradeable@v5.4.0 --no-commit
```

`remappings.txt` already points at these paths, so no further config is needed. Pin both OpenZeppelin versions — a newer major could change `OwnableUpgradeable`'s init signature or other APIs `ProgramVault.sol` depends on. Note `@openzeppelin/contracts-upgradeable/` is listed *before* the broader `@openzeppelin/` remapping in `remappings.txt` — order matters here, since the broader prefix would otherwise shadow it.

## 2. Configure environment

```shell
cp .env.example .env
```

Fill in:

| Var | Needed for |
|---|---|
| `ARC_TESTNET_RPC_URL` / `ARC_MAINNET_RPC_URL` | any command that talks to a live network |
| `DEPLOYER_PRIVATE_KEY` | broadcasting the one-time proxy deploy — **testnet key only, never commit it** |
| `USDC_ADDRESS` | baked into the implementation's constructor (`immutable`) — the real Arc testnet/mainnet USDC address, shared by every program |
| `PROTOCOL_ADMIN` | Reserva-side key authorized to upgrade the contract later — **not** a merchant address |
| `PROGRAM_VAULT_PROXY` | upgrades only — the already-deployed proxy address to point at a new implementation |
| `PROTOCOL_ADMIN_PRIVATE_KEY` | upgrades only — must match `PROTOCOL_ADMIN` |

Per-merchant roles (`owner`, `issuer`, `secondApprover`) are **not** env vars anymore — they're arguments to `createProgram`, called at onboarding time, not deploy time. See step 7.

`forge test` doesn't need `.env` at all — it deploys a fresh `MockUSDC` and proxy, and uses `makeAddr(...)` for every role.

## 3. Build

```shell
forge build
```

## 4. Run the test suite

```shell
forge test -vv
```

`test/ProgramVault.t.sol` covers, against a local `MockUSDC` and a real `ERC1967Proxy` deployment:

- **self-serve onboarding**: `createProgram` makes the caller that program's owner with no admin step; reverts on a zero issuer/secondApprover
- **multi-tenancy**: two programs created independently keep separate funded/issued/points balances — funding or issuing in one never touches the other
- calling any program-scoped function with a nonexistent `programId` reverts (`ProgramNotFound`)
- funding raises `funded`, transfers USDC in
- `issuePoints` succeeds within the funded balance, reverts past it (`ExceedsFundedBalance` — the core invariant), reverts for a non-issuer caller
- points have no transfer path (verified by construction — no such function exists to call)
- full redemption flow: issue → `createRedemption` (code hash committed) → `settleRedemption` (correct code) → balances and on-chain USDC transfer all update atomically
- `settleRedemption` reverts on a wrong code and on a second attempt (`AlreadySettled`)
- `createRedemption` reverts if the customer doesn't have enough points
- `unissuedSurplus()` excludes issued (not-yet-redeemed) points
- two-address withdrawal: succeeds when proposer and approver differ, **reverts when the approver is the proposer** (`NotSecondApprover` — the on-chain half of the demo's policy-blocking moment), reverts past `unissuedSurplus`, reverts with no pending withdrawal
- campaign config is per-program-owner-only
- **upgradeability**: upgrading to a new implementation preserves every program's existing state and makes new logic live; only `protocolAdmin` can trigger an upgrade, any other caller reverts

Useful variants:

```shell
forge test -vvvv --match-test test_withdrawal_revertsWhenApproverIsProposer   # trace one test in full
forge test --gas-report                                                       # per-function gas cost
forge coverage                                                                 # line/branch coverage
```

## 5. Local end-to-end sanity check (anvil)

Before spending testnet gas, exercise the real deploy script against a local chain with a mock USDC:

```shell
# terminal 1
anvil

# terminal 2 — anvil's default funded key doubles as protocol admin for this smoke test
export PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export ADMIN=$(cast wallet address --private-key $PK)

# deploy a throwaway ERC20 to stand in for USDC
MOCK_USDC=$(forge create test/mocks/MockUSDC.sol:MockUSDC \
  --rpc-url http://127.0.0.1:8545 --private-key $PK --broadcast --json | jq -r .deployedTo)

# one-time proxy deploy
USDC_ADDRESS=$MOCK_USDC PROTOCOL_ADMIN=$ADMIN DEPLOYER_PRIVATE_KEY=$PK \
  forge script script/DeployProgramVault.s.sol:DeployProgramVault \
  --rpc-url http://127.0.0.1:8545 --broadcast --private-key $PK
```

Then work through the manual `cast` walkthrough in step 7 against this local deployment (swap `arc_testnet` for `http://127.0.0.1:8545`), starting with `createProgram` since there's no merchant onboarded yet.

## 6. Deploy to Arc testnet

This happens **once, ever, per network** — not per merchant.

```shell
forge script script/DeployProgramVault.s.sol:DeployProgramVault \
  --rpc-url arc_testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

`arc_testnet` / `arc_mainnet` are RPC aliases defined in `foundry.toml`, resolved from `ARC_TESTNET_RPC_URL` / `ARC_MAINNET_RPC_URL`. The script logs the **proxy** address (the one to use everywhere) and the implementation address separately — record the proxy address in `../README.md`'s contracts table.

### Verify on the block explorer (once Arc's explorer/API is known)

Verify both the implementation and the proxy:

```shell
forge verify-contract <implementation_address> src/ProgramVault.sol:ProgramVault \
  --chain <arc_chain_id> \
  --constructor-args $(cast abi-encode "constructor(address)" $USDC_ADDRESS)

forge verify-contract <proxy_address> lib/openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy \
  --chain <arc_chain_id> \
  --constructor-args $(cast abi-encode "constructor(address,bytes)" <implementation_address> \
    $(cast calldata "initialize(address)" $PROTOCOL_ADMIN))
```

## 7. Self-serve merchant onboarding (`cast`)

No deploy step per merchant — just a call to the already-deployed proxy:

```shell
export VAULT=<proxy_address>
export RPC=arc_testnet   # or http://127.0.0.1:8545 for the anvil walkthrough

# merchant's own key calls this directly — msg.sender becomes the program owner
cast send $VAULT "createProgram(address,address)" $ISSUER_ADDRESS $SECOND_APPROVER_ADDRESS \
  --rpc-url $RPC --private-key $MERCHANT_PRIVATE_KEY

# programId is emitted in ProgramCreated — or read it back:
cast call $VAULT "programCount()(uint256)" --rpc-url $RPC
```

## 8. Post-deploy manual verification (`cast`)

This is the Day 1 exit criteria from `BUILD_PLAN.md`, extended for multi-tenancy: fund/issue/redeem all callable against the live deployed contract for a given `programId`, not just in `forge test`.

```shell
export PROGRAM_ID=0   # from createProgram above

# fund — approve then fund (amounts in USDC's 6 decimals)
cast send $USDC_ADDRESS "approve(address,uint256)" $VAULT 1000000000 --rpc-url $RPC --private-key $MERCHANT_PRIVATE_KEY
cast send $VAULT "fund(uint256,uint256)" $PROGRAM_ID 100000000 --rpc-url $RPC --private-key $MERCHANT_PRIVATE_KEY
cast call $VAULT "programs(uint256)" $PROGRAM_ID --rpc-url $RPC

# issue — must be sent from that program's issuer key
cast send $VAULT "issuePoints(uint256,address,uint256)" $PROGRAM_ID <customer_address> 40000000 --rpc-url $RPC --private-key $ISSUER_PRIVATE_KEY
cast call $VAULT "pointsOf(uint256,address)(uint256)" $PROGRAM_ID <customer_address> --rpc-url $RPC

# redeem — code hash committed on-chain, plaintext code shown to the customer off-chain
CODE_HASH=$(cast keccak "ABC123")
cast send $VAULT "createRedemption(uint256,address,uint256,bytes32)" $PROGRAM_ID <customer_address> 40000000 $CODE_HASH --rpc-url $RPC --private-key $ISSUER_PRIVATE_KEY
cast send $VAULT "settleRedemption(uint256,uint256,string)" $PROGRAM_ID 0 "ABC123" --rpc-url $RPC --private-key $ISSUER_PRIVATE_KEY

# the policy-blocking demo moment — propose from the program owner, then try to
# approve from the SAME key and watch it revert with NotSecondApprover
cast send $VAULT "proposeWithdrawal(uint256,address,uint256)" $PROGRAM_ID <recipient> 10000000 --rpc-url $RPC --private-key $MERCHANT_PRIVATE_KEY
cast send $VAULT "approveWithdrawal(uint256)" $PROGRAM_ID --rpc-url $RPC --private-key $MERCHANT_PRIVATE_KEY   # reverts on purpose
cast send $VAULT "approveWithdrawal(uint256)" $PROGRAM_ID --rpc-url $RPC --private-key $SECOND_APPROVER_PRIVATE_KEY   # succeeds
```

## 9. Upgrading

Only `PROTOCOL_ADMIN` can do this — it deploys a new implementation and repoints the existing proxy at it, with every merchant's program data intact:

```shell
USDC_ADDRESS=$USDC_ADDRESS PROGRAM_VAULT_PROXY=$VAULT \
  forge script script/UpgradeProgramVault.s.sol:UpgradeProgramVault \
  --rpc-url arc_testnet --broadcast --private-key $PROTOCOL_ADMIN_PRIVATE_KEY
```

**Storage-layout discipline** (no automated check is wired up for this hackathon build — care by hand):
- Only *append* new state variables to `ProgramVault`, always after existing ones, and consume the trailing `uint256[50] private __gap;` slots when you do (shrink the gap array by however many slots you add).
- Never reorder, retype, or delete existing state variables.
- Never add a new `constructor` parameter that changes what earlier programs assumed about `asset` — it's `immutable` and baked into whichever implementation is currently active.

## Troubleshooting

- **`forge: command not found`** — `foundryup` didn't put `~/.foundry/bin` on `PATH`; open a new shell or `source ~/.bashrc`/`~/.zshrc`.
- **Compiler errors immediately after cloning** — `lib/` is empty; run step 1.
- **Import resolution picks the wrong OpenZeppelin path** — check `@openzeppelin/contracts-upgradeable/=...` comes before the plain `@openzeppelin/=...` line in `remappings.txt`.
- **`ExceedsFundedBalance` on an issuance you expect to succeed** — check that program's `funded` vs. `issued` (`programs(programId)`); the vault is doing exactly what it's supposed to.
- **`NotSecondApprover` on a withdrawal you expect to succeed** — `approveWithdrawal` must be sent from a *different* key than the one that called `proposeWithdrawal`, for that same `programId`; this is enforced on purpose, not a bug.
- **`ProgramNotFound`** — double check the `programId` — it's whatever `createProgram` returned/emitted, not assumed to be `0` once more than one program exists.
- **Upgrade reverts with no reason** — confirm you're broadcasting from `PROTOCOL_ADMIN`'s key, not a merchant's; `_authorizeUpgrade` is `onlyOwner`-gated to that one address.
- **`forge script ... --broadcast` hangs or fails on Arc** — confirm `ARC_TESTNET_RPC_URL` is reachable (`cast chain-id --rpc-url arc_testnet`) and the relevant key holds native gas token from the faucet.

## Layout

- `src/ProgramVault.sol` — the multi-tenant, UUPS-upgradeable vault: self-serve program creation, fund, issue, redeem, campaign config, two-approver withdrawal
- `test/ProgramVault.t.sol` — unit tests, including multi-tenancy isolation, the core `issued ≤ funded` invariant, the second-approver block, and upgrade behavior
- `test/mocks/MockUSDC.sol` — test-only stand-in for USDC
- `test/mocks/ProgramVaultV2Mock.sol` — test-only stand-in for a future upgrade, used to prove `upgradeToAndCall` preserves state
- `script/DeployProgramVault.s.sol` — one-time implementation + proxy deploy
- `script/UpgradeProgramVault.s.sol` — deploys a new implementation and upgrades the existing proxy
