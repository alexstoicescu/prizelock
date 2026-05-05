# PrizeLock

```
  ____       _         _               _
 |  _ \ _ __(_)_______| |    ___   ___| | __
 | |_) | '__| |_  / _ \ |   / _ \ / __| |/ /
 |  __/| |  | |/ /  __/ |__| (_) | (__|   <
 |_|   |_|  |_/___\___|_____\___/ \___|_|\_\

        hackathon bounties · escrowed · paid
```

A minimal hackathon bounty payout demo. A sponsor locks prize tokens in escrow, hackers submit projects, a judge picks one winner, and the contract pays the prize directly to the winner's wallet.

> **Local / testnet MVP — not production software.**
> PrizeLock runs against a local Hardhat chain. The "PRIZE" token is a `MockERC20` with no value, no listing, and no bridge. There is no real money anywhere in this repo. Do not deploy this to mainnet, do not wire it to real USDC, and do not use it to handle real prize money.

---

## What PrizeLock is

A very simple hackathon bounty platform where the only crypto piece is a small escrow smart contract. The frontend looks like a regular web app — wallets only appear in the UI where escrow funding or payout actually require them. Sponsors and hackers don't need to know or care that there is a smart contract under the hood; the judge clicks one button and the prize is paid.

The MVP exists to prove **one** thing: a sponsor can lock prize funds, a judge can pick a winner, and the winner is paid — provably, with no operator in the middle holding the money.

## Current status

- ✅ Local end-to-end flow working in a real browser.
- ✅ 15 Hardhat tests passing; `yarn ci` green.
- ✅ Contracts hardened with `metadataURI` length cap and a balance-delta check that rejects fee-on-transfer tokens.
- ⏸️ No testnet deploy. No mainnet deploy. No real money. **By design.**

## What works today

The whole app is one flow:

```
   sponsor ──▶ [ escrow ] ──▶ winner
                 │   ▲
                 │   │  judge picks one
                 ▼   │
              [ project submissions ]
              (off-chain, in-browser)
```

State machine:

```
  Created ──fund──▶ Funded ──award──▶ Awarded   (terminal)
                       │
                       └──refund (after deadline)──▶ Refunded   (terminal)
```

| Step | What you click | What the contract does |
|------|----------------|------------------------|
| Mint demo money | "Mint fake demo money" | `MockERC20.mint(you, 10_000e18)` |
| Create bounty | "Create bounty" | `PrizeLockEscrow.createBounty(judge, token, amount, deadline, metadataURI)` |
| Approve | "Approve prize escrow" | `MockERC20.approve(escrow, amount)` |
| Fund | "Fund prize escrow" | `PrizeLockEscrow.fundBounty(bountyId)` |
| Submit project | "Add project submission" | nothing on-chain (browser `localStorage`) |
| Release prize | "Release prize" | `PrizeLockEscrow.awardWinner(bountyId, winner)` |
| Refund (optional) | "Refund sponsor" | `PrizeLockEscrow.refundSponsor(bountyId)` (after deadline) |

## What is intentionally **not** included yet

PrizeLock stays small on purpose. Out of scope until and unless explicitly requested:

- Auth, user accounts, profiles, login systems
- Databases or backend APIs (Supabase, Postgres, Firebase, etc.)
- Smart-account / account-abstraction stacks (Safe, Privy, Biconomy, ZeroDev)
- Payment-splitting tooling (0xSplits)
- Indexers, subgraphs, off-chain workers
- Email, notifications, chat
- Multi-winner, partial payouts, milestones, disputes, fees, multi-judge voting
- Real USDC / DAI / any live token
- Mainnet deployment

## Tech stack

- **Scaffold-ETH 2** (Hardhat flavor), Yarn workspaces.
- **Contracts:** Solidity `0.8.30`, OpenZeppelin (`IERC20`, `SafeERC20`, `ERC20`).
- **Frontend:** Next.js App Router (15.x), RainbowKit, Wagmi, Viem, Tailwind / DaisyUI.
- **Local chain only** today — `hardhat` / `localhost`, chain id `31337`. The deploy script throws on any other network.

