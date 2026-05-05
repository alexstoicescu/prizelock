# PrizeLock Handoff

Snapshot of the project as of the takeover from Codex. Updated 2026-05-05.

## What works today

A local-only MVP of the full bounty payout flow. Verified by:

- 13 Hardhat tests passing (`yarn test`).
- Next.js production build passing (`yarn next:build`).
- Manual browser QA at `http://127.0.0.1:3000` covering create → fund → submit → award → payout.

The escrow contract `PrizeLockEscrow` and the `MockERC20` demo token are deployed automatically by `packages/hardhat/deploy/00_deploy_prizelock.ts` and the deploy script also mints 1,000,000 PRIZE to the deployer for easy testing. The deploy script refuses to run on anything other than `hardhat` / `localhost`.

The single-page UI in `packages/nextjs/app/page.tsx` is the entire frontend. It has sections for Sponsor, Hacker, Judge, Bounty Status, and Refund. Project submissions are stored only in `localStorage` (key: `prizelock-demo-submissions`) and never touch the chain.

## How to run locally

You need three terminals. From the repo root:

```bash
# terminal 1
yarn chain

# terminal 2
yarn deploy

# terminal 3
yarn start
```

Then open `http://127.0.0.1:3000`.

If this is a fresh checkout, run `yarn install` first.

## Full end-to-end flow to verify

Use this as the smoke test after any change. Two browser wallets (or two browser profiles) make role-switching easier, but a single connected wallet can also play sponsor, judge, and winner.

1. **Connect a wallet** on the local Hardhat chain (chain id 31337).
2. **Get gas:** click the floating **Faucet** button at the bottom-left and send some local ETH to the connected wallet so it can pay gas.
3. **Mint fake demo money:** click "Mint fake demo money". The wallet PRIZE balance should jump by 10,000.
4. **Create bounty:** fill in judge wallet, prize token (the "Demo token" button autofills MockERC20), prize amount (e.g. 1000), deadline (defaults to one hour from now in *local time*), description. Click "Create bounty". `activeBountyId` will populate.
5. **Approve escrow:** click "Approve prize escrow". The escrow allowance row should match the prize amount.
6. **Fund prize escrow:** click "Fund prize escrow". Bounty status flips to **Funded**. Wallet PRIZE balance drops by the prize amount.
7. **Add a submission:** in the Hacker section, enter a hacker name, payout wallet (the "Mine" button autofills the connected wallet), project URL, notes. Click "Add project submission".
8. **Switch to the judge wallet** (or stay connected if the same wallet is judge).
9. **Select a submission** via its radio button, then click **Release prize**. Bounty status flips to **Awarded**. The payout transaction hash appears in the green box and in the "Recent transaction hashes" section. The winner's PRIZE balance should equal the prize amount.
10. **(Optional) Refund path:** create a second bounty, fund it, do not award, then wait until past the deadline and click **Refund sponsor**. Status flips to **Refunded** and PRIZE returns to the sponsor.

## Recent fixes (do not regress)

- **Fee-on-transfer protection.** `PrizeLockEscrow.fundBounty` now snapshots `balanceOf(escrow)` before the `transferFrom` and requires the delta to equal `bounty.amount`. Tokens that take a transfer fee (simulated by `MockFeeOnTransferERC20`) revert with `Incorrect token amount received`. See `packages/hardhat/contracts/PrizeLockEscrow.sol:81-87`.
- **Test coverage added** for fee-on-transfer underfunding, non-sponsor funding, and non-sponsor refunding. See `packages/hardhat/test/PrizeLockEscrow.ts`.
- **Frontend default deadline is local time.** `defaultDeadline()` in `packages/nextjs/app/page.tsx:45-52` adjusts for the timezone offset so the `<input type="datetime-local">` value is interpreted correctly when converted back to a unix timestamp. Without this fix, the contract sometimes reverted with `Deadline must be future`.
- **Frontend faucet hint.** A small note in the Wallet section tells first-time users to fund the burner wallet with local ETH for gas before minting PRIZE.

## Smart contract surface (small on purpose)

`PrizeLockEscrow` exposes:

- `createBounty(judge, token, amount, deadline, metadataURI) → bountyId`
- `fundBounty(bountyId)` — sponsor-only; requires prior ERC20 approval; reverts on under-receipt
- `awardWinner(bountyId, winner)` — judge-only; pays full prize and marks status `Awarded`
- `refundSponsor(bountyId)` — sponsor-only; only after deadline; only while status is `Funded`
- `getBounty(bountyId)` — view
- `nextBountyId` — public counter, starts at 1

States: `Created → Funded → Awarded` (terminal) or `Created → Funded → Refunded` (terminal).

