# PrizeLock Handoff

Single source of truth for handoffs between Codex and Claude Code. Keep this short, current, and honest.

Last updated: 2026-05-05.

## Project summary

PrizeLock is a hackathon bounty payout app. The whole product is one flow:

1. Sponsor creates a bounty.
2. Sponsor approves and funds ERC20 prize money into escrow.
3. Hackers add project submissions (off-chain, browser-only).
4. Judge picks one winner.
5. Escrow releases the full prize to the winner's payout wallet.

The app should look like a normal hackathon bounty platform. The smart contract is only the escrow / payout layer. Do not make it more crypto-first than it already is. Wallets should appear in the UI only where escrow funding or payout actually requires them.

## Stack

- **Scaffold-ETH 2** (Hardhat flavor), Yarn workspaces.
- **Contracts:** Solidity 0.8.30, OpenZeppelin (`IERC20`, `SafeERC20`, `ERC20`).
- **Frontend:** Next.js App Router, RainbowKit, Wagmi, Viem, Tailwind/DaisyUI.
- **Local chain only** for now (`hardhat` / `localhost`, chain id 31337). The deploy script throws on any other network.

## Current verified working state (2026-05-05)

- `yarn compile` — passes.
- `yarn test` — **15 passing** (was 13; added 2 for `metadataURI` length validation).
- `yarn next:build` — passes (one upstream `@coinbase/cdp-sdk` "Critical dependency" warning is known and harmless).
- Manual browser QA at `http://127.0.0.1:3000` previously confirmed end-to-end:
  mint fake PRIZE → create bounty → approve escrow → fund → add off-chain submission → select winner → release prize → status `Awarded` → payout tx hash visible → balances update.

## Core user flow (and the code paths behind it)

| Step | UI button | Contract call |
|---|---|---|
| Mint demo token | "Mint fake demo money" | `MockERC20.mint(connectedAddress, 10_000e18)` |
| Create bounty | "Create bounty" | `PrizeLockEscrow.createBounty(judge, token, amount, deadline, metadataURI)` |
| Approve escrow | "Approve prize escrow" | `MockERC20.approve(escrow, amount)` |
| Fund escrow | "Fund prize escrow" | `PrizeLockEscrow.fundBounty(bountyId)` |
| Add submission | "Add project submission" | none (`localStorage` only) |
| Release prize | "Release prize" | `PrizeLockEscrow.awardWinner(bountyId, winner)` |
| Refund sponsor | "Refund sponsor" | `PrizeLockEscrow.refundSponsor(bountyId)` (after deadline) |

State machine: `Created → Funded → Awarded` (terminal) or `Created → Funded → Refunded` (terminal).

## Important files

- `SPEC.md` — product spec, non-goals, MVP scope. Read before any product change.
- `AGENTS.md` — durable agent guide, hard rules, stack, commands. Read first.
- `CLAUDE.md` — Claude Code entry point; defers to `AGENTS.md` and this file.
- `DEMO.md` — non-developer walkthrough of the local app.
- `BASE_SEPOLIA.md` — preparation guide for a future testnet deploy. Read before any testnet work; **nothing is deployed yet**.
- `AGENT_LOG.md` — chronological milestones from this collaboration.
- `packages/hardhat/contracts/PrizeLockEscrow.sol` — escrow contract.
- `packages/hardhat/contracts/MockERC20.sol` — fake demo token, **intentionally public-mintable**.
- `packages/hardhat/contracts/test/MockFeeOnTransferERC20.sol` — test-only fee token.
- `packages/hardhat/test/PrizeLockEscrow.ts` — 15 tests, all passing.
- `packages/hardhat/deploy/00_deploy_prizelock.ts` — local-only deploy + 1,000,000 PRIZE demo mint.
- `packages/nextjs/app/page.tsx` — entire user-facing UI.
- `packages/nextjs/contracts/deployedContracts.ts` — auto-generated ABIs after `yarn deploy`.
- `packages/nextjs/scaffold.config.ts` — `targetNetworks: [chains.hardhat]`, burner-wallet local only.

## Commands

Run from the repo root.

```bash
# three-terminal local run
yarn chain        # terminal 1: local Hardhat node
yarn deploy       # terminal 2: deploy MockERC20 + PrizeLockEscrow, mint 1M demo PRIZE
yarn start        # terminal 3: Next.js at http://127.0.0.1:3000

# CI-shaped checks
yarn compile
yarn test
yarn next:build
yarn lint

# One-shot aggregate of compile + test + next:build
yarn ci
```

## Manual browser QA checklist

Walk through this whenever the contract or `page.tsx` changes. Two browser profiles make role-switching easier; one wallet playing all roles also works.