## Quickstart

A developer should be able to clone, install, and demo PrizeLock end to end in about 5 minutes. You need three free terminals.

### 1. Prerequisites

- **Node.js v20.18.3 or newer** — `node -v` to check. Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) if you need to switch versions.
- **Yarn** — v1 or v4. The repo ships a Yarn 4 release in `.yarn/releases`, so a global Yarn install is enough; the right version is selected automatically.
- **Git** — to clone.
- A modern browser (Chrome, Brave, Firefox).

You do **not** need a real wallet, a seed phrase, or real ETH. The app uses a built-in burner wallet that lives only in your browser.

### 2. Clone and install

```bash
git clone <your-fork-or-this-repo>.git prizelock
cd prizelock
yarn install
```

The first `yarn install` takes a minute or two while it pulls the `packages/hardhat` and `packages/nextjs` workspaces.

### 3. Three terminals

Open three separate terminal tabs in the repo root. Run, in this order:

```bash
# Terminal 1 — local Hardhat chain
yarn chain
```

This starts a Hardhat node on `http://127.0.0.1:8545`, chain id `31337`. Leave it running.

```bash
# Terminal 2 — deploy MockERC20 + PrizeLockEscrow, mint 1,000,000 demo PRIZE
yarn deploy
```

You'll see two contract addresses logged plus `MockERC20 demo tokens minted to deployer: 0x…`. The deploy step also regenerates `packages/nextjs/contracts/deployedContracts.ts` so the frontend has fresh ABIs.

```bash
# Terminal 3 — start the Next.js app
yarn start
```

Wait for `Ready` and then open the URL printed in the terminal — usually `http://127.0.0.1:3000`.

### 4. First-time wallet setup

1. Click the **Connect wallet** button in the top-right and pick **Burner Wallet**. A throwaway wallet is generated for you.
2. The burner wallet starts with zero ETH, so it cannot pay gas. Click the floating **Faucet** button at the **bottom-left** of the page and send any non-zero amount of local ETH to your address.
3. The "Network" row in the Wallet card should say `Hardhat`. If it doesn't, switch your wallet to chain id `31337`.

### 5. Run the demo

Walk through the click-by-click steps in [`DEMO.md`](./DEMO.md). The 30-second version:

1. **Mint fake demo money** — your PRIZE balance jumps by 10,000.
2. **Create bounty** — fill the form (use the **Mine** / **Demo token** buttons to autofill), click create. The "Load bounty ID" field auto-populates.
3. **Approve prize escrow** — grants the escrow permission to pull your PRIZE.
4. **Fund prize escrow** — actually moves the PRIZE into escrow. Status flips to `Funded`.
5. **Add project submission** — type a name and a payout wallet, click add. (No wallet required.)
6. **Release prize** — connected as the judge, pick a submission's radio, click release.
7. **Verify** — green "Winner selected and paid" box appears with the payout transaction hash. Status flips to `Awarded`. Winner's PRIZE balance increases.

Refresh the page mid-demo and the active bounty stays loaded — `activeBountyId` is persisted to `localStorage` under `prizelock-demo-active-bounty-id`.

### 6. Sanity checks

```bash
yarn ci          # one-shot: yarn compile && yarn test && yarn next:build
yarn compile     # compile contracts only
yarn test        # 15 Hardhat tests
yarn next:build  # production build of the frontend
yarn lint        # frontend + Solidity lint
```

`yarn ci` is the green-light gate. If it passes on a fresh clone, the repo is in the documented working state.

## Manual demo flow

The same flow as the table above, in plain English:

