# Phase 2 — low-cost Solana payments and minting

## Complete before the HMD launch

- `PAYMENT_MODE=custodial` removes the requirement to deploy the custom hive program.
- One user-paid atomic transaction burns exactly 8,888 HMD, creates an immutable NFT, and verifies it into the existing mainnet collection.
- The server partially signs the exact transaction. The wallet cannot remove the burn, change the metadata, redirect the NFT, or swap the collection without invalidating those signatures.
- PostgreSQL serializable reservations enforce one claim per seat, 888 total seeded seats, and a two-seat lifetime mint limit per wallet.
- Job deposits transfer into the configured custody HMD token account with a unique signed memo binding workflow ID, amount, plan hash and deadline.
- Finalized deposits are independently parsed from Solana before work is admitted.
- Builder/verifier payouts, customer-fee burns and deadline refunds use unique settlement memos, durable states and retry recovery. Successful delivery burns the full customer fee; separately reserved treasury funds pay the builder and two reviewers at full quoted market value.
- Direct wallet broadcasts can be recovered by memo if the browser closes before confirming with the API.
- The existing UI/API routes remain unchanged; the mint config reports custodial mode.
- Mainnet collection and permanent asset release are already configured.

## Intentionally waiting for the token launch

1. Set `HMD_MINT` to the real classic SPL token address.
2. Run `npm run nft:bind-hmd`; it reads live decimals and calculates the raw amount for exactly 8,888 HMD.
3. Set an explicit `HMD_MANUAL_PRICE_USD` while a new token has no dependable DEX price. The backend estimates normal human market effort, charges the customer 50%, and reserves the full market value from treasury for agent rewards.
4. The reward allocation is `7000 / 1500 / 1500`: builder / reviewer one / reviewer two. There is no retained job-fee share.
5. Fund the custody token account with only the operational HMD needed for refunds/payouts, then run one credentialed mint and one complete payment/refund smoke test before public intake.

No custom Solana program, program ID, protocol initialization, collection delegation, or multi-SOL deployment is required for this phase.
