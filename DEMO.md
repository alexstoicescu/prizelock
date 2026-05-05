# PrizeLock — Local Demo Guide

A plain-English walkthrough of the PrizeLock MVP, written so a non-developer can run it end to end on one laptop.

## What PrizeLock is

PrizeLock is a hackathon bounty payout app. The whole point is to prove one flow:

1. A **sponsor** posts a bounty and locks a prize.
2. **Hackers** submit project links.
3. A **judge** picks one winner.
4. The prize is **paid out** to the winner from escrow.

The bounty page looks like a normal hackathon platform. The only crypto piece is the smart contract that holds the prize money in escrow and releases it to the winner. Everything else (project submissions, descriptions, judging) is just a normal web app.

There is **no real money** anywhere. The "PRIZE" tokens are fake demo tokens that only exist on a local Hardhat blockchain running on your computer. The escrow logic, however, *is* real Solidity that would also work on a live chain — that is the part we are testing.

## What you need before you start

- Node.js v20.18.3 or newer
- Yarn
- Three free terminal windows
- A modern browser (Chrome, Brave, Firefox)

You do **not** need a real wallet, a seed phrase, real ETH, or real money. The app uses a built-in "burner wallet" that lives only in your browser.

## How to run the local app

Open three terminals at the project root and run, in order:

```bash
# Terminal 1 — start the local blockchain
yarn chain

# Terminal 2 — deploy contracts and mint demo PRIZE to the deployer
yarn deploy

# Terminal 3 — start the web app
yarn start
```

If this is a fresh checkout, run `yarn install` once before the steps above.

Then open the app in your browser:

> **http://127.0.0.1:3000**

You should see the PrizeLock page with a yellow "Local demo money only" notice in the top-right corner. If you do not, see **Troubleshooting** below.

## Connecting a wallet

Click the connect-wallet button in the top-right of the app. Pick **Burner Wallet** — this creates a throwaway local wallet for you. You can also use MetaMask if it is configured for the local Hardhat chain (chain id `31337`).

The "Demo progress" strip on the page shows where you are in the flow.

## Using the faucet (if your burner wallet has no local ETH)

A new burner wallet starts with zero ETH, so it cannot pay gas for any action — including minting fake PRIZE. To fix this:

1. Look for the floating **Faucet** button at the **bottom-left corner** of the page.
2. Click it. A small dialog opens.
3. Send a small amount of local ETH (anything more than zero — `1` is fine) to your connected wallet's address.
4. Confirm. The local Hardhat chain will instantly fund your wallet.

The "First-time local wallet?" hint inside the **Wallet** card on the page tells you the same thing in plain English.

You only need to do this once per burner wallet.

## Sponsor flow

The Sponsor section is where the bounty is created and funded.

1. **Mint fake demo money.** Click **Mint fake demo money**. Your wallet PRIZE balance jumps by 10,000. (You can click this multiple times.)
2. **Fill the bounty form:**
   - **Judge wallet address.** The wallet that will pick the winner. The **Mine** button autofills your own address — handy if you are playing all roles.
   - **Prize token.** The fake PRIZE token. The **Demo token** button autofills the local MockERC20 address.
   - **Prize amount.** How much PRIZE to lock up. Default is `1000`.
   - **Submission deadline.** Defaults to one hour from now in your local time.
   - **Bounty description.** A free-text label. Defaults to `PrizeLock demo bounty`.
3. **Click "Create bounty".** Confirm the transaction in your wallet. The "Load bounty ID" field fills in automatically.
4. **Click "Approve prize escrow".** This grants the escrow contract permission to pull your PRIZE. Confirm in your wallet. The "Escrow allowance" line should match the prize amount.
5. **Click "Fund prize escrow".** This actually moves the PRIZE into the escrow contract. Confirm in your wallet.

After step 5, the **Bounty Status** card at the bottom shows status `Funded`, your wallet PRIZE balance has dropped by the prize amount, and the demo progress strip shows two green steps.

## Hacker submission flow

The Hacker section is where project entries are added. **These submissions never touch the blockchain** — they live only in your browser's localStorage. That is on purpose for the MVP.

1. Fill in:
   - **Hacker or team name** (free text)
   - **Payout wallet** — the address that will receive the prize if this team wins. The **Mine** button autofills your connected wallet.
   - **Project URL** (e.g. a GitHub link)
   - **Short notes** (optional)
