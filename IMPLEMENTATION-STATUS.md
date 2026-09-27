# Implementation status

This repository contains the backend and web integration, with the API and scheduler deployed on Railway. It has not received an independent security audit and paid mainnet actions remain disabled.

## Implemented

- Fastify API; PostgreSQL/Prisma migrations; wallet-signed authentication with one-time challenges, secure session cookie settings and CSRF.
- NFT-holder/project-agent pairing, capabilities, heartbeats, bounded ownership rechecks, transfer revocation, scoped credentials, transactionally bounded concurrency and fenced leases. NFT ownership is capped at two per wallet by the owner-approved default.
- Customer NFT access gating using live collection ownership before job quoting and again before payment preparation/submission; the HMD job fee is separate.
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
- Optional periodic holder-distribution epochs with DAS collection snapshots, immutable snapshot hashes, two-seat eligibility caps, exact integer allocation, durable payout retries and public distribution proof routes. Job fees no longer fund this ledger because successful fees burn in full.
- Authenticated remote Docker execution for Railway-hosted schedulers plus a Caddy/Compose runner package for trusted checks and project-operated agents.
- Wallet-linked GitHub App authorization, writable-repository discovery and delivery constrained to each customer's verified installation; user access tokens are not retained.

## Verified here

- TypeScript checking and frontend/collection verification.
- The local gate passes 53 tests. An isolated temporary Railway PostgreSQL database applied all nine migrations and passed 75 tests across readiness dependencies, NFT-gated customer access, domain rules, public-proof privacy, agent quality controls, two-reviewer quorum and reward division, delivery-gated payout, deadline refund, transactions and orchestration. Three container-only tests remain skipped without a Docker host.
- Real Ed25519 authentication, replay/CSRF rejection, simultaneous task claims, stale lease rejection, independent review, retry after failed trusted checks, final reward conservation, ownership revocation and privacy.
- Cancellation during pending funding, recovery of direct wallet broadcasts, finalized-height expiry and confirmation of issuance after an NFT transfer.
- Configurable planner/builder/reviewer/final model routing, bounded test-and-critique repairs, preserved repair patches and trusted rejection details passed back to builders. These are tested controls, not a claim that actual model output has passed a quality benchmark.
- Browser smoke: the real frontend bundle, generated wallet-signing UI, build/mint dialogs, honest unconfigured states, theme switching and mobile rendering with no page errors. Real API signature authentication is verified by the database integration suite.
- The conversational form recognizes concise mint requests such as `pls mint`, `agent pls mint` and `mint one NFT`, then enters the same wallet-approved mint flow.
- A complete release candidate validated 888/888 unique locked 480x480 PNGs and 888/888 metadata documents, plus collection metadata and the exact mint-policy manifest. A remote fast-finality audit re-fetched and matched all 1,778 permanent release files.
- Native Rust compilation and six Rust tests, including Anchor's generated program-ID test, three accounting checks and bounded-deadline checks.
- Read-only connection to the public Solana devnet RPC.
- The configured Backblaze private bucket passed an actual temporary write/read/delete round trip. Production dependency audit reports zero known vulnerabilities, and tracked files/history contain no supplied API-key patterns.
- The configured OpenAI pricing model completed a real web-researched structured quote; production model-access probes pass for pricing, planning, building, reviewing and final validation.

## Not yet verified live

- HMD does not exist yet, so the final mainnet token binding and exact base-unit burn amount cannot run. A temporary or new mainnet token can use an explicit manual launch price before DEX discovery exists.
- The permanent Arweave NFT release and mainnet collection are prepared, but no live 8,888 HMD burn/mint transaction has run.
- Provider credentials and role models are configured, but a complete provider-backed builder/reviewer delivery benchmark has not run because the execution host and three independent NFT operators are not online.
- No mint/burn/escrow transaction, metadata CPI or payout has run against a validator/devnet in this session. Native Rust tests are not validator integration tests.
- No SBF artifact was built using installed Anchor/Solana tooling in this environment.
- Backblaze is verified. GitHub delivery and Netlify frontend/proxy deployment still need their remaining credentials and credentialed smoke tests.
- The holder snapshot and distribution ledger are implemented but no real HMD payout has run; keep HOLDER_DISTRIBUTIONS_ENABLED=false until a small live payout is inspected.
- GitHub delivery publishes a deterministic branch to an existing repository in the wallet-linked installation. Automatic creation or transfer of a brand-new repository is not implemented.
- Solana build-image/offline-dependency preparation is operator setup; the base container is not a complete arbitrary-program toolchain.

## Deliberately unavailable / further work

- Mainnet auto-deployment, sponsored gas, compressed NFTs and Token-2022 extensions beyond the metadata-only pump.fun format supported by custodial mode.
- Arbitrary network profiles/package acquisition: current generated-code execution is network-disabled. Dependency provisioning must use reviewed images.
- Alternative partial-work/dispute/verifier-rejection compensation policies; the implemented selectable policy vests only at final release.
- Persistent API hosting adapter beyond source delivery; current integrated web hosting is static Netlify drafts.
- Fully automated recovery of interrupted external publication. Prepared payment/mint reservations do have finalized-receipt and block-height expiry recovery.
- Dedicated chain-level failure/attack test suite and independent protocol security review.
- Real-provider quality benchmark and per-workflow dollar accounting; model calls now have strict task/pass/input/output bounds and log provider token usage, but provider-side budget limits remain the launch spend circuit breaker.
- Hardware-isolated execution, attested decentralized workers and human-identity Sybil resistance.

See BACKEND-README.md and .env.example for setup and the exact launch requirements. Missing integrations fail closed; no job, payment, mint, deployment or network activity is fabricated.
