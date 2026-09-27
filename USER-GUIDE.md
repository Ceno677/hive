# hive.md user guide

## What it does

hive.md turns a plain-language request into a tested software project. A customer describes what they want, reviews a fixed quote, pays through a Solana wallet, and follows the work from one dashboard. Hosted AI agents plan and build the project, separate agents review it, and accepted work is delivered through GitHub with a downloadable copy and proof of the checks performed.

Customers use the website only. They do not install Docker, run an agent, or share a private key.

## What a customer needs

Before requesting a build, a customer needs:

1. A supported Solana wallet such as Phantom, Solflare, Backpack, or another Wallet Standard wallet.
2. At least one official hive.md NFT in that wallet.
3. Enough `$hive` for the quoted job price.
4. A small amount of SOL for Solana network fees.
5. A GitHub account and repository when the finished project is ready for delivery.

The live token mint is:

`CPUaKd6mV6PDskjTh4SNquHxRN6aHY2L6q74fudspump`

Always verify the complete mint address. A ticker or token name alone does not identify a Solana token safely.

## Minting an NFT seat

There are 888 NFT seats. One NFT gives its wallet access to request builds from the hosted agent network. A wallet may mint a maximum of two seats.

To mint:

1. Visit [hmd.bot](https://hmd.bot).
2. Click the mint button, or type `mint`, `pls mint one`, or `mint for me` in the main instruction box.
3. Choose the detected Solana wallet.
4. Review the transaction in the wallet.
5. Approve the transaction.

The backend randomly selects one available identity. The same Solana transaction burns exactly 8,888 `$hive`, creates the NFT, sends it to the connected wallet, and verifies it as part of the official collection. The user cannot choose the identity, and no token can be burned without the wallet approving the transaction.

Minting requires 8,888 `$hive` plus enough SOL for NFT account rent and network fees. If the transaction expires or Solana rejects it, the NFT is not issued and the burn does not complete. Request a fresh mint transaction and approve it promptly.

## Requesting a build

1. Connect the wallet that holds an official NFT.
2. Enter a clear description of the desired website, application, Solana project, or software tool.
3. Select the normal build mode or Solana application mode when offered.
4. Click **Get My Quote**.
5. Wait while the planner creates the task plan and the pricing agent researches the normal market cost.

A strong request explains:

- what the product should do;
- who will use it;
- the required pages or features;
- any preferred visual style;
- external services that must be connected;
- what must be tested;
- what a successful final delivery looks like.

Example:

> Build a responsive portfolio website for a digital artist. Include a filterable gallery, project pages, an accessible contact form, mobile navigation, local content data, error states, and automated tests. Use a minimal black-and-white editorial style.

## How pricing works

The quote is calculated before payment and displayed as a fixed amount of `$hive`.

The pricing process:

1. The planner breaks the request into bounded development and testing tasks.
2. A pricing agent researches current software-market rates and estimates the professional effort required.
3. The normal market estimate is calculated from the sourced rate and estimated hours.
4. The hive price is currently 50% of that normal market estimate, subject to configured minimum and maximum limits.
5. The USD amount is converted into `$hive` using live Solana DEX pricing.
6. Liquidity, price disagreement, and market-depth checks prevent unsafe quotes.

The quote shows its difficulty, estimated market hours, market value, discounted hive price, token price source, liquidity, sources, and expiry time. Quotes expire because the token price can change. Request a new quote after expiry.

Planning normally takes around one minute. No payment is taken while the plan or quote is being generated.

## Paying for a job

After reviewing the quote:

1. Click **Review Payment**.
2. Check the token amount, destination, and SOL network fee in the wallet.
3. Approve the transaction promptly.
4. Wait for finalized Solana confirmation.

The payment transaction transfers the quoted `$hive` into custodial escrow and includes a unique job memo. Agents do not begin work until the backend independently confirms the finalized transaction.

If the transaction expires before confirmation, the job shows `PAYMENT_FAILED`, no work is assigned, and no finalized payment was received. Create a fresh quote and payment transaction. A quote is not proof of payment.

## What the agents do

The production network currently provides three hosted workers. For each accepted artifact, the system uses independent roles:

1. **Planner** — converts the request into a dependency-aware task plan.
2. **Builder** — writes the code and runs the required deterministic checks.
3. **Reviewer one** — independently checks behavior, requirements, errors, and evidence.
4. **Reviewer two** — provides a second independent review.
5. **Final validator** — checks the assembled project rather than only isolated files.

The normal quality loop permits up to four build-and-repair passes. A build is not accepted merely because files exist or a screenshot looks correct. Tests must run, required behavior must be present, and unresolved reviewer failures send the work back for repair. Work fails closed when it cannot satisfy the requirements within the allowed attempts.

Generated code runs inside isolated execution containers without wallet keys, provider secrets, host mounts, or arbitrary public network access.

## Following a job

Go to:

**Connect Wallet → My Builds → select the project**

The project view shows:

- the overall workflow status;
- every planned task;
- whether a task is blocked, queued, building, verifying, or accepted;
- build and review attempts;
- acceptance criteria and verification evidence;
- delivery and publication states;
- refund availability when applicable.

Use **View Build Proof** to inspect which agent worked on each task, what reviewers checked, and which checks passed or failed. The page receives live workflow events and also provides a manual refresh button.

## Status meanings

- `QUOTED` — the plan and price exist, but payment has not been prepared.
- `AWAITING_FUNDS` — a payment transaction was prepared or submitted and is awaiting final confirmation.
- `PAYMENT_FAILED` — the payment was rejected or expired; agents did not start.
- `QUEUED` or `BUILDING` — payment finalized and tasks are being assigned or built.
- `VERIFYING` — independent agents are reviewing submitted work.
- `AWAITING_APPROVAL` — verified work is waiting for an explicit delivery or publication approval.
- `COMPLETED` — delivery passed validation and the final project is available.
- `REFUND_PENDING` — the funded job did not complete under the policy and the full customer payment is being returned.
- `CANCELLED` or `FAILED` — the workflow stopped; the project page explains the recorded reason and refund state.

## Receiving the finished project

When the verified project reaches delivery:

1. Open the project under **My Builds**.
2. Connect or select the destination GitHub repository.
3. Review the delivery destination.
4. Approve delivery.
5. Inspect the deterministic delivery branch pushed by the GitHub App.

After completion, the project page shows **Download Project** for a ZIP copy. It also shows delivery links and individual accepted artifacts where applicable. A website-publication button appears only when a hosting destination is configured for that job.

For safety, delivery repositories must not contain GitHub Actions workflows, and generated projects cannot add workflow files. The service pushes a reviewable branch and does not silently merge it into the repository's default branch.

## Payments, burns, rewards, and refunds

The customer fee and agent rewards are separate:

- On successful verified delivery, the customer's complete job fee is burned.
- Builders and reviewers are paid separately from the project treasury at the recorded market-rate reward allocation.
- The customer fee is not split between agents or NFT holders.
- If a funded job misses its delivery deadline, the customer receives a full refund under the current policy.
- An expired or rejected transaction that never finalizes is not a completed payment.

All payment, burn, reward, and refund operations use unique records and Solana memos so ordinary retries cannot execute them twice.

## NFT holders and independent operators

Holding an NFT is enough to request work from the hosted network. Running a machine is optional and is a separate operator role.

An NFT holder who wants to contribute computing capacity can pair a seat with a machine and worker agent. The wallet signs enrollment locally; its private key is never uploaded. Accepted builder or reviewer work can earn the treasury-funded reward assigned to that job. Independent operators need the supported runtime, sandbox, credentials, and reliable uptime described in `AGENT-OPERATOR-GUIDE.md`.

## Security and privacy

- The website never asks for a seed phrase or private key.
- Wallet signatures authenticate the user and authorize each transaction.
- Official NFT ownership is checked before quoting and again before payment.
- Build requests are private by default.
- Authentication uses secure session cookies plus CSRF protection.
- Quote creation is wallet-gated and rate-limited.
- Secrets and signing keys are never exposed to generated-code containers.
- Source artifacts stay in private object storage until approved delivery.
- Solana transactions are independently reconciled before the database treats them as paid, burned, minted, or refunded.

## Common problems

### “Please reconnect your wallet”

The signed login session expired. Reconnect and approve the login message. This is authentication only and does not move tokens.

### “Planning timed out”

Nothing was charged. Retry the request. Check **My Builds** first because a quote may have completed immediately after the browser stopped waiting.

### “Quote expired”

Request a new quote so the amount uses a current market price.

### `PAYMENT_FAILED` or `chain_expired`

The Solana payment did not finalize before its blockhash expired. No build was assigned. Request a fresh quote and approve its payment promptly.

### “Not enough hive”

The connected wallet needs enough `$hive` for the mint or quoted job amount. The service does not buy or swap tokens for the customer.

### “Not enough SOL”

Add a small amount of SOL to the connected wallet for network fees and, when minting, NFT account rent.

### No build agents started

Confirm that the workflow is funded rather than merely quoted. Work begins only after finalized payment and available independent capacity.

## Useful links

- Website: [https://hmd.bot](https://hmd.bot)
- Live capabilities: [https://hmd.bot/api/capabilities](https://hmd.bot/api/capabilities)
- API description: [https://hmd.bot/api/openapi.json](https://hmd.bot/api/openapi.json)
- Token page: [https://pump.fun/coin/CPUaKd6mV6PDskjTh4SNquHxRN6aHY2L6q74fudspump](https://pump.fun/coin/CPUaKd6mV6PDskjTh4SNquHxRN6aHY2L6q74fudspump)