1. **Sponsor** opens the app, mints fake PRIZE, fills out the bounty form (judge wallet, prize token, amount, deadline, description), clicks **Create bounty**.
2. **Sponsor** clicks **Approve prize escrow**, then **Fund prize escrow**. The prize is now locked in the contract; the bounty status flips to `Funded`.
3. **Hacker** opens the app (no wallet needed), fills out a project submission (team name, payout wallet, project URL), clicks **Add project submission**. Submissions live only in this browser's `localStorage`.
4. **Judge** connects with the wallet that was set as the bounty's judge. Picks a submission's radio button.
5. **Judge** clicks **Release prize**. One transaction. Prize is paid from the contract directly to the winning submission's payout wallet. Bounty status flips to `Awarded`.
6. The app shows a green box with the payout transaction hash. The winner's wallet balance updates immediately.

If the bounty is funded but no winner is picked before the deadline, the **sponsor** can click **Refund sponsor** after the deadline to pull the prize back. Status flips to `Refunded`.

## Useful docs

- [`DEMO.md`](./DEMO.md) — non-developer walkthrough of the local app (run, faucet, sponsor / hacker / judge flows, payout verification, troubleshooting).
- [`SPEC.md`](./SPEC.md) — product spec, goals, non-goals, MVP scope.
- [`HANDOFF.md`](./HANDOFF.md) — current working state, run instructions, smoke test, known limitations, suggested next tasks.
- [`BASE_SEPOLIA.md`](./BASE_SEPOLIA.md) — preparation guide for a future testnet deploy. **Nothing is deployed yet.** Read before any testnet work.
- [`PRE_TESTNET_CHECKLIST.md`](./PRE_TESTNET_CHECKLIST.md) — go / no-go decision aid for Base Sepolia. **Current status: NO-GO** (local-only by design until the project owner authorizes a deploy).
- [`SECURITY.md`](./SECURITY.md) — secrets and env-handling rules. Read before pushing publicly.
- [`AGENTS.md`](./AGENTS.md) and [`CLAUDE.md`](./CLAUDE.md) — durable rules for any agent working on the codebase.
- [`AGENT_LOG.md`](./AGENT_LOG.md) — chronological milestones from agent collaboration.

## Repo layout

```
packages/hardhat/contracts/PrizeLockEscrow.sol   # the escrow (~130 lines)
packages/hardhat/contracts/MockERC20.sol         # fake demo token (public mint by design)
packages/hardhat/test/PrizeLockEscrow.ts         # 15 tests
packages/hardhat/deploy/00_deploy_prizelock.ts   # local-only deploy + 1M PRIZE pre-mint
packages/nextjs/app/page.tsx                     # the entire user-facing UI (single page)
packages/nextjs/contracts/deployedContracts.ts   # auto-generated ABIs after `yarn deploy`
packages/nextjs/scaffold.config.ts               # targetNetworks / burner wallet mode
```

## Safety notes

- The **`MockERC20` `PRIZE` token is fake**. It exists only on your local Hardhat chain. It has no value. `MockERC20.mint` is **intentionally permissionless** — anyone can mint themselves PRIZE. That is the demo faucet for the fake token. Do not treat `MockERC20` as a contract you would ever ship to mainnet.
- The 1,000,000 PRIZE auto-minted to the deployer is fake. The local ETH from the SE-2 Faucet is fake. Every transaction hash you see is local-only and disappears when `yarn chain` restarts.
- `PrizeLockEscrow` itself **is** real Solidity — the state machine, role checks, balance-delta funding check, and `SafeERC20` transfers behave the same way on any EVM chain. The 15 tests in `packages/hardhat/test/PrizeLockEscrow.ts` exercise that real logic.
- **No `.env` file is committed.** Only blank templates `packages/hardhat/.env.example` and `packages/nextjs/.env.example` are tracked. Read [`SECURITY.md`](./SECURITY.md) before pushing publicly.

## Troubleshooting

