# PrizeLock — Pre-Testnet Audit Checklist

A go/no-go checklist for moving PrizeLock from the local Hardhat MVP to a Base Sepolia demo. This is a **decision aid**, not authorization. Nothing in this file requests a deploy.

Last updated: 2026-05-05.

Companion docs:
- `BASE_SEPOLIA.md` — the full readiness guide (what gets deployed, env vars, guardrails, expected commands, rollback). Read it before doing any of the items here.
- `HANDOFF.md` — the current working state and run instructions.
- `DEMO.md` — the non-developer walkthrough used for browser QA.
- `SPEC.md`, `AGENTS.md`, `CLAUDE.md` — durable product rules.

The goal of the testnet demo is one thing only: prove the **same escrow contract** that runs locally also works on a real EVM L2. Not real money. Not real tokens. Not auth, accounts, or backend. Just the escrow.

---

## 1. Current green-light state

These must all be true before the checklist below is even worth running. Re-confirm with `yarn ci`.

- [x] `yarn compile` — clean.
- [x] `yarn test` — **15 passing**.
- [x] `yarn next:build` — succeeds (one harmless `@coinbase/cdp-sdk` / `@reown/appkit` "Critical dependency" warning is known and ignored).
- [x] `yarn ci` — aggregates the three checks above and is green.
- [x] Manual local browser QA passed end to end (mint → create → approve → fund → submit → award → release → status `Awarded` → payout tx hash visible).
- [x] `activeBountyId` is persisted to `localStorage` so a refresh during a live demo does not drop the user.

If any of the above are not green, **stop**. Fix locally before considering testnet.

---

## 2. Contract safety checklist

`PrizeLockEscrow.sol` is intentionally tiny. The only safety surface that matters for the testnet demo is the existing one. Walk through each item.

- [ ] **State machine is enforced.** `Created → Funded → Awarded` (terminal) or `Created → Funded → Refunded` (terminal). No path skips funding. Tests cover the negative cases.
- [ ] **Role checks present on every state-changing call.**
  - `fundBounty`: `msg.sender == bounty.sponsor`.
  - `awardWinner`: `msg.sender == bounty.judge`.
  - `refundSponsor`: `msg.sender == bounty.sponsor`.
- [ ] **Zero-address checks present** for `judge`, `token`, and `winner`.
- [ ] **Amount > 0** required on `createBounty`.
- [ ] **Deadline must be in the future** at create time.
- [ ] **`metadataURI` length capped** at 512 bytes (`MAX_METADATA_URI_LENGTH`). Tests cover at-limit and over-limit.
- [ ] **`SafeERC20`** is used for all transfers (`safeTransferFrom`, `safeTransfer`).
- [ ] **Balance-delta check on funding** (`balanceOf(this) - balanceBefore == amount`) — rejects fee-on-transfer tokens that under-deliver. Tested with `MockFeeOnTransferERC20`.
- [ ] **No double payout / no payout before funding** — tested.
- [ ] **No refund before deadline / no refund after payout / no non-sponsor refund** — tested.
- [ ] **No admin, no pause, no upgrade path.** Intentional. Simplifies rollback.
- [ ] **No reentrancy guard.** Acceptable today: only `MockERC20` is in play, and the contract follows checks-effects-interactions (status is set to `Funded`/`Awarded`/`Refunded` before any external transfer). If a non-mock token is ever wired in, revisit.

If every box above can be ticked from reading `PrizeLockEscrow.sol` and `packages/hardhat/test/PrizeLockEscrow.ts` — green for testnet from a contract-safety angle.

---

## 3. Frontend demo checklist

The frontend should feel like a normal hackathon platform. Wallets only appear where escrow funding or payout requires them.

- [ ] Page loads at `http://127.0.0.1:3000` with the yellow "Local demo money only" notice.
- [ ] "Demo progress" strip reflects state correctly across the flow.
- [ ] **Wallet card** shows the connected address, network name, and a "First-time local wallet?" hint pointing at the SE-2 Faucet (local-only context).
- [ ] **Sponsor section** — Mint, Create, Approve, Fund buttons all work. "Mine" / "Demo token" autofill helpers work. "Load bounty ID" persists across refresh.
- [ ] **Hacker section** — submission appears under Judge after click; submissions persist in `localStorage` under `prizelock-demo-submissions`. No wallet required to submit.
- [ ] **Judge section** — Release prize is disabled unless (a) connected wallet matches `bounty.judge`, (b) a submission is selected, (c) bounty is `Funded`. Disabled-reason hint is visible when off.
- [ ] **Bounty Status card** — reads from `getBounty` and shows Sponsor / Judge / Prize token / Prize amount / Deadline / Winner / Status / Description.
- [ ] **Refund card** — only appears when sponsor is connected and bounty is `Funded`. Pre-deadline note is visible. Contract still rejects pre-deadline refund.
- [ ] **Error surface** — failed transactions show the parsed error in the "Transaction messages" card, not a silent failure.

