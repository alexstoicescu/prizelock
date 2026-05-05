# PrizeLock — Base Sepolia Readiness

This document explains how a future Base Sepolia deployment of PrizeLock will work. **Nothing has been deployed.** This is preparation only.

Before doing any of the steps below, the project owner must explicitly authorize a testnet deploy. Several intentional guardrails (described below) currently prevent it from happening by accident.

Last updated: 2026-05-05.

## What the testnet deployment will prove

The Base Sepolia deploy proves that the **same Solidity contract** that runs the local demo also works on a real EVM L2 testnet. Specifically:

- `PrizeLockEscrow` deploys to a public chain.
- A funded sponsor on Base Sepolia can `createBounty`, `approve`, and `fundBounty` on a real network with real (testnet) gas.
- A judge wallet on Base Sepolia can `awardWinner` and the prize transfers correctly.
- The frontend can read contract state and submit transactions against a public RPC instead of `127.0.0.1:8545`.
- Block-explorer verification (`yarn verify`) works for the deployed contract.

It does **not** prove anything about real money, real ERC20s, identity, or permanence. The same code runs; the surrounding context is still demo-grade.

## What contracts get deployed

The same two contracts as the local flow, in the same order:

1. **`MockERC20`** — the fake "PRIZE" demo token. Symbol `PRIZE`, 18 decimals, public-mint.
2. **`PrizeLockEscrow`** — the escrow / payout contract.

The deploy script (`packages/hardhat/deploy/00_deploy_prizelock.ts`) also pre-mints **1,000,000 PRIZE to the deployer**. On Base Sepolia this means the deployer wallet starts with one million test-only PRIZE tokens. This is fine for a demo because PRIZE has no value, but it is not how a real token deploy would look.

## Why MockERC20 is still used on Base Sepolia

PrizeLock does **not** plan to bring its own real ERC20 to Base Sepolia, and it does **not** plan to wire to real USDC (or any other live token) yet. The reasons:

- The product proof is the **escrow flow**, not the token. Using `MockERC20` keeps the demo isolated from any real-asset risk and from any real-asset UX (faucets, decimals, allowances) that does not exist on a brand-new testnet wallet.
- `MockERC20.mint` is intentionally permissionless. On a public testnet that means anyone can mint themselves PRIZE to test the bounty flow without needing a faucet for the demo token. This is a feature for a demo and would obviously be removed for any real token.
- The escrow uses `SafeERC20` and a balance-delta check in `fundBounty`, so swapping in a different ERC20 later is a config change, not a contract change.

If and when the project ever wants to use real USDC on Base Sepolia, that is a separate, larger decision — not part of this readiness pass.

## Required environment variables

Already supported by `packages/hardhat/.env.example`:

```bash
ALCHEMY_API_KEY=
ETHERSCAN_V2_API_KEY=
DEPLOYER_PRIVATE_KEY_ENCRYPTED=
```

Notes:

- `ALCHEMY_API_KEY` is **not** required for the Base Sepolia RPC itself — `hardhat.config.ts` uses the public endpoint `https://sepolia.base.org`. It is still useful for any other Alchemy-based chain.
- `ETHERSCAN_V2_API_KEY` is required for `yarn verify --network baseSepolia` against Basescan. The same multichain Etherscan v2 key works.
- `DEPLOYER_PRIVATE_KEY_ENCRYPTED` is the SE-2 encrypted-PK pattern. **Do not paste a raw private key into `.env`.** Instead:
  - `yarn account:generate` to create a new dev wallet, or
  - `yarn account:import` to import an existing PK,
  
  both of which write the encrypted form into `.env` for you.

The frontend's `packages/nextjs/.env.example` (`NEXT_PUBLIC_ALCHEMY_API_KEY`, `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`) already covers what the Wagmi/RainbowKit stack needs to talk to Base Sepolia from the browser. No changes to either `.env.example` are required for this task.

## Network already configured

`packages/hardhat/hardhat.config.ts` already lists Base Sepolia:

```ts
baseSepolia: {
  url: "https://sepolia.base.org",
  accounts: [deployerPrivateKey],
},
```