2. Click **Add project submission**.

The submission appears in the Judge section below. You can add as many as you want. You do **not** need to be connected to a wallet to add a submission.

## Judge flow

The Judge section is where the winner is picked and paid.

1. **Connect the judge wallet.** Whatever address you set as `Judge wallet address` when creating the bounty must be the connected wallet now. If a different wallet is connected, the **Release prize** button stays disabled and a small note says "Connect the judge wallet to release the prize."
2. **Pick a submission.** Click the radio next to one of the submission cards. Its payout wallet appears in the "Selected payout wallet" line.
3. **Click "Release prize".** Confirm the transaction in your wallet.

After confirmation:

- A green box appears with the winner address and the payout transaction hash.
- The Bounty Status card flips to status `Awarded`.
- The winner's PRIZE balance increases by the prize amount.

## How to verify payout

You can verify the payout three ways, any of which is enough:

1. **In the app.** The green "Winner selected and paid" box on the Judge card shows the payout transaction hash. The Bounty Status card shows `Awarded` and the winner address.
2. **In the wallet.** Switch the connected wallet to the winner's address. The PRIZE balance shown in the Sponsor card's "Wallet PRIZE balance" line will equal the prize amount.
3. **In the block explorer.** Open `http://127.0.0.1:3000/blockexplorer`, paste the payout transaction hash from the green box, and inspect the transfer event.

## How to verify bounty status

The **Bounty Status** card near the bottom of the page reads directly from the smart contract via `getBounty(bountyId)`. It shows:

- Sponsor, Judge, Prize token, Prize amount, Deadline, Winner, Status, Description.

Possible status values:

- `Created` — bounty exists, prize not yet funded.
- `Funded` — prize is locked in escrow, ready to be awarded.
- `Awarded` — prize has been paid to the winner. Terminal state.
- `Refunded` — prize was returned to the sponsor after the deadline. Terminal state.

If you refresh the page, type the bounty id back into the **Load bounty ID** input to repopulate this card. The bounty id always starts at `1` for a fresh deploy.

## (Optional) Refund flow

If a bounty is `Funded` but never gets a winner, the sponsor can pull the money back **after** the deadline:

1. Wait until the deadline shown in Bounty Status has passed.
2. Connect the **sponsor** wallet.
3. In the **Refund** card, click **Refund sponsor**.

Status flips to `Refunded` and the PRIZE returns to the sponsor's wallet.

If the button is clicked before the deadline, the contract correctly rejects the call with `Deadline not passed`. The button shows a small note warning about this.

## Known limitations

These are intentional shortcuts for the MVP. Do not be surprised by them.

- **One bounty at a time in the UI.** The page loads one bounty by id. There is no list view or search.
- **Submissions are browser-local.** They are stored in `localStorage` under `prizelock-demo-submissions`. Different browsers, devices, or incognito windows do not share submissions. Clearing site data wipes them.
- **A page refresh forgets the active bounty id.** Type it back into "Load bounty ID" (it is `1` after a fresh deploy, then increments).
- **The deploy script mints 1,000,000 PRIZE to the deployer** every time. Useful for demos, but means anyone running deploy locally is instantly "rich".
- **`MockERC20` is open-mint.** Anyone can mint any amount to any address. This is fine because the token only exists locally — but it means PrizeLock is **not safe to deploy to a public chain as-is**.
- **No reentrancy guard on the escrow.** Safe today because the only token in play is the plain OpenZeppelin `MockERC20`, but any future support for arbitrary tokens should add `ReentrancyGuard`.
- **Local-only.** The deploy script throws on any network other than `hardhat` or `localhost`.

## Troubleshooting common local issues

**The page does not load at `http://127.0.0.1:3000`.**
Check terminal 3 (`yarn start`) — it must show `Ready` and a local URL. If port 3000 is taken, the app may have started on 3001 — check the terminal output.

**"Connect a wallet" buttons are disabled.**
Click the connect button in the top-right and pick the Burner Wallet. Make sure the Network row in the Wallet card says `Hardhat`. If it does not, switch your wallet to chain id `31337`.

**"Switch to the local Hardhat chain" warning shows in yellow.**
Your wallet is on a different network. Switch to Hardhat (chain id `31337`).

