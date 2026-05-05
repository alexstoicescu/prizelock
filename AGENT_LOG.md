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
