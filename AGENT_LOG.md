# PrizeLock Agent Log

Chronological log of major milestones from agent collaboration on PrizeLock. Append new entries to the bottom; do not rewrite history.

Each entry: date · agent · what changed · how it was verified.

---

## Milestones

**Scaffold created**
Codex · Repo bootstrapped from Scaffold-ETH 2 (Hardhat flavor). Yarn workspaces set up with `packages/hardhat` and `packages/nextjs`. Initial commit: `d9c3fcf Initial commit with create-eth @ 2.0.16`.

**Escrow contract implemented**
Codex · Added `PrizeLockEscrow.sol` (one-winner escrow with `createBounty` / `fundBounty` / `awardWinner` / `refundSponsor`) and `MockERC20.sol` (open-mint demo token). Deploy script `00_deploy_prizelock.ts` deploys both and pre-mints 1,000,000 PRIZE to the deployer. Local-only by design (throws on any non-`hardhat`/`localhost` network).

**Contract review and hardening**
Codex · Added balance-delta check in `fundBounty` to reject fee-on-transfer tokens that under-deliver. Added `MockFeeOnTransferERC20` test-only token under `contracts/test/`. Test count brought to 13, all passing.

**Frontend demo implemented**
Codex · Single-page UI in `packages/nextjs/app/page.tsx` with Sponsor / Hacker / Judge / Bounty Status / Refund sections. Submissions stored in browser `localStorage` under key `prizelock-demo-submissions`. Used Scaffold-ETH hooks (`useScaffoldReadContract`, `useScaffoldWriteContract`, `useDeployedContractInfo`).

**Frontend UX refined**
Codex · `defaultDeadline()` now adjusts for timezone offset so the `<input type="datetime-local">` value round-trips correctly and `createBounty` no longer reverts with `Deadline must be future`. Added a "First-time local wallet?" hint pointing users to the SE-2 Faucet button so newly created burner wallets can pay gas.

**Manual browser QA passed**
Codex · End-to-end flow verified at `http://127.0.0.1:3000`: mint fake PRIZE → create bounty → approve → fund → add off-chain submission → select winner → release prize → status `Awarded` → payout tx hash visible → balances update. `yarn compile`, `yarn test` (13 passing), `yarn next:build` all green.

**Handoff documentation created (2026-05-05)**
Claude Code · Replaced the stub `CLAUDE.md` with a Claude-specific entry point listing the durable hard rules (preserve MVP, no Safe/Privy/Splits/Biconomy/ZeroDev/Supabase/DB/auth, submissions stay off-chain, local-only). Created `HANDOFF.md` capturing current state, run instructions, end-to-end smoke test, recent fixes, known limitations, risks, and prioritized next-step suggestions.

**Read-only QA review (2026-05-05)**
Claude Code · Ran `yarn compile`, `yarn test` (13 passing), `yarn next:build`. All green. Inspected contracts, tests, deploy script, `page.tsx`, `scaffold.config.ts`, `SPEC.md`, `CLAUDE.md`, `HANDOFF.md`. Top issues flagged for later: open-mint `MockERC20.mint` (intentional for demo, blocker for any non-local deploy), implicit deploy/demo-mint coupling, unbounded `metadataURI`. No code changes made.

**DEMO.md created (2026-05-05)**
Claude Code · Wrote `DEMO.md` as a non-developer walkthrough of the local app: what PrizeLock is, three-terminal run, faucet usage, sponsor / hacker / judge flows, payout and status verification, known limitations, troubleshooting, and a clear "fake demo money vs. real escrow logic" section. No product code touched.

**DEMO.md statically verified (2026-05-05)**
Claude Code · Compared every command, URL, button label, status name, error string, placeholder, and default value in `DEMO.md` against `page.tsx`, `PrizeLockEscrow.sol`, `MockERC20.sol`, and `00_deploy_prizelock.ts`. No mismatches found. Three items remain pending live-browser verification: burner-wallet confirm UX, exact Network row string, Faucet button position at demo viewport.

**Pre-testnet hardening: `metadataURI` length cap (2026-05-05)**
Claude Code · Added `MAX_METADATA_URI_LENGTH = 512` constant to `PrizeLockEscrow.sol` and a `require(bytes(metadataURI).length <= MAX_METADATA_URI_LENGTH, "Metadata URI too long")` check in `createBounty`. Added two tests in `PrizeLockEscrow.ts`: one accepting a URI exactly at the limit, one rejecting one byte over. Test count now **15 passing**. `yarn compile`, `yarn test`, and `yarn next:build` all green. No frontend changes; no `Ownable` added; `MockERC20` left intentionally public-mintable.

