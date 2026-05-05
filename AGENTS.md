# AGENTS.md

Durable instructions for future Codex work on PrizeLock.

## Product

PrizeLock is a barebones hackathon bounty payout MVP.

The only important end-to-end flow is:

1. A sponsor creates a bounty.
2. The sponsor deposits mock ERC20 prize funds into escrow.
3. Hackers submit project links.
4. A judge selects one winner.
5. The winner receives the escrowed prize funds.

Do not turn this into a full hackathon platform. Keep the project small enough that a non-developer can understand the moving parts.

## Hard Rules

- Do not use real money.
- Do not use mainnet.
- Use a local Hardhat chain first.
- Use a mock ERC20 token first.
- Keep code simple and readable.
- Add short comments where a non-developer would need context.
- Avoid complex abstractions, factories, indexing services, databases, auth systems, admin dashboards, or multi-round judging unless explicitly requested.
- Prioritize a working payout flow over polish.
- Do not implement features that are outside `SPEC.md` without asking first.

## Stack

This repo is Scaffold-ETH 2 with the Hardhat flavor.

- Smart contracts: `packages/hardhat`
- Frontend: `packages/nextjs`
- Solidity framework: Hardhat
- Frontend framework: Next.js App Router
- Wallet stack: RainbowKit, Wagmi, Viem
- Package manager: Yarn

## Common Commands

Run these from the repo root.

```bash
yarn chain
yarn deploy
yarn start
yarn compile
yarn test
yarn next:build
yarn lint
```

For local manual testing, use three terminals:

1. `yarn chain`
2. `yarn deploy`
3. `yarn start`

## Implementation Guidance

- Read `SPEC.md` before making product changes.
- For contract work, prefer one small escrow contract plus one mock ERC20 contract.
- Keep contract state easy to inspect from the frontend.
- Prefer explicit names like `sponsor`, `judge`, `winner`, `prizeToken`, and `prizeAmount`.
- Start with one winner per bounty and one payout transaction.
- Store only essential submission data on-chain, such as submitter address and project URL, unless the spec changes.
- In the frontend, build one simple flow before improving layout.
- Use Scaffold-ETH hooks from `packages/nextjs/hooks/scaffold-eth` for contract reads and writes.
- After contract deployment, ABIs are generated into `packages/nextjs/contracts/deployedContracts.ts`.

## Out Of Scope For Now

- Production security audit readiness
- Mainnet or testnet deployment
- Real ERC20 assets
- User accounts beyond wallet connection
- Sponsor or hacker profiles
- Rich project pages
- Team management
- Multiple judges
- Judge voting
- Appeals or disputes
- Milestones
- Protocol fees
- Indexers, databases, or backend APIs
- Email, notifications, or chat

## Communication Style

Assume the project owner is not a developer. Explain important changes in plain English, include exact commands that were run, and call out what should be tested manually.