---

## 4. Base Sepolia deployment readiness

These come from `BASE_SEPOLIA.md`. Do not duplicate the full content — confirm each item there is satisfied.

- [ ] `packages/hardhat/hardhat.config.ts` lists `baseSepolia: { url: "https://sepolia.base.org", accounts: [deployerPrivateKey] }`. (Already present.)
- [ ] Three intentional guardrails are still in place and **understood**:
  1. `00_deploy_prizelock.ts` throws on any non-`hardhat`/`localhost` network.
  2. `scaffold.config.ts` has `targetNetworks: [chains.hardhat]` and `burnerWalletMode: "localNetworksOnly"`.
  3. The deploy script unconditionally mints 1,000,000 PRIZE to the deployer.
- [ ] Authorizing a deploy means **explicitly** loosening guardrail #1 in a single small commit. Not bundled with anything else.
- [ ] The frontend flip is the **single line** `targetNetworks: [chains.baseSepolia]` in `scaffold.config.ts`. Burner-wallet mode stays `"localNetworksOnly"` so it auto-hides on testnet.
- [ ] `yarn deploy --network baseSepolia` is the deploy command. SE-2 will regenerate `packages/nextjs/contracts/deployedContracts.ts` automatically.
- [ ] `yarn verify --network baseSepolia` is the contract-verification command. Both `MockERC20` and `PrizeLockEscrow` should verify.
- [ ] Rollback plan is understood: revert the guardrail loosening, revert `targetNetworks`, revert the regenerated `deployedContracts.ts`, and re-run `yarn ci`. Orphaned testnet contracts can stay; they have no real-asset exposure.

---

## 5. Environment variable readiness

All required env vars are already documented in `packages/hardhat/.env.example` and `packages/nextjs/.env.example`.

- [ ] `packages/hardhat/.env` exists locally with values for:
  - `DEPLOYER_PRIVATE_KEY_ENCRYPTED` — populated **only** via `yarn account:generate` or `yarn account:import`. **Never paste a raw private key.**
  - `ETHERSCAN_V2_API_KEY` — required for `yarn verify --network baseSepolia` against Basescan.
  - `ALCHEMY_API_KEY` — not required for the Base Sepolia RPC itself (public endpoint is used) but harmless to set.
- [ ] `packages/nextjs/.env` (or `.env.local`) has the values it already expects:
  - `NEXT_PUBLIC_ALCHEMY_API_KEY` — used by SE-2's frontend RPC stack.
  - `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` — required for WalletConnect to function on testnet.
- [ ] Deployer wallet on Base Sepolia has been funded with testnet ETH from a public faucet **before** running `yarn deploy --network baseSepolia`. Without gas, deploy will simply revert.
- [ ] No `.env` file is committed. (`.env` is in `.gitignore` by SE-2 default — verify before any push.)

---

## 6. MockERC20 testnet faucet assumptions

`MockERC20.mint` is intentionally permissionless. **Do not change this for the testnet demo.**

- [ ] Anyone (including demo viewers) can call `MockERC20.mint(address, amount)` from Basescan's "Write Contract" tab on the deployed `MockERC20` to obtain PRIZE. This is the demo faucet for the fake token.
- [ ] The frontend "Mint fake demo money" button continues to work unchanged — it calls the same public `mint`.
- [ ] The PRIZE token has **no value**. It is a `MockERC20` with no listing, no bridge, and no relationship to any real asset. Anyone telling you otherwise is wrong.
- [ ] The deploy-time pre-mint of 1,000,000 PRIZE to the deployer is acceptable on Base Sepolia because PRIZE is fake. Re-deploys accumulate supply on Basescan — visible but harmless.
- [ ] **Do not** add `Ownable` to `MockERC20`. Do not restrict `mint`. The point of a public faucet is that demo viewers can self-serve PRIZE without the project owner running a faucet bot.

---

## 7. Manual browser QA checklist

Run the local QA before any testnet authorization, and re-run an equivalent QA after deploy. Walk through `DEMO.md` in order.

Local (must pass before considering testnet):