**Mint button does nothing or fails with "insufficient funds for gas".**
The burner wallet has no ETH. Use the **Faucet** button at the bottom-left to send some local ETH to your address, then try again.

**`Deadline must be future` error when clicking "Create bounty".**
Pick a deadline at least a few minutes in the future. The default is one hour out, in your local time.

**`Incorrect token amount received` error when funding.**
You are trying to fund with a fee-on-transfer token. The escrow rejects these on purpose. Use the demo PRIZE token (the **Demo token** button autofills it).

**"Approve prize escrow" succeeded but "Fund prize escrow" is still disabled.**
The allowance has to fully confirm before the Fund button enables. Wait a couple of seconds and the page should re-read it. If not, refresh, retype the bounty id, and try again.

**Release prize is disabled.**
Either (a) the connected wallet is not the judge, (b) no submission is selected, (c) the bounty is not in `Funded` status. The page shows the reason inline.

**The page lost my bounty after a refresh.**
Type the bounty id (e.g. `1`) into "Load bounty ID". The Bounty Status card will repopulate from the contract.

**`yarn deploy` fails with "PrizeLock MVP deploy is local-only".**
This is on purpose. The deploy script refuses to run against any network that is not `hardhat` or `localhost`.

**Everything looks broken after restarting `yarn chain`.**
Restarting the local chain wipes contract state. The bounty ids reset. Run `yarn deploy` again, then refresh the browser, then reconnect the burner wallet (it persists across chain restarts but its on-chain balance does not).

## What is fake demo money vs. real escrow logic

This is the most important thing to understand about the project.

**Fake local demo money:**

- The "PRIZE" token (`MockERC20`) — exists only on your local Hardhat chain. It has no value, no listing, no bridge, nothing.
- The 1,000,000 PRIZE auto-minted to the deployer at deploy time.
- The 10,000 PRIZE the **Mint fake demo money** button hands out on click.
- The local ETH the **Faucet** button sends — also fake, only exists on the local chain.
- All transaction hashes you see — they live only in your local node and disappear when `yarn chain` restarts.

**Real escrow logic:**

- The `PrizeLockEscrow.sol` contract itself. The state machine (`Created → Funded → Awarded` or `Created → Funded → Refunded`), the role checks (sponsor-only funding, judge-only awarding, sponsor-only refunding after the deadline), the balance-delta check that protects against fee-on-transfer tokens, and the `SafeERC20` transfers — these are real Solidity that behaves the same way on any EVM chain.
- The 13 contract tests in `packages/hardhat/test/PrizeLockEscrow.ts` exercise this real logic.

In short: the **token** is fake, the **escrow** is real. The point of the local demo is to prove the real escrow behaves correctly before anyone considers wiring up a real token.

---

## Summary

**Files changed**

- Created `DEMO.md` (this file) at the repo root.

No product code, contracts, deploy scripts, or frontend files were modified.

**Commands run**

None. This was a documentation-only change.

**What still needs manual testing**

The doc itself is the testable artifact. To verify it is accurate, walk through it on a fresh checkout:

1. Run `yarn install`, then `yarn chain`, `yarn deploy`, `yarn start` in three terminals.
2. Open `http://127.0.0.1:3000`.
3. Follow the **Sponsor flow → Hacker flow → Judge flow** sections verbatim and confirm each step matches what the UI shows.
4. Confirm the **Verify payout** and **Verify bounty status** sections are accurate.
5. Try at least two **Troubleshooting** entries on purpose (e.g. attempt to fund without approving, attempt to release with the wrong wallet) and confirm the described behavior.

If any sentence in the doc does not match what the user sees, fix the doc, not the code.

**Next recommended prompt**

> "Walk through DEMO.md on a fresh checkout, end to end. Note any step where the UI does not match the doc, and propose a doc-only fix. Do not change product code."

Once the doc is verified to match the working app, the natural follow-up is the prompt that addresses the only Base-Sepolia blocker that is also a quick win: capping `metadataURI` length in `PrizeLockEscrow.sol` and restricting `MockERC20.mint` behind `Ownable`. Suggested prompt:

> "In `PrizeLockEscrow.sol`, cap `metadataURI` to a sensible byte length (e.g. 512). In `MockERC20.sol`, restrict `mint` to the contract owner using OpenZeppelin `Ownable`. Update the existing tests so they still pass and add tests for the new requires. Do not change anything else."