1. Open `http://127.0.0.1:3000`. The yellow "Local demo money only" notice shows.
2. Connect a burner wallet. Network row reads `Hardhat`.
3. Use the **Faucet** button (bottom-left) to send local ETH to the burner wallet.
4. Click **Mint fake demo money** → Wallet PRIZE balance jumps by 10,000.
5. Fill the Sponsor form (use **Mine** for judge, **Demo token** for prize token, default 1000 prize, default 1h deadline). Click **Create bounty**. The "Load bounty ID" field auto-populates.
6. Click **Approve prize escrow** → "Escrow allowance" matches the prize amount.
7. Click **Fund prize escrow** → Bounty Status flips to **Funded**. Wallet PRIZE drops by the prize amount.
8. Add a Hacker submission (use **Mine** for payout wallet). Card appears under Judge.
9. Connected wallet must be the judge. Pick the submission's radio. Click **Release prize**.
10. Verify: green "Winner selected and paid" box appears with payout tx hash. Bounty Status reads **Awarded**. Winner's PRIZE balance equals the prize amount.
11. Optional: create a second bounty, fund it, do not award, advance past deadline (or wait), click **Refund sponsor**. Status flips to **Refunded**.
12. Try a `metadataURI` longer than 512 bytes. Expect a revert ("Metadata URI too long") — this is the new pre-testnet hardening.

## Known limitations (intentional, do not "fix" without an ask)

- **Single bounty in the UI.** No list view; only one bounty loaded by id at a time.
- **Submissions are localStorage-only** under `prizelock-demo-submissions`. Different browsers / devices / incognito do not share them.
- **`activeBountyId` is persisted to `localStorage`** under `prizelock-demo-active-bounty-id`, so a refresh keeps the active bounty loaded. Clearing site data still drops it.
- **Deploy script always mints 1,000,000 PRIZE to the deployer.**
- **`MockERC20.mint` is unrestricted.** Intentional — it is the demo faucet for fake tokens. **Do not add `Ownable` to `MockERC20`.**
- **No reentrancy guard on the escrow.** Safe today: only `MockERC20` is in play and the contract follows checks-effects-interactions. Revisit only if/when arbitrary tokens are supported.
- **Local-only.** The deploy script throws on any non-local network.
- **`metadataURI` capped at 512 bytes** (added 2026-05-05).
- **Burner wallets need local ETH for gas.** UX is hinted in the Wallet card.

## Product constraints (durable rules)

- Local demo only for now. No mainnet, no testnet, no real money.
- Mock ERC20 only.
- App must look like a normal hackathon bounty platform, not a wallet-first dApp.
- Submissions stay off-chain until there is a clear product reason to move them.
- Code must stay readable for a non-developer project owner. Short comments where a non-developer would need context.
- Prefer one bundled, narrow change over multi-area refactors.

## What not to add yet

Do not introduce any of these without an explicit ask, even if they would be "nice":

- Auth, user accounts, profiles, login systems
- Databases or backend APIs (Supabase, Postgres, Firebase, etc.)
- Smart-account / account-abstraction stacks: Safe, Privy, Biconomy, ZeroDev
- Payment-splitting tooling: 0xSplits / Splits
- Indexers, subgraphs, off-chain workers
- Email, notifications, chat
- Multi-winner, partial payouts, milestones, disputes, fees, multi-judge voting
- Base Sepolia or any other live deploy

## Next recommended tasks (not authorized — confirm before doing)

In order of value vs. risk:

1. **Browser-walk DEMO.md** end to end on a fresh checkout. Tighten any wording where the actual UI differs (burner-wallet confirm UX, Network row label exact string, Faucet button position at the demo viewport). Doc-only.
2. **(Pre-testnet, when authorized)** Audit-shaped checklist: confirm checks-effects-interactions on every state transition; consider a `ReentrancyGuard` if non-`MockERC20` tokens are ever supported; decide whether to split the demo-mint step out of the deploy script before any non-local deploy.

Out of scope until the project owner explicitly asks: Safe, Privy, Splits, Biconomy, ZeroDev, Supabase, any database, any auth, any backend service, mainnet/testnet deploy, real ERC20s.

## Exact suggested next prompt for Codex

> Walk through DEMO.md against the running PrizeLock app on a fresh checkout (`yarn install`, then `yarn chain`, `yarn deploy`, `yarn start` in three terminals). For each section — Sponsor flow, Hacker submission flow, Judge flow, Verify payout, Verify bounty status, Troubleshooting — confirm the wording exactly matches what the UI shows. Pay specific attention to: (a) whether the burner wallet shows a confirmation popup or auto-signs (DEMO.md currently says "Confirm the transaction in your wallet"), (b) the exact string in the Wallet card's `Network:` row, (c) the position of the SE-2 Faucet button at the resolution you intend to demo at. If the doc and UI disagree, fix DEMO.md only — do not change product code, contracts, deploy scripts, tests, frontend, or package config. Then run `yarn compile`, `yarn test`, and `yarn next:build` to confirm the repo is still green. Report files changed (doc-only), commands run, mismatches found, and the next recommended prompt.