**Local burner wallet has no ETH (mint or any tx fails with "insufficient funds for gas").**
A new burner wallet starts with zero ETH. Click the floating **Faucet** button at the bottom-left of the page and send a small amount (`1` is fine) of local ETH to the connected address. You only need to do this once per burner.

**Wrong network ("Switch to the local Hardhat chain" warning shows in yellow).**
Your wallet is on the wrong chain. Switch to chain id `31337`. If you're using MetaMask, add a custom network with RPC `http://127.0.0.1:8545` and chain id `31337`.

**App cannot find the deployed contracts.**
`packages/nextjs/contracts/deployedContracts.ts` is auto-generated by `yarn deploy`. If you started the frontend before deploying, or restarted `yarn chain` (which wipes contract state), re-run `yarn deploy` and refresh the browser. After a chain restart the bounty ids reset to `1`.

**`Deadline must be future` revert when clicking "Create bounty".**
The deadline you picked is at or before the current block timestamp. The default in the form is one hour from now in your local time — pick something at least a few minutes ahead.

**`Incorrect token amount received` when funding.**
You're trying to fund with a fee-on-transfer token. The escrow rejects these on purpose. Use the demo PRIZE token (the **Demo token** button autofills it).

**"Approve prize escrow" succeeded but "Fund prize escrow" stays disabled.**
The allowance has to fully confirm before the Fund button enables. Wait a couple of seconds for the page to re-read it. If it's still stuck, refresh, retype the bounty id, and try again.

**"Release prize" is disabled.**
Either (a) the connected wallet is not the bounty's judge, (b) no submission is selected, or (c) the bounty is not in `Funded` status. The page shows the reason inline.

**Submissions disappeared.**
Submissions live in `localStorage` under the key `prizelock-demo-submissions`. Different browsers, devices, or incognito windows do not share them. Clearing site data wipes them.

**Page lost the active bounty after a refresh.**
The active bounty id is persisted in `localStorage` under `prizelock-demo-active-bounty-id`, so a normal refresh keeps it. If you cleared site data or switched browsers, type the id back into "Load bounty ID" — it's `1` after a fresh deploy and increments from there.

**`yarn deploy` fails with "PrizeLock MVP deploy is local-only".**
This is on purpose. The deploy script refuses to run against any non-local network. See [`BASE_SEPOLIA.md`](./BASE_SEPOLIA.md) for the documented future path.

**`yarn ci` / `yarn next:build` shows two "Critical dependency: the request of a dependency is an expression" warnings.**
These come from `@reown/appkit` and `@coinbase/cdp-sdk` (transitive deps of the wallet stack). They are upstream issues, **harmless**, and the build still completes successfully. They have been the same since the project was scaffolded.

**Everything looks broken after restarting `yarn chain`.**
Restarting the local chain wipes contract state. The bounty ids reset. Re-run `yarn deploy`, refresh the browser, and reconnect the burner wallet. The burner persists across chain restarts but its on-chain balance does not.

## Roadmap

Short, in priority order. Nothing here is authorized — the project owner gates each step explicitly.

1. **Browser-walk `DEMO.md` end to end** on a fresh checkout to confirm doc still matches the UI exactly.
2. **Pre-testnet audit pass** against [`PRE_TESTNET_CHECKLIST.md`](./PRE_TESTNET_CHECKLIST.md). Current status is **NO-GO** by design.
3. **(When authorized) Base Sepolia demo deploy** following [`BASE_SEPOLIA.md`](./BASE_SEPOLIA.md). Single-line config flips. No new product features.
4. Anything beyond a working Base Sepolia demo (real tokens, real money, multi-winner, disputes, account abstraction) is **explicitly deferred** until that demo works and is reviewed.

## License

PrizeLock contracts are MIT-licensed (`SPDX-License-Identifier: MIT` in source). The wider repo follows Scaffold-ETH 2's licensing for the upstream scaffolding.

---

> Built as a non-developer-friendly demo of escrowed bounty payouts. Plain web app on top, tiny escrow contract underneath.