**Base Sepolia readiness pass (2026-05-05)**
Claude Code · Created `BASE_SEPOLIA.md` documenting: what a testnet deploy will prove, required env vars (already covered by SE-2's existing `.env.example`), the three intentional guardrails currently blocking a deploy (deploy-script local-only throw, `scaffold.config.ts` targets only `chains.hardhat`, deploy script mints 1M PRIZE), expected commands when authorized, contract verification steps, frontend run instructions, known limitations, rollback plan, and a deny-list. Verified `baseSepolia` network is already wired in `hardhat.config.ts`. **No code, contracts, deploy scripts, frontend, env templates, or package config were changed.** Nothing was deployed. `yarn compile`, `yarn test` (15 passing), and `yarn next:build` re-run green to confirm no regression.

**Demo-stability tweaks: persist `activeBountyId` + `yarn ci` (2026-05-05)**
Claude Code · `packages/nextjs/app/page.tsx` now reads/writes `activeBountyId` to `localStorage` under `prizelock-demo-active-bounty-id` so a page refresh keeps the loaded bounty (~13 lines added). Added a root `yarn ci` script that runs `yarn compile && yarn test && yarn next:build`. Updated `HANDOFF.md` (commands + known-limitations entry + next-tasks list) and `DEMO.md` (limitations + troubleshooting entry). No contracts, deploy script, or product features changed. `yarn ci` green: `yarn compile` clean, `yarn test` 15 passing, `yarn next:build` succeeds (same known harmless `@coinbase/cdp-sdk` / `@reown/appkit` "Critical dependency" warnings as before).

**Pre-testnet checklist created (2026-05-05)**
Claude Code · Added `PRE_TESTNET_CHECKLIST.md` at the repo root: a 13-section go/no-go decision aid covering current green-light state, contract safety, frontend demo, Base Sepolia readiness, env vars, MockERC20 faucet assumptions, manual browser QA, MVP-acceptable limitations, real-money blockers, what not to add yet, explicit go/no-go criteria, and the next recommended prompts for Codex and Claude. Doc-only; no contracts, frontend, deploy scripts, package scripts, env templates, or generated files changed. Linked from `HANDOFF.md`. `yarn ci` re-run green: `yarn compile` clean, `yarn test` 15 passing, `yarn next:build` succeeds. Current status against the new checklist: **NO-GO** for Base Sepolia by design — guardrails still in place, no deploy authorized.

**Secrets & env-handling doc added (2026-05-05)**
Claude Code · Added `SECURITY.md` at the repo root with the durable rules for keeping secrets out of git: never commit `.env`, use `yarn account:generate` / `yarn account:import` for the deployer PK (never paste raw), treat `NEXT_PUBLIC_*` values as semi-public and restrict by origin, use a throwaway deployer wallet for any future Base Sepolia deploy, plus a pre-push checklist and an "if a secret leaked" recovery path. Confirms current state: no git remote configured, no `.env` on disk, no `.env` ever committed, only blank `.env.example` templates tracked. Linked from `HANDOFF.md`. Doc-only; no contracts, frontend, deploy scripts, package scripts, env templates, or generated files changed.

**Pre-testnet read-only audit (2026-05-05)**
Claude Code · Static audit against `PRE_TESTNET_CHECKLIST.md`. Read all 15 listed source files. Result: every §2 contract-safety box PASSES from source (`PrizeLockEscrow.sol` enforces state machine, role checks, zero-address checks, amount>0, future-deadline, 512-byte metadataURI cap, `SafeERC20` for all transfers, balance-delta check on funding, no admin/pause/upgrade, CEI ordering on every state transition; 15 tests cover the negative paths). §4 deployment guardrails all in place: `00_deploy_prizelock.ts:6-8` throws on non-local, `scaffold.config.ts:18,41` is `[chains.hardhat]` + `burnerWalletMode: "localNetworksOnly"`, deploy script still mints 1M PRIZE unconditionally. `hardhat.config.ts:108-111` already wires `baseSepolia`. §5 env state: no local `.env` on disk; templates blank; gitignores cover `.env`. §6 MockERC20 faucet assumptions all hold (public `mint`, no `Ownable`, frontend button calls same `mint`). §10 deny-list items all absent. §3 / §7 require live browser to fully tick. **Status against §11: NO-GO by design** — no project-owner deploy authorization, which is the gate, not a code defect. `yarn ci` re-run green. No product code, contracts, frontend, deploy scripts, package scripts, env templates, or generated files changed; checklist needed no edits.
