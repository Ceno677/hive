# Credentialed devnet launch rehearsal

Run this rehearsal in a separate temporary Railway environment. Do not replace the mainnet production variables or reuse the mainnet collection.

## Inputs needed for the rehearsal

- A classic SPL devnet test-token mint and enough test tokens for three seat burns, one paid job, payouts and one refund.
- Devnet SOL in the customer, custody and three distinct operator wallets. Private keys stay in local/Railway secret storage and are never pasted into chat or committed.
- A fresh devnet Metaplex collection whose update authority is the staging custody wallet. The permanent seat metadata may use the already verified Arweave base URI.
- The GitHub App installed on a disposable test repository, plus the staging callback URI.
- The Docker executor and three independently paired seat operators: one builder and two reviewers.

## Staging-only settings

Use the devnet Helius endpoint, `SOLANA_CLUSTER=devnet`, the test CA as `HMD_MINT`, the calculated `HMD_BURN_AMOUNT`, and `DEVNET_TEST_HMD_PRICE_USD=0.10`. The fixed test price exists only because an unlisted devnet token has no DEX market. Configuration rejects it on `mainnet-beta`.

Keep holder distributions disabled until the ordinary payout/refund path passes. Use separate PostgreSQL/Redis data or a temporary Railway environment so test seats and payments never enter production records.

## Required end-to-end proof

1. Bind the test mint with `npm run nft:bind-hmd`; verify its program, decimals and exact 8,888-token raw amount.
2. Run `npm run launch:check`; every dependency must pass before payments are enabled.
3. Mint one seat from the website and verify burn amount, immutable metadata, verified collection, owner and database receipt.
4. Mint a second seat to the same wallet, then prove a third mint is rejected. Mint the reviewer seats to distinct wallets.
5. Request a real AI-priced build, inspect the 50%-of-market quote, pay with test HMD and verify the exact transfer plus memo.
6. Let the builder build, two independent reviewers check it, and the trusted final check pass. Confirm no reward exists before delivery.
7. Approve GitHub delivery to the disposable repository. Inspect the branch, tests, evidence and final artifact; then verify exact builder/reviewer/treasury accounting and retry idempotency.
8. Fund a second job, miss its shortened staging deadline and verify a full refund with no rewards.
9. Exercise transfer revocation, invalid signatures, replay, modified transactions, executor timeout, failed checks and service restart recovery.
10. Save transaction signatures, repository URL, test output, model usage and elapsed time as the launch evidence packet.

After the rehearsal, remove `DEVNET_TEST_HMD_PRICE_USD`, disable/delete the temporary environment and rotate any staging-only credentials. Mainnet remains disabled until the real HMD CA passes the live DEX-liquidity gate and the same checklist is repeated with a deliberately small real amount.