## Known limitations

These are accepted for the MVP. Do not "fix" them without a request.

- **Single bounty in the UI.** The frontend only loads one bounty at a time via `activeBountyId`. There is no list view.
- **Submissions are localStorage-only.** They are not shared across browsers, devices, or sessions other than the current one. Clearing browser storage wipes them.
- **No on-chain submission registry.** Judges trust whatever the frontend hands them as the payout wallet. If a malicious frontend swaps the wallet at award time, the judge would sign for the wrong address. Acceptable for a local demo.
- **No reentrancy guard on the escrow.** Safe today because `MockERC20` is a plain OpenZeppelin ERC20 and the `await*Winner` / `refundSponsor` paths follow checks-effects-interactions (status is set before the transfer). Any change that introduces a non-trivial token would warrant `ReentrancyGuard`.
- **No per-bounty cancellation before funding.** A bounty in `Created` cannot be archived; it just stays.
- **Deploy script always mints 1,000,000 PRIZE to the deployer.** This is intentional for demos and would need to change before any non-local deployment.
- **Local-only by design.** `00_deploy_prizelock.ts` throws on any network other than `hardhat` / `localhost`.
- **Burner wallet UX.** Newly created burner wallets need ETH from the SE-2 faucet before they can mint PRIZE or send any tx. The UI hints at this but does not block.

## Risks I noticed during inspection

None require immediate action — flagging for awareness:

1. **`metadataURI` is unbounded user input** stored on-chain. There is no size cap. Not a security issue, but extremely long strings will spike gas. Fine for a local demo; worth a `require(bytes(metadataURI).length <= N)` if this ever leaves localhost.
2. **Frontend trusts a submission's `payoutWallet`.** The judge releases funds to whatever the selected submission says. Since submissions live in `localStorage` and anyone with browser access can edit them, the judge UI implicitly trusts the local browser state. Fine for a local demo; would need real submission attestation before going anywhere production-shaped.
3. **`refundSponsor` button visibility.** It renders before the deadline has passed and the contract correctly rejects the call with `Deadline not passed`. The UI shows a small note explaining this, so behavior is correct, but a user clicking too early will see a transaction-reverted error rather than a disabled button.
4. **No allowance reset path.** If a sponsor approves a large amount and then creates a smaller bounty, leftover allowance lingers. Harmless on a local demo but worth noting.
5. **`MockERC20.mint` is unrestricted.** Anyone can mint to anyone. Intentional for demos; would obviously be removed in any real token.
6. **`activeBountyId` lives only in React state.** A page refresh loses the active bounty selection. Users have to type the id back in (or recreate). Minor UX nit.

## Recommended next steps (in priority order)

These are suggestions, not authorizations. Confirm before doing any of them.

1. **Lock down `yarn lint` / `yarn next:build` in CI** so future regressions are caught automatically. The repo has Husky configured (`.husky/`) — confirm a pre-push hook runs the test suite.
2. **Persist `activeBountyId`** to `localStorage` so a page refresh during the demo doesn't drop the user. One-line change.
3. **Add a `cancelBeforeFunding` path** to the escrow if the demo flow ever needs to clean up unfunded bounties. Currently low priority because nothing breaks.
4. **Pin a copy of the demo script** (a literal narrated walkthrough) in `docs/` so the project owner can demo without the developer present. Pure docs work.
5. **Once the local MVP is "frozen,"** decide what the *next* slice is — likely either (a) a sponsor multi-bounty list view or (b) on-chain submission registration so submissions survive browser refreshes. Either is a real feature and should be scoped against `SPEC.md` first.

Out of scope until explicitly requested: Safe, Privy, Splits, Biconomy, ZeroDev, Supabase, any database, any auth, any backend service, mainnet/testnet deploy, real ERC20s.

## Files to know

- `SPEC.md` — product spec, non-goals, MVP scope.
- `AGENTS.md` — durable agent guide, hard rules, stack, commands.
- `CLAUDE.md` — Claude Code entry point, points at this file and `AGENTS.md`.
- `packages/hardhat/contracts/PrizeLockEscrow.sol` — escrow contract.
- `packages/hardhat/contracts/MockERC20.sol` — demo PRIZE token.
- `packages/hardhat/contracts/test/MockFeeOnTransferERC20.sol` — test-only fee token.
- `packages/hardhat/test/PrizeLockEscrow.ts` — 13 tests, all passing.
- `packages/hardhat/deploy/00_deploy_prizelock.ts` — local-only deploy + demo mint.
- `packages/nextjs/app/page.tsx` — entire user-facing UI.
- `packages/nextjs/contracts/deployedContracts.ts` — auto-generated ABIs after `yarn deploy`.