- [ ] Three terminals: `yarn chain`, `yarn deploy`, `yarn start`.
- [ ] Open `http://127.0.0.1:3000`.
- [ ] Connect a burner wallet, fund it from the SE-2 Faucet, mint PRIZE.
- [ ] Create a bounty, approve, fund. Status flips to `Funded`.
- [ ] Add a submission, pick it as judge, release prize. Status flips to `Awarded`.
- [ ] Refresh the page. The active bounty id is **still** loaded; Bounty Status repopulates without retyping.
- [ ] Try a `metadataURI` longer than 512 bytes — confirm the `Metadata URI too long` revert.
- [ ] Optional: create a second bounty, fund, do not award, advance past deadline, refund. Status flips to `Refunded`.

Testnet (only after deploy is authorized and executed):

- [ ] Connect via MetaMask / Rainbow / Coinbase Wallet on Base Sepolia. Burner option is **gone**.
- [ ] Fund the connecting wallet with Base Sepolia ETH from a public faucet.
- [ ] Mint PRIZE via the "Mint fake demo money" button. Confirm balance updates after the testnet block (~2–4s lag).
- [ ] Run the full sponsor → hacker → judge flow. Each tx confirms on Basescan. The payout transaction appears as an ERC20 transfer from `PrizeLockEscrow` to the winner.
- [ ] Verify both contracts on Basescan via `yarn verify --network baseSepolia`. Read `nextBountyId()`, `MAX_METADATA_URI_LENGTH()`, `MockERC20.name()` / `symbol()` / `balanceOf(deployer)` from the verified explorer pages.

---

## 8. Known limitations that are acceptable for MVP

Do not fix these as part of the testnet demo. They are intentional.

- **Single bounty in the UI.** No list view; one bounty loaded by id at a time.
- **Submissions are `localStorage`-only** under `prizelock-demo-submissions`. Different browsers / devices / incognito do not share them.
- **`activeBountyId` is `localStorage`-only.** Persists across refresh; lost on site-data clear or browser switch.
- **Deploy script always mints 1,000,000 PRIZE to the deployer.** Acceptable on a fake token; visible on Basescan; harmless.
- **`MockERC20.mint` is permissionless.** Intentional faucet for the fake token.
- **No reentrancy guard on the escrow.** Safe today: only `MockERC20` is in play and the contract follows checks-effects-interactions.
- **Confirmations are not instant on testnet.** Existing UI handles the lag but feels slower than local.
- **Burner wallet auto-hides on testnet.** Correct: nobody should be using a throwaway wallet for Base Sepolia transactions.
- **No multichain UI.** `targetNetworks` is one chain at a time; switching back to local requires a config flip and a frontend restart.

---

## 9. Known limitations that must be fixed before any real-money demo

These are **not** Base Sepolia blockers. They are blockers for **any future** plan involving real tokens or real money. Capture them now so they are not forgotten.

- **`MockERC20.mint` is permissionless.** Fine for fake PRIZE; fatal for any real asset. Any path toward real tokens replaces `MockERC20` entirely — it does not "lock down" the existing one.
- **The deploy script unconditionally mints 1,000,000 PRIZE.** For any non-demo deploy, the demo-mint step must be removed or gated behind an explicit flag.
- **No reentrancy guard on `PrizeLockEscrow`.** Acceptable for `MockERC20` only. Any real ERC20 (especially weird ones — rebasing, hooks, callbacks) requires `ReentrancyGuard` plus a fresh review of state-write ordering.
- **No formal audit.** SE-2 ships nothing audit-grade. Any real-money path requires a third-party review.
- **No invariant / fuzz tests.** Unit tests only. Adequate for a demo, not for value at risk.
- **No emergency-stop or admin path.** Intentional for the demo. A real-money product would need a documented incident response.
- **Single-judge, single-winner, single-payout.** Out of scope by design. Real bounties often need disputes, appeals, multi-winner splits, milestones — all explicitly deferred.
- **Off-chain submissions** (browser `localStorage`). Real bounties need a tamper-evident submission record.
- **No identity / sybil resistance.** Wallets are the only identity. Acceptable for a demo, not for a public bounty platform with prize money.

---

## 10. What not to add yet

Hard "no" until **after** the Base Sepolia demo works and the project owner explicitly asks. Lifted from `AGENTS.md` / `CLAUDE.md` / `BASE_SEPOLIA.md`:

- Auth, user accounts, profiles, login systems.
- Databases or backend APIs (Supabase, Postgres, Firebase, etc.).
- Smart-account / account-abstraction stacks: Safe, Privy, Biconomy, ZeroDev.
- Payment-splitting tooling: 0xSplits / Splits.
- Indexers, subgraphs, off-chain workers.
- Email, notifications, chat.
- Multi-winner, partial payouts, milestones, disputes, fees, multi-judge voting.
- Real USDC, real DAI, any live token.
- Mainnet deploy.
- Restricting `MockERC20.mint` (it is the demo faucet on local **and** testnet).
- `Ownable` on any contract.
- Gas sponsors / paymasters / meta-transactions.
- Multichain UI / chain switcher.
- Auto-deploy from CI.

---

## 11. Exact go / no-go criteria for Base Sepolia

**Go to Base Sepolia** if **all** of these are true:

1. `yarn ci` is green on the current commit.
2. Every box in §2 (Contract safety) can be ticked from the source.
3. Every box in §3 (Frontend demo) was just observed in a fresh local browser walkthrough of `DEMO.md`.
4. Every box in §4 (Deployment readiness) is satisfied — guardrails still in place, single-line flip understood, rollback plan understood.
5. Every box in §5 (Env vars) is satisfied locally — encrypted PK present, Etherscan v2 key present, deployer wallet has Base Sepolia ETH.
6. The project owner has explicitly said "deploy to Base Sepolia." This document is preparation, not authorization.

**No-go** if any of the following is true:

- Any item in §1 is not green.
- The current commit changes `PrizeLockEscrow.sol` and the test count is not still 15+ passing.
- The current commit changes the deploy script's local-only guard or the `targetNetworks` config in a way that bundles unrelated changes.
- The frontend has been refactored away from the single-page `app/page.tsx` MVP.
- Any item in §10 (What not to add yet) has been added.
- The project owner has not authorized a deploy.

**Current status: NO-GO.** The repo is green-light for **local** demo only. No deploy has been authorized. Guardrails 1–3 in `BASE_SEPOLIA.md` are intentionally still in place. Treat this as the expected state until the project owner says otherwise.

---

## 12. Exact next prompt for Codex (when Codex usage is available again)

> On a fresh checkout of PrizeLock, walk through `PRE_TESTNET_CHECKLIST.md` end to end. For §1, run `yarn ci` and confirm 15 tests pass and the build succeeds. For §2, read `packages/hardhat/contracts/PrizeLockEscrow.sol` and `packages/hardhat/test/PrizeLockEscrow.ts` and tick each box (or report which one fails and why). For §3, run `yarn chain` / `yarn deploy` / `yarn start`, open `http://127.0.0.1:3000`, and walk the local steps in §7 in a real browser, including the `activeBountyId`-persistence refresh check and the over-512-byte `metadataURI` revert. For §4–§6, audit (do **not** edit) `packages/hardhat/hardhat.config.ts`, `packages/hardhat/deploy/00_deploy_prizelock.ts`, `packages/nextjs/scaffold.config.ts`, `packages/hardhat/.env.example`, and `packages/nextjs/.env.example` and report which guardrails and env vars are in place. Do **not** deploy. Do **not** loosen the network guard. Do **not** change `targetNetworks`. Do **not** restrict `MockERC20.mint` or add `Ownable`. Do **not** add Safe / Privy / Splits / Biconomy / ZeroDev / Supabase / auth / database / backend / real USDC. The output of this prompt is a single go / no-go report against §11, with the failing checklist items called out by section. Update `AGENT_LOG.md` with one short milestone entry. Re-run `yarn ci` to confirm no regression.

## 13. Exact next prompt for Claude (if Codex is still unavailable)

> Continue from the green-light PrizeLock state (15 tests passing, `yarn ci` green, `activeBountyId` persisted, `PRE_TESTNET_CHECKLIST.md` exists). Do a **static, read-only** pass against `PRE_TESTNET_CHECKLIST.md`. Read `PrizeLockEscrow.sol`, `MockERC20.sol`, `00_deploy_prizelock.ts`, `hardhat.config.ts`, `scaffold.config.ts`, `packages/nextjs/app/page.tsx`, `packages/hardhat/.env.example`, `packages/nextjs/.env.example`, and `BASE_SEPOLIA.md`. For each box in §2, §4, §5, §6, and §10 of the checklist, mark it as PASS, FAIL, or NEEDS-LIVE-BROWSER (for items only verifiable by walking the UI). Produce a single go / no-go report against §11. Do **not** edit contracts, frontend logic, deploy scripts, package scripts, env files, or generated files. The only writes allowed are: a short milestone entry appended to `AGENT_LOG.md`, and — only if a checklist item is genuinely outdated — a small wording fix to `PRE_TESTNET_CHECKLIST.md` itself. Re-run `yarn ci` at the end to confirm the repo is still green. Report files read, files changed (doc-only), commands run, and the go / no-go status.
