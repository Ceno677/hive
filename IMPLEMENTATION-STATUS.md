# Implementation status

This repository now contains a backend implementation and web integration. It is not a deployed or audited production protocol.

## Implemented

- Fastify API; PostgreSQL/Prisma migrations; wallet-signed authentication with one-time challenges, secure session cookie settings and CSRF.
- NFT-holder/project-agent pairing, capabilities, heartbeats, bounded ownership rechecks, transfer revocation, scoped credentials, transactionally bounded concurrency and fenced leases. NFT ownership is capped at two per wallet by the owner-approved default.
- DAG validation, funded-job admission, immutable artifacts, distinct builder plus two-reviewer quorum, trusted deterministic checks for every review, AI acceptance review, retries and final validation.
- Private workflows/artifacts, authorized SSE, a public opt-in snapshot plus sanitized workflow/task/event/worker/artifact proof APIs, and ZIP downloads.
- Exact prepared-message wallet transaction checks; journals; finalized escrow/mint reconciliation; deadline-bound escrow, requester-signed expired refund, integer reward allocation and idempotent payout/refund/registry PDAs.
- Anchor mint/escrow/registry source, immutable collection URI policy, 888-seat cap, wallet counters, duplicate-request protection, collection verification and NFT master editions.
- Locked 888-image NFT publication pipeline with marketplace metadata, collection metadata, full hash/dimension/trait verification, guarded collection creation, live HMD decimal binding, paused protocol initialization, collection-authority handoff and pause administration.
- Mandatory GitHub branch delivery for ordinary builds, artifact-bound approval and payout only after delivery; Netlify draft publishing and static asset hash validation for staged Solana applications.
- Devnet deployment service and staged program -> deployment -> frontend -> hosting flow, with one deterministic program address per workflow, manifest binding and reward deferral.
- OpenAPI, basic metrics, operational instructions, local infrastructure, SDK and hosted daemon.
- Existing UI controls integrated without replacing the design; original art lock preserved.
- OpenAI Responses/Chat and Anthropic adapters with role-specific models, reasoning/service-tier controls, input/output bounds, private-response mode, bounded retry/backoff, usage logs and truncation rejection.
- Primary/backup Solana RPC failover, production dependency/config probes, Turnstile-protected model-backed quotes, worker reputation gates, anti-repeat reviewer pairing and deadline warnings.
- Periodic holder-revenue epochs with DAS collection snapshots, immutable snapshot hashes, two-seat eligibility caps, exact integer allocation, durable payout retries and public distribution proof routes.
- Authenticated remote Docker execution for Railway-hosted schedulers plus a Caddy/Compose runner package for trusted checks and project-operated agents.

## Verified here

- TypeScript checking and frontend/collection verification.
- The full integration run passes 55 tests across readiness dependencies, domain rules, public-proof privacy, per-workflow deployment identities, agent quality controls, two-reviewer quorum and reward division, delivery-gated payout, deadline refund, transactions, PostgreSQL orchestration and real-container isolation. The default check intentionally skips tests that require the dedicated database/container environment.
- Real Ed25519 authentication, replay/CSRF rejection, simultaneous task claims, stale lease rejection, independent review, retry after failed trusted checks, final reward conservation, ownership revocation and privacy.
- Cancellation during pending funding, recovery of direct wallet broadcasts, finalized-height expiry and confirmation of issuance after an NFT transfer.
- Configurable planner/builder/reviewer/final model routing, bounded test-and-critique repairs, preserved repair patches and trusted rejection details passed back to builders. These are tested controls, not a claim that actual model output has passed a quality benchmark.
- Browser smoke: wallet login against the actual API, build/mint dialogs, honest unconfigured states, theme switching and mobile rendering. Test wallet is a generated fixture.
- The conversational form recognizes concise mint requests such as `pls mint`, `agent pls mint` and `mint one NFT`, then enters the same wallet-approved mint flow.
- A complete release candidate validated 888/888 unique locked 480x480 PNGs and 888/888 metadata documents, plus collection metadata and the exact mint-policy manifest.
- Native Rust compilation and six Rust tests, including Anchor's generated program-ID test, three accounting checks and bounded-deadline checks.
- Read-only connection to the public Solana devnet RPC.
- npm audit reported zero known vulnerabilities after dependency updates and overrides.

## Not yet verified live

- No real HMD mint, collection address, production policy, deployment keypair or funded operator accounts were supplied.
- No permanent IPFS/Arweave upload destination was supplied, so the final image and metadata directory URIs are intentionally not fabricated or published.
- No real model credentials were supplied; provider-backed paid build/review has not been executed.
- No mint/burn/escrow transaction, metadata CPI or payout has run against a validator/devnet in this session. Native Rust tests are not validator integration tests.
- No SBF artifact was built using installed Anchor/Solana tooling in this environment.
- GitHub, Netlify, S3 and actual Solana deployment adapters need credentialed smoke tests.
- The holder snapshot and distribution ledger are implemented but no real HMD payout has run; keep HOLDER_DISTRIBUTIONS_ENABLED=false until a small live payout is inspected.
- The configured GitHub installation publishes a deterministic branch to an existing allowed-owner repository. Arbitrary user GitHub OAuth connections and automatic new-repository transfer are not implemented.
- Solana build-image/offline-dependency preparation is operator setup; the base container is not a complete arbitrary-program toolchain.

## Deliberately unavailable / further work

- Mainnet auto-deployment, sponsored gas, compressed NFTs and Token-2022 extensions.
- Arbitrary network profiles/package acquisition: current generated-code execution is network-disabled. Dependency provisioning must use reviewed images.
- Alternative partial-work/dispute/verifier-rejection compensation policies; the implemented selectable policy vests only at final release.
- Persistent API hosting adapter beyond source delivery; current integrated web hosting is static Netlify drafts.
- Fully automated recovery of interrupted external publication. Prepared payment/mint reservations do have finalized-receipt and block-height expiry recovery.
- Dedicated chain-level failure/attack test suite and independent protocol security review.
- Real-provider quality benchmark and per-workflow dollar accounting; model calls now have strict task/pass/input/output bounds and log provider token usage, but provider-side budget limits remain the launch spend circuit breaker.
- Hardware-isolated execution, attested decentralized workers and human-identity Sybil resistance.

See BACKEND-README.md and .env.example for setup and the exact launch requirements. Missing integrations fail closed; no job, payment, mint, deployment or network activity is fabricated.
