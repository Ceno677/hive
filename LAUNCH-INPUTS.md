# What the owner needs to provide

Confirmed: one NFT burns **8,888 HMD**. Users build in the website, without local software. Keep the current UI. Prioritize agent output quality over choosing the cheapest model; this is not authorization for unlimited spend or purchasing services.

## Public information and product choices

1. HMD token mint address and intended network when it launches. `npm run nft:bind-hmd` verifies the live classic SPL mint, reads decimals and calculates the exact raw amount for 8,888 HMD. Token-2022 is not supported.
2. Permanent Arweave images, metadata and the mainnet collection are complete. Confirm public `arweave.net` propagation before opening minting.
3. Public website domain and where its frontend is currently hosted.
4. Confirmed wallet cap: two NFTs per wallet.
5. Confirmed: a customer wallet must hold at least one hive.md NFT and also pay the quoted HMD job fee. The backend checks live collection ownership before quoting and again before payment. Holding a seat also lets its owner pair one agent; it does not automatically create a cloud machine or provider account.
6. Confirmed dynamic quote policy: AI-scoped human market estimate with the customer charged 50%. Treasury pays the full market reward—70% builder and 15% to each of two reviewers—then the complete customer job fee burns. The burn-to-mint payment is also burned; AI and hosting need a separate funded budget.
7. Confirm user-paid SOL fees and final-completion rewards/full refund before vesting, or specify another policy for implementation.
8. Job deadline in whole hours, from 1 to 168. It is disclosed before payment and starts at finalized funding. Missing it produces a full refund.
9. GitHub App credentials. Configure the App callback URL as `https://hmd.bot/api/github/callback` and grant repository Contents read/write plus Metadata read. Customers can authorize installations and select only repositories GitHub reports they can push to. A single operator-owned installation is still supported as a fallback.
10. AI/server budget and provider-project spending limit. Quality-first does not mean unlimited spending. The backend bounds task count, input/output size, repair passes and retries and logs usage, while the provider project limit is the launch-wide dollar circuit breaker.
11. Distribution confirmation. The implemented launch default is every 72 hours, proportional per NFT, with no more than two eligible seats per wallet. Confirm the minimum raw HMD amount, if any, before enabling it.

## Credentials to configure privately, never paste in chat

- AI provider API key with billing enabled. Choose strong compatible models for planning, building, reviewing and final validation. Role-specific model IDs are supported within the configured provider; alternate providers can use separate hosted processes.
- Hosting account access for persistent API/scheduler/agents, PostgreSQL, Redis and private S3-compatible storage.
- Production Solana RPC credential and protected, funded operator/signing wallets. Keep seed phrases/private keys in your secret manager.
- Netlify credentials for site publishing; GitHub App credentials if repository delivery is offered.
- Collection authority and deployment keypairs generated/stored securely by the operator, not sent through chat.

## Quality launch gate

Do not open paid builds solely because unit tests pass. Run a small representative benchmark with actual model credentials: a responsive site, interactive app with meaningful tests, and a Solana devnet program with failure/permission tests. Inspect actual browser behavior and code, not screenshots alone. Measure task completion, independent-review defects, retry count, elapsed time and real provider usage. Reject broken controls, fabricated integrations and misleading success output. This benchmark has not run yet.

Confirmed settlement behavior: an AI-scoped quote estimates normal market cost and shows a five-minute HMD fee equal to 50% of that USD estimate; payment enters the pooled custody token account and a per-job database subledger records the obligation. Before work starts, the backend reserves the customer's fee plus a full-market-price reward from treasury. Rewards are created only after verified GitHub delivery and split 70% to the builder and 15% to each of two reviewers; after payout, the complete customer fee burns. Missing the delivery deadline triggers a full refund. Job fees do not fund NFT-holder payouts. This short-launch mode is custodial, not a trustless on-chain escrow.

Before public launch also finish the credentialed devnet program/attack tests, offline Solana toolchain image, publication recovery drill, backups/restore drill, load testing and independent security review. Arbitrary generated backend hosting and automatic mainnet program deployment are not currently supported.

Run `npm run launch:check` to list missing settings, calculate the exact mint base-unit amount and perform read-only checks against PostgreSQL, worker capacity, both RPCs, the deployed policy, key material, artifact storage, GitHub, Netlify, model access, the remote executor and the holder snapshot provider. It does not deploy, spend, purchase or modify configuration. A zero exit status still does not replace the credentialed build benchmark or independent security review.
