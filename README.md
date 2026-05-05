# PrizeLock

A minimal hackathon bounty payout demo. Sponsors lock prize tokens in escrow, hackers submit projects, a judge picks one winner, and the contract pays the prize directly to the winner's wallet.

> **Local/testnet MVP — not production software.** PrizeLock is a learning / demo project. It runs against a local Hardhat chain. There is no real money anywhere. The "PRIZE" token is a `MockERC20` with no value, no listing, and no bridge. Do not deploy this to mainnet, do not wire it to real USDC, and do not use it to handle real prize money.

## What's working today

The single end-to-end flow that the MVP proves:

1. **Sponsor** creates a bounty (judge address, prize token, amount, deadline, description).
2. **Sponsor** approves the escrow contract and funds the prize in `MockERC20`.
3. **Hackers** add project submissions (off-chain, in the browser).
4. **Judge** picks one winning submission.
5. **Escrow** transfers the full prize to the winner's payout wallet.

State machine: `Created → Funded → Awarded` (terminal) or `Created → Funded → Refunded` (terminal, sponsor-only, after the deadline).

## Stack

- **Scaffold-ETH 2** (Hardhat flavor), Yarn workspaces.
- **Contracts:** Solidity 0.8.30, OpenZeppelin (`IERC20`, `SafeERC20`, `ERC20`).
- **Frontend:** Next.js App Router, RainbowKit, Wagmi, Viem, Tailwind / DaisyUI.
- **Local chain only** today (`hardhat` / `localhost`, chain id `31337`). The deploy script throws on any other network.

## Requirements

- Node.js v20.18.3 or newer
- Yarn (v1 or v4)
- Three free terminal windows
- A modern browser

You do **not** need a real wallet, seed phrase, real ETH, or real money. The app uses a built-in burner wallet that lives only in your browser.

## Quickstart

```bash
# install once
yarn install

# terminal 1 — local Hardhat chain
yarn chain

# terminal 2 — deploy MockERC20 + PrizeLockEscrow, mint 1,000,000 demo PRIZE
yarn deploy

# terminal 3 — start the Next.js app at http://127.0.0.1:3000
yarn start
```

Open `http://127.0.0.1:3000` and follow [`DEMO.md`](./DEMO.md) for the click-by-click walkthrough.

## CI-shaped checks

```bash
yarn ci          # one-shot: yarn compile && yarn test && yarn next:build
yarn compile     # compile contracts
yarn test        # run Hardhat tests (15 passing)
yarn next:build  # production build of the frontend
yarn lint        # frontend + Solidity lint
```

## What's fake vs. what's real

This is the most important thing to understand about the project.

**Fake:**
- The `MockERC20` "PRIZE" token. It exists only on your local Hardhat chain. It has no value.
- `MockERC20.mint` is **intentionally permissionless** — anyone can mint themselves PRIZE. That's the demo faucet for the fake token. Do not treat it as a token contract you would ever deploy to mainnet.
- The 1,000,000 PRIZE auto-minted to the deployer at deploy time.
- The local ETH, the burner wallet, and every transaction hash you see — all local-only.

**Real:**
- `PrizeLockEscrow.sol`. The state machine, the role checks (sponsor-only funding, judge-only awarding, sponsor-only refund after the deadline), the `metadataURI` length cap, the balance-delta check that rejects fee-on-transfer tokens, and the `SafeERC20` transfers — all real Solidity that behaves the same way on any EVM chain.
- The 15 contract tests in `packages/hardhat/test/PrizeLockEscrow.ts` exercise this real logic.

In short: the **token** is fake, the **escrow** is real. The point of the local demo is to prove the escrow behaves correctly before anyone wires up a real token.

## Layout

```
packages/hardhat/contracts/PrizeLockEscrow.sol   # the escrow (≈130 lines)
packages/hardhat/contracts/MockERC20.sol         # fake demo token (public mint by design)
packages/hardhat/test/PrizeLockEscrow.ts         # 15 tests
packages/hardhat/deploy/00_deploy_prizelock.ts   # local-only deploy + 1M PRIZE pre-mint
packages/nextjs/app/page.tsx                     # the entire user-facing UI (single page)
packages/nextjs/contracts/deployedContracts.ts   # auto-generated ABIs after `yarn deploy`
```

## Documentation

- [`DEMO.md`](./DEMO.md) — non-developer walkthrough of the local app (run, faucet, sponsor / hacker / judge flows, payout verification, troubleshooting).
- [`SPEC.md`](./SPEC.md) — product spec, goals, non-goals, MVP scope.
- [`AGENTS.md`](./AGENTS.md) — durable rules for any agent working on the codebase.
- [`CLAUDE.md`](./CLAUDE.md) — Claude Code entry point; defers to `AGENTS.md` and `HANDOFF.md`.
- [`HANDOFF.md`](./HANDOFF.md) — current working state, run instructions, smoke test, known limitations, suggested next tasks.
- [`BASE_SEPOLIA.md`](./BASE_SEPOLIA.md) — preparation guide for a future testnet deploy. **Nothing is deployed yet.** Read before any testnet work.
- [`PRE_TESTNET_CHECKLIST.md`](./PRE_TESTNET_CHECKLIST.md) — go / no-go decision aid for Base Sepolia. **Current status: NO-GO** (local-only by design until the project owner authorizes a deploy).
- [`SECURITY.md`](./SECURITY.md) — secrets and env-handling rules. Read before pushing publicly.
- [`AGENT_LOG.md`](./AGENT_LOG.md) — chronological milestones from agent collaboration.

## Status

- ✅ Local end-to-end flow working in a real browser.
- ✅ 15 Hardhat tests passing; `yarn ci` green.
- ⏸️ No testnet deploy. No mainnet deploy. No real money. By design.

## What this project is **not**

PrizeLock is intentionally narrow. Out of scope until and unless the project owner explicitly asks:

- Auth, user accounts, profiles, login systems
- Databases or backend APIs (Supabase, Postgres, Firebase, etc.)
- Smart-account / account-abstraction stacks: Safe, Privy, Biconomy, ZeroDev
- Payment-splitting tooling (0xSplits)
- Indexers, subgraphs, off-chain workers
- Email, notifications, chat
- Multi-winner, partial payouts, milestones, disputes, fees, multi-judge voting
- Real USDC / DAI / any live token
- Mainnet deployment

## License

PrizeLock contracts are MIT-licensed (`SPDX-License-Identifier: MIT` in source). The wider repo follows Scaffold-ETH 2's licensing for the upstream scaffolding.
