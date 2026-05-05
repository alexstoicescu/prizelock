# PrizeLock — Secrets & Env Handling

Short rules to keep secrets out of the repo. Read this before the first `git push` to GitHub.

Last updated: 2026-05-05.

## Current state (2026-05-05)

- **No git remote is configured.** Nothing in this repo has been pushed anywhere yet.
- **No `.env` file exists on disk.** Only the empty templates `packages/hardhat/.env.example` and `packages/nextjs/.env.example` are tracked.
- **`.env` files are gitignored** by `packages/hardhat/.gitignore` and `packages/nextjs/.gitignore`.
- **No private keys, seed phrases, RPC keys, Alchemy/Infura keys, real token addresses, or personal credentials** are present in tracked source.
- The contract addresses in `packages/nextjs/contracts/deployedContracts.ts` are deterministic local Hardhat addresses and are **not** secrets.

## Rules

1. **Never commit `.env`.** The gitignores cover it, but run `git status` before every commit and confirm no `.env` is staged.
2. **Never paste a raw deployer private key into any file.** Use `yarn account:generate` (new dev wallet) or `yarn account:import` (existing PK) — both write the encrypted form into `packages/hardhat/.env` for you. The variable is `DEPLOYER_PRIVATE_KEY_ENCRYPTED`.
3. **Treat `NEXT_PUBLIC_*` values as semi-public.** `NEXT_PUBLIC_ALCHEMY_API_KEY` and `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` ship to the browser and are extractable from any deployed frontend. Restrict them by domain / origin in the provider's dashboard rather than relying on secrecy.
4. **Use a throwaway deployer wallet for any future Base Sepolia deploy.** The deployer address becomes public on Basescan. Fund it with testnet ETH only; never reuse your main wallet.
5. **Burner-wallet private keys live in browser `localStorage` only.** They never enter the repo and are wiped when site data is cleared.
6. **Do not commit real token addresses you want kept private.** PrizeLock only uses `MockERC20` today, which is fake by design — but if a real token is ever introduced, treat its address as the project's choice to disclose, not the agent's.

## If a secret was accidentally committed

1. **Stop pushing.** If the commit is local only, the secret has not left your laptop yet.
2. **Rotate the secret first.** Generate a new key / new wallet in the provider's dashboard. Treat the old value as compromised even if no push happened.
3. **Then clean history.** Reset or rebase the offending commit out, or use `git filter-repo` for older history. Do not assume `git rm` alone is enough — the value remains in history.
4. **If the commit was pushed,** assume it is harvested. Rotate, then clean history, then force-push (with the project owner's explicit authorization).

## Pre-push checklist

Before the first `git push` to a public GitHub repo:

- [ ] `git status` shows no `.env`, `.env.local`, or other secret-bearing file.
- [ ] `git ls-files | grep -iE '\.env($|\.)'` lists only the two `.env.example` templates.
- [ ] The two `.env.example` templates contain only blank values.
- [ ] `git log --all -- '**/.env' '.env'` returns nothing (no `.env` ever committed).
- [ ] No private key, seed phrase, or API key string is present in any tracked file.
- [ ] WalletConnect project ID and Alchemy key (if used) are domain-restricted in their respective dashboards.
- [ ] Deployer wallet (if a Base Sepolia deploy is planned) is a throwaway, not a personal wallet.
