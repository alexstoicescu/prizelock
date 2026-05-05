# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source of truth

The full agent guide lives in `AGENTS.md`. Read it first. The product spec lives in `SPEC.md`. Read it before any product change.

`HANDOFF.md` describes the current working MVP state, how to run it, and how to verify the end-to-end flow.

## What PrizeLock is

A normal-looking hackathon bounty platform where the only crypto piece is the escrow smart contract. The single end-to-end flow that must keep working:

1. Sponsor creates a bounty.
2. Sponsor approves and funds ERC20 prize money into escrow.
3. Hackers add project submissions (off-chain, in-browser only).
4. Judge selects one winner.
5. Escrow releases the full prize to the winner's payout wallet.

## Hard rules (in addition to `AGENTS.md`)

- **Preserve the working local MVP.** Manual browser QA passed, 13 contract tests pass, Next.js build passes. Do not regress these.
- **Do not add new features yet.** No new product code without an explicit ask.
- **Do not change smart contracts** unless there is a clear bug. The contract surface is intentionally tiny.
- **Do not refactor broadly.** Targeted fixes only.
- **Keep submissions off-chain.** Submissions live in `localStorage` under key `prizelock-demo-submissions`. Do not move them on-chain.
- **Keep the app non-crypto-first.** Wallets should only appear in the UI where escrow funding or payout actually requires them.
- **Local-only.** The deploy script throws on any network other than `hardhat` / `localhost`. Do not relax this.
- **Mock ERC20 only.** Never wire real tokens or testnets.

## Explicitly out of scope right now

Do not introduce any of these without an explicit ask, even if they would be "nice":

- Auth, user accounts, profiles
- Databases or backend APIs (Supabase, Postgres, Firebase, etc.)
- Smart-account / account-abstraction stacks: Safe, Privy, Biconomy, ZeroDev
- Payment-splitting tooling: 0xSplits / Splits
- Indexers, subgraphs, off-chain workers
- Email, notifications, chat
- Multi-winner, partial payouts, milestones, disputes, fees, multi-judge voting

The full out-of-scope list is in `AGENTS.md`.

## Working layout

- Contracts: `packages/hardhat/contracts/` (`PrizeLockEscrow.sol`, `MockERC20.sol`)
- Test-only contracts: `packages/hardhat/contracts/test/` (`MockFeeOnTransferERC20.sol`)
- Tests: `packages/hardhat/test/PrizeLockEscrow.ts`
- Deploy script: `packages/hardhat/deploy/00_deploy_prizelock.ts` (also mints 1,000,000 PRIZE to deployer)
- Generated ABIs for the frontend: `packages/nextjs/contracts/deployedContracts.ts`
- Single-page UI: `packages/nextjs/app/page.tsx`

## Common commands

Run from the repo root with Yarn.

```bash
yarn chain        # terminal 1: local Hardhat node
yarn deploy       # terminal 2: deploy MockERC20 + PrizeLockEscrow, mint demo PRIZE
yarn start        # terminal 3: Next.js dev server (http://127.0.0.1:3000)

yarn compile      # compile contracts
yarn test         # run Hardhat tests (13 passing)
yarn next:build   # production build of the frontend
yarn lint
```

## Communication style

The project owner is not a developer. When you describe a change, use plain English, list the exact commands you ran, and call out anything that needs manual browser testing.