Chain id `84532`. No additional Hardhat config is required.

## Intentional guardrails currently blocking a testnet deploy

These exist on purpose. **Do not remove them silently** — they are the documented gate for "are we really ready to leave localhost?".

1. **`00_deploy_prizelock.ts` throws on non-local networks.**
   
   ```ts
   if (!["hardhat", "localhost"].includes(hre.network.name)) {
     throw new Error("PrizeLock MVP deploy is local-only. Use the local Hardhat chain.");
   }
   ```
   
   The first explicit step of authorizing a Base Sepolia deploy is loosening this guard, e.g. to `["hardhat", "localhost", "baseSepolia"]`. That edit alone is the "go" signal — it should be a separate, reviewed change, not bundled into a feature commit.

2. **`scaffold.config.ts` only targets the local chain.**
   
   ```ts
   targetNetworks: [chains.hardhat],
   burnerWalletMode: "localNetworksOnly",
   ```
   
   The frontend cannot read or write to Base Sepolia until `targetNetworks` includes `chains.baseSepolia`. The burner-wallet mode is set to disappear on non-local chains, which is correct: nobody should be using a burner wallet to sign Base Sepolia transactions.

3. **The deploy script unconditionally mints 1,000,000 PRIZE to the deployer.** Acceptable on a fake test token, but a future agent should not assume this is safe to copy into any other deploy script.

## Expected commands (when authorized)

This is the sequence a future deploy run will look like. **Do not run these as part of this task.**

```bash
# 1. one-time: encrypt and store the deployer PK
yarn account:import        # or: yarn account:generate

# 2. one-time: fund the deployer with Base Sepolia ETH from a public faucet

# 3. (only when authorized) relax the network guard in
#    packages/hardhat/deploy/00_deploy_prizelock.ts
#    so it allows "baseSepolia" alongside "hardhat" and "localhost".

# 4. deploy
yarn deploy --network baseSepolia

# 5. verify both contracts on Basescan
yarn verify --network baseSepolia

# 6. flip the frontend to Base Sepolia
#    packages/nextjs/scaffold.config.ts:
#      targetNetworks: [chains.baseSepolia],
#    keep burnerWalletMode: "localNetworksOnly" — burner is auto-hidden on testnet.

# 7. run the app
yarn start
```

After step 4, SE-2's deploy task automatically regenerates `packages/nextjs/contracts/deployedContracts.ts` so the frontend has the new addresses and ABIs.

## How to verify the deployed contracts

Two complementary checks:

1. **On-chain verification (Basescan):**
   ```bash
   yarn verify --network baseSepolia
   ```
   This is the `hardhat-deploy` etherscan-verify wrapper. Output should show both `MockERC20` and `PrizeLockEscrow` verified, with their source matched.

2. **Smoke test from the verified explorer page:**
   - Open the `PrizeLockEscrow` page on Basescan.
   - Read `nextBountyId()` — should be `1` immediately after deploy.
   - Read `MAX_METADATA_URI_LENGTH()` — should be `512`.
   - Open `MockERC20` on Basescan.
   - Read `name()` / `symbol()` — should be `PrizeLock Demo Token` / `PRIZE`.
   - Read `balanceOf(deployer)` — should be `1000000000000000000000000` (1,000,000 with 18 decimals).

If both checks pass, the deploy is functioning. The full bounty flow can then be exercised through the live frontend (see next section).

## How to run the frontend against Base Sepolia

After deploy, after `targetNetworks` is set to `[chains.baseSepolia]`, and after `deployedContracts.ts` has been regenerated:

```bash
yarn start
```

Open `http://127.0.0.1:3000`. The page should:

- Show the connect button as usual, but the burner wallet option should be gone (because `burnerWalletMode: "localNetworksOnly"`).
- Connect through MetaMask / Rainbow / Coinbase Wallet on Base Sepolia.
- Read contract state from the deployed `PrizeLockEscrow` on Base Sepolia.
- Submit transactions to Base Sepolia, which take real (testnet) seconds to confirm — the optimistic local-chain "instant confirm" UX will feel slower.

The "Mint fake demo money" button still works because `MockERC20.mint` is permissionless. This is intentional for the demo.

