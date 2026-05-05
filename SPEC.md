# PrizeLock MVP Spec

PrizeLock is a minimal bounty payout app for hackathons.

The MVP proves one thing: a sponsor can lock mock ERC20 prize funds in escrow, a judge can pick a winning submission, and the winner can receive the prize on a local chain.

## Goals

- Prove the end-to-end payout flow works.
- Keep the product small enough to demo at a hackathon.
- Use local development only.
- Make the code readable for a non-developer project owner.

## Non-Goals

- Do not build a full hackathon platform.
- Do not support mainnet or real funds.
- Do not build complex profiles, teams, messaging, judging rubrics, or sponsor dashboards.
- Do not add a database until there is a clear reason.
- Do not add production payment, identity, or compliance features.

## Users

- Sponsor: creates a bounty and funds the prize.
- Hacker: submits a project link.
- Judge: selects the winner.
- Winner: receives the escrowed prize.

For the first MVP, these roles can be represented by wallet addresses. No login system is needed beyond wallet connection.

## First Working Flow

1. Start a local Hardhat chain.
2. Deploy a mock ERC20 token.
3. Deploy the PrizeLock escrow contract.
4. Mint mock tokens to the sponsor account.
5. Sponsor creates a bounty with:
   - title
   - prize token address
   - prize amount
   - judge address
6. Sponsor approves the escrow contract to spend the prize tokens.
7. Sponsor funds the bounty.
8. Hackers submit project URLs.
9. Judge selects one winner.
10. Escrow pays the full prize to the winner.

## Smart Contract Scope

The first contract implementation should be intentionally small.

Expected contracts:

- `MockERC20`: test token for local development.
- `PrizeLockEscrow`: holds bounty funds and pays the selected winner.

Expected escrow behavior:

- Create a bounty.
- Fund a bounty with ERC20 tokens.
- Accept simple project submissions.
- Let the assigned judge choose one winner.
- Pay the winner from escrow.
- Prevent double payout.

Nice-to-have protections:

- Only the sponsor can fund their bounty.
- Only the judge can select the winner.
- Cannot choose a winner before funding.
- Cannot pay twice.
- Cannot submit after payout.

Avoid advanced features until later:

- Platform fees
- Multiple winners
- Partial payouts
- Cancellations
- Disputes
- Upgradeable contracts
- Meta-transactions

## Frontend Scope

Build the smallest usable interface for the local demo.

Required screens or sections:

- Wallet connection.
- Local chain status.
- Create bounty form.
- Approve and fund bounty controls.
- Submit project URL form.
- Submission list.
- Judge winner selection button.
- Payout status.

The frontend can assume one active bounty at first if that keeps the MVP simpler.

## Development Rules

- Use local Hardhat chain.
- Use mock ERC20 only.
- Keep comments short and helpful.
- Prefer direct readable code over abstractions.
- Before adding a feature, check whether it supports the first working flow.
- If a feature does not support the first working flow, defer it.

## Current Status

Project scaffold exists.

Escrow contract is not implemented yet.

Next implementation task: add the mock ERC20 contract, PrizeLock escrow contract, deployment script, contract tests, and the simplest frontend controls needed to run the local payout flow.
