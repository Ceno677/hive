# hive.md backend audit

Audit date: 2026-09-26

Scope: the public hive.md launch description, `BACKEND-HANDOFF.md`, the supplied backend prompt, the current frontend/NFT lock, the API, scheduler, worker daemon, database migrations, Solana client/program, delivery adapters and tests. The imd.fun documentation was used as a product reference for capability-aware quoting, device/seat identity, immutable artifacts, independent verification, staged delivery and inspectable proof records; hive.md remains its own Solana/HMD implementation.

## Result

The source implementation covers the promised build → independent verify → ship lifecycle and fails closed when a required integration is absent. It is configuration-ready for a credentialed staging run. It is not honestly production-approved until the real addresses/keys exist, the Anchor program passes validator/devnet attack tests and an independent Solana security review, and representative paid-model builds pass manual product inspection.

| Public promise | Source status | Evidence / boundary |
| --- | --- | --- |
| 888 NFT seats | Implemented | Program supply cap and locked 888-image collection; mint price is exactly 8,888 HMD after reading token decimals. |
| Maximum two seats per wallet | Implemented for minting | The program pins a two-mint wallet counter. Conventional transferable NFTs cannot prevent a wallet from later receiving additional NFTs; agent independence still treats a wallet as one owner. |
| Burn HMD and atomically mint the NFT | Implemented | One Anchor instruction burns classic SPL HMD and creates/verifies the NFT, master edition and request receipt. Needs live validator/devnet proof. |
| NFT is the agent identity/access seat | Implemented | Wallet-signed pairing, current collection/ownership check, scoped credential, revocation and bounded transfer recheck. |
| Independent operators connect machines/agents | Implemented | `npm run agent:pair`, holder-local wallet key and provider secrets, heartbeat/capability protocol and daemon. Customers requesting builds remain web-only. |
| Dynamic HMD price shown before payment | Implemented | AI effort estimate, configured market benchmark, 50% charge, short quote lock, idempotency and exact prepared-message verification. New tokens may use a disclosed manual launch price; removing it restores liquidity-checked DEX conversion. |
| Escrow and full deadline refund | Implemented | Per-job PDA escrow, finalized admission, deadline bound into funding, coordinator refund plus requester-signed onchain fallback after expiry. |
| Specialized agents collaborate | Implemented | Validated DAG, capability matching, atomic claims, fenced leases, immutable artifact overlays and maximum 12 tasks. |
| Builder writes code and runs tests | Implemented | Bounded build/test/critique/repair loop inside network-disabled resource-limited containers. |
| Separate agents verify | Implemented | Builder cannot review; two distinct wallets/seats by default; deterministic rerun plus independent semantic check for every review. |
| Higher-quality assignment process | Implemented | Capability/capacity gate before charging, Bayesian-smoothed reputation cutoffs, correct-rejection credit and repeated-pairing penalty. |
| Accepted code goes to GitHub | Implemented | Artifact-bound owner approval, deterministic retry-safe branch, commit SHA/branch/repository record; payout waits for this delivery. |
| Websites/programs can deploy | Implemented with boundary | Netlify draft validation and devnet Solana staged deployment exist. Automatic mainnet program deployment is deliberately blocked. |
| Treasury-funded agent rewards and fee burn | Implemented | Capacity is reserved before work starts. Full market value is split 70% to the builder and 15% to each of two reviewers; after payout the complete customer fee burns with retry-safe receipts. |
| Inspectable proof of work | Implemented | Opt-in sanitized workflow/task/event/worker/artifact APIs, hashes, identities, decisions, timestamps and delivery URLs; source and private briefs remain authorized-only. |
| Periodic holder distributions | Disabled | Job fees no longer fund this ledger. A separate treasury-funded pool must be deliberately implemented and tested before enabling holder payouts. |

## Important controls verified in source

- Wallet challenges are one-time, expiring Ed25519 messages; session cookies are HttpOnly/SameSite and mutations require CSRF.
- Quote creation, claims, submissions, reviews, publication and chain operations are idempotent or transactionally fenced.
- Worker output is path-bounded, size-bounded, secret-scanned and executed without network, host mounts, capabilities or production secrets.
- Production startup requires HTTPS, trusted-proxy handling, private object storage, an operations token and Turnstile.
- Model requests use private response storage, role-specific model selection, reasoning controls, bounded input/output, timeout, exponential retry and truncation rejection. Usage logs contain tokens/model/request ID, not prompts or source.
- Primary RPC calls have a configured backup; NFT checks are cached for at most the configured 15–300 second interval to bound both transfer-revocation latency and RPC load.
- Public proof routes remove prompt, task instructions, policy, source bundles and review evidence text.
- Rewards do not exist until final validation and mandatory GitHub delivery. Deadline expiry cancels active leases before refund.

## Findings closed during this audit

1. Fixed role-specific AI settings being incorrectly rejected when `AI_MODEL` was blank.
2. Added the OpenAI Responses API path and production model resilience controls.
3. Activated backup Solana RPC failover instead of documenting an unused endpoint.
4. Added sanitized proof endpoints for public workflows, tasks, events, workers and artifact metadata.
5. Converted the pairing CLI from project-operator-only wording to NFT-holder pairing and retained a local device key.
6. Added verifier disagreement reputation, correct-rejection credit, minimum reputation gates and anti-repeat pair selection.
7. Added Turnstile server verification and an interaction-only widget in the existing dialog style.
8. Replaced the single global customer-program address with a stable, separately derived address per Solana-app workflow and bound it into planning, approval and deployment verification.
9. Added PostgreSQL + Redis readiness, deadline alerts and a comprehensive read-only launch checker.
10. Capped client-supplied plans at the same 12 tasks promised to the planner, closing a fixed-price cost-amplification path.
11. Added versioned database migrations and increased transaction acquisition tolerance after a real concurrency test exposed a transient startup timeout.

## Remaining launch blockers (external evidence, not missing source claims)

1. Real HMD mint, collection address, metadata base URI, split, treasury, deadline and a liquid HMD/USD market.
2. Protected coordinator/deployment keypairs and funded devnet accounts.
3. OpenAI, primary/backup RPC, R2, GitHub App, Netlify, PostgreSQL/Redis, Turnstile and hosting credentials.
4. At least three independent online wallets for one builder plus two reviewers; five agents are recommended for a short public launch.
5. A complete offline Solana build image if Solana-app jobs are sold.
6. Credentialed staging builds for a website, interactive application and permission/failure-heavy Solana program.
7. Validator/devnet attack tests, independent program review, backup/restore drill, publication-recovery drill and launch-volume test.

`npm run launch:check` is the final read-only configuration/dependency gate. It intentionally returns nonzero until the real environment is supplied.

## Verification evidence from this workspace

- `npm run check`: collection lock, browser JavaScript syntax, TypeScript and unit suite passed; 888/888 approved artworks remained unchanged.
- `npm run test:integration`: 55/55 tests passed using a temporary PostgreSQL schema and real Docker isolation.
- `npm run test:browser`: wallet-signed login, current dialogs, honest unavailable states, theme and mobile passed without page errors.
- `npm run test:program`: native Anchor/Rust tests are part of the final gate, but do not replace validator/devnet transaction tests.