## Known limitations (carry these into any testnet plan)

- **Confirmations are not instant.** All "did it work?" feedback in the UI assumes a near-immediate `refetch`. On Base Sepolia, expect a 2–4 second lag per action; the existing UI handles it but feels noticeably slower.
- **`activeBountyId` lives only in React state.** A page refresh on testnet still drops it; the user retypes the id. This is fine for a small demo but worth knowing.
- **Submissions remain `localStorage`-only.** They never sync between browsers or sessions. On a public demo this means each demo-watcher sees a different submission list unless one machine drives the demo.
- **No reentrancy guard on the escrow.** Today the only token in play is `MockERC20`. If anyone ever wires a different token on Base Sepolia, audit the escrow first.
- **Deploy script always mints 1,000,000 PRIZE to the deployer.** Re-deploying repeatedly accumulates supply on the deployer's wallet on Base Sepolia. Harmless but visible on Basescan.
- **No multichain frontend.** `targetNetworks` is one chain at a time. Switching back to local requires a config flip and a frontend restart.
- **No production hardening checklist beyond what SE-2 ships.** This document is a prep guide, not an audit.

## Rollback plan

If a Base Sepolia deploy goes wrong (wrong constructor args, wrong token address baked into UI, broken verification, etc.), rollback is straightforward because there is no on-chain state worth preserving on a testnet:

1. **In Git:** revert any commit that loosened the deploy-script network guard, the `targetNetworks` change in `scaffold.config.ts`, and the regenerated `packages/nextjs/contracts/deployedContracts.ts`. The repo returns to local-only state. Run `yarn compile && yarn test && yarn next:build` to confirm.

2. **On-chain:** the contracts on Base Sepolia stay deployed but are simply orphaned. There is no need to "destroy" them — they have no real-asset exposure (PRIZE is fake) and the escrow only holds whatever testnet PRIZE was funded into it. If a sponsor's testnet PRIZE is stuck, they can either wait for the deadline and call `refundSponsor`, or just consider it lost on a throwaway testnet.

3. **Re-deploy** with corrected code. New addresses, new `deployedContracts.ts`. No migration needed.

There is intentionally no admin / pause / upgrade path on `PrizeLockEscrow`, which simplifies rollback at the cost of in-place fixes. That trade-off is correct for the MVP.

## What not to do yet (durable rules from `HANDOFF.md`)

- **Do not deploy** until the project owner explicitly says "deploy to Base Sepolia." This document is preparation, not authorization.
- **Do not** wire to real USDC, real DAI, or any live token.
- **Do not** add Safe, Privy, Splits, Biconomy, ZeroDev, Supabase, auth, database, backend, or indexer infrastructure.
- **Do not** add a chain switcher, multichain UI, or environment-specific config beyond the one-line `targetNetworks` change.
- **Do not** restrict `MockERC20.mint`. It is the demo faucet for the fake token, on local *and* on testnet.
- **Do not** add `Ownable` to any contract.
- **Do not** add a smart-account stack, gas sponsor, or paymaster.
- **Do not** change the bounty schema, the state machine, the role checks, or the off-chain submission model.
- **Do not** auto-deploy from CI.

## Files referenced

- `packages/hardhat/hardhat.config.ts` — `baseSepolia` network already configured.
- `packages/hardhat/deploy/00_deploy_prizelock.ts` — local-only guard on line 7.
- `packages/hardhat/contracts/PrizeLockEscrow.sol` — deploys unchanged.
- `packages/hardhat/contracts/MockERC20.sol` — deploys unchanged, public-mint by design.
- `packages/hardhat/.env.example` — already covers `ALCHEMY_API_KEY`, `ETHERSCAN_V2_API_KEY`, `DEPLOYER_PRIVATE_KEY_ENCRYPTED`.
- `packages/nextjs/scaffold.config.ts` — `targetNetworks: [chains.hardhat]` today; one-line flip to `chains.baseSepolia` when authorized.
- `packages/nextjs/.env.example` — already covers `NEXT_PUBLIC_ALCHEMY_API_KEY`, `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`.
