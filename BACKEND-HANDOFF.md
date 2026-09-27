# hive.md backend handoff

Build the Solana backend for the existing hive.md frontend. Preserve the approved frontend design, working theme switch, ASCII controls, NFT artwork and trait names. Start by reading README.md and DASHBOARD-API.md.

Implementation now exists: consult BACKEND-README.md and IMPLEMENTATION-STATUS.md. Customers create projects entirely on the website and never install Docker. NFT holders may independently pair a machine and agent as network operators; project-operated agents provide baseline capacity. Preserve the exact current UI style for all additions.

## Current product rules (this supersedes older copy)

- Collection: 888 NFT seats. One NFT is an agent's network identity and the access key for requesting builds. A customer must hold at least one NFT and still pay the quoted HMD job fee. Holders may also operate agents; customers build in the website.
- Minting is now BURN-TO-MINT. The user asks the hive agent to mint, connects a Solana wallet, reviews the required $HMD amount and approves the transaction. The required tokens are burned and an NFT seat is minted to the wallet. Never burn the NFT itself.
- Do not implement free minting. The current frontend still has older free-seat/no-burn copy in places. Update that copy and the mint dialog when integrating. The burn amount, token mint address, program ID and gas sponsorship policy are not configured; get these values from the project owner rather than inventing them.
- Owner-confirmed wallet limit: at most two NFT seats per wallet. The final program initialization must pin this value.
- Jobs are paid in $HMD. Agents build, independent agents verify, and accepted work is delivered. Operators earn a share of accepted jobs. Fee splits, escrow rules, refunds and payout amounts need product decisions.
- There is no specified ongoing buyback/job-fee burn mechanism. The confirmed burn is the mint payment.
- Delivery can include GitHub repositories, live websites and Solana deployments. Require appropriate owner authorization before deployments or external writes.

## Files

- site/: complete static main frontend, artwork controls, theme toggle, job draft/mint dialogs and dashboard.
- site/studio/: NFT collection studio, 888 approved PNGs in art/, per-NFT metadata in metadata/, collection.json with trait frequencies, ranks and seeds.
- site/data/identities.json: lightweight collection identities used by the dashboard. An identity is not proof of a minted NFT or a connected runtime.
- nft-source/: generation source, locks and collection verifier. Do not regenerate or alter the approved collection.
- DASHBOARD-API.md: existing public feed schema and browser configuration.
- netlify.toml and package.json: static deployment/build configuration.

## Implementation work

1. Add Solana wallet connection and challenge-based authentication with replay protection; keep keys and service credentials server-side.
2. Implement a burn-to-mint program/transaction flow that validates the token mint and required amount, enforces the 888 supply cap and selected eligibility rule, and prevents duplicate requests. Burn and NFT issuance should succeed or fail together. Show the quote, approval, signature, confirmation and errors clearly.
3. Assign approved collection IDs exactly once. Pin immutable artwork and metadata to durable URLs; local relative image URLs must be resolved before onchain minting. Preserve all approved pixels, traits, seeds and ranks.
4. Verify current NFT ownership when granting runtime access. Handle transfers and revocation. Connect machines/agents through authenticated registration, heartbeats and scoped credentials.
5. Build a persisted job queue and payment/escrow lifecycle: quoted, funded, queued, building, verifying, accepted/revision, delivered, paid/refunded. Define retry and cancellation behavior without double payouts.
6. Run jobs in isolated environments. Use a separate verifier, store test/review evidence, and never treat an agent's self-report as independent verification.
7. Wire the public dashboard snapshot contract from DASHBOARD-API.md. Return real authorized public activity only, excluding private briefs, secrets and sensitive runtime logs.
8. Replace frontend placeholder actions with integrated flows. Preserve the visitor terminal as local-only entertainment/inspection unless a separately authenticated action flow is deliberately designed.
9. Test mint failures, replay requests, supply limits, ownership transfers, duplicate jobs, verifier failures and payout retries on devnet before mainnet.

## Preview and validation

Run `npm run build` with Node 22+. This checks all 888 approved PNGs and the manifest against the lock, plus JavaScript syntax.
Run `python -m http.server 4319 --directory site` and open http://localhost:4319/. The NFT studio is at /studio/.

This package is frontend and collection source only. It contains no deployed mint program, token address, private keys, working wallet integration, agent execution service or funded job/payment backend. Do not present those actions as working until integrated.
