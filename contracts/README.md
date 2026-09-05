# contracts

`ProgramVault.sol` — the on-chain vault for Reserva's loyalty programs. Full technical context in [`../README.md`](../README.md); business/product context in [`../PROJECT_OVERVIEW.md`](../PROJECT_OVERVIEW.md).

## Setup

```shell
cp .env.example .env   # fill in RPC URL, deployer key, constructor args
```

## Build & test

```shell
forge build
forge test -vv
```

## Deploy

```shell
forge script script/DeployProgramVault.s.sol:DeployProgramVault \
  --rpc-url arc_testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

`arc_testnet` / `arc_mainnet` are RPC aliases defined in `foundry.toml`, resolved from `ARC_TESTNET_RPC_URL` / `ARC_MAINNET_RPC_URL`.

## Layout

- `src/ProgramVault.sol` — the vault: fund, issue, redeem, campaign config, two-approver withdrawal
- `test/ProgramVault.t.sol` — unit tests, including the core `issued ≤ funded` invariant and the second-approver block
- `test/mocks/MockUSDC.sol` — test-only stand-in for USDC
- `script/DeployProgramVault.s.sol` — deploy script
