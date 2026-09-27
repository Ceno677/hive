# hive.md backend

NFT collection preparation and the post-token binding procedure are documented in [NFT-LAUNCH.md](./NFT-LAUNCH.md).

Customers work in the existing website. They connect a wallet, describe a project, approve a quote and receive the result; they never install Docker or run a daemon. NFT holders can separately opt in as network operators by pairing a seat with their own machine and agent. Project-operated agents provide baseline capacity.

## Run locally

Node 22+ and a running Docker engine are required for the development database and isolated tests.

```powershell
Copy-Item .env.example .env
npm ci
docker compose up -d postgres redis
npm run db:generate
npm run db:migrate
npm run db:seed
docker build -f infra/docker/Dockerfile.sandbox -t hive-sandbox:local .
npm start
```

Open http://localhost:4320. The API serves your existing site and its assets. For hot reload use npm run dev. In another terminal run npm run scheduler. Set ARTIFACT_STORAGE=local for local development (already present in .env.example). Production uses private S3-compatible storage and must not use local disk.

The default configuration deliberately has no token addresses, mint price, fee allocation, signer or AI credentials. Job quotes are generated from the scoped plan and live HMD market data; the website reports unavailable actions until those integrations are configured and never invents a token price.

## Services and source

- apps/api: Fastify API, session cookies, CSRF, frontend hosting, OpenAPI and delivery.
- apps/scheduler: reconciliation, trusted verification, release validation, settlement and outbox publishing.
- worker/daemon: build/review runtime for project-operated or independent NFT-holder machines. It is never installed by customers who only request builds.
- packages/database: Prisma schema and versioned SQL migrations.
- packages/solana: classic SPL Token operations and Metaplex ownership checks.
- packages/solana/custodial.ts: low-cost launch adapter using the existing SPL Token and Metaplex programs. It atomically burns HMD and creates a verified seat, journals deposits with signed memos, and performs idempotent payouts/refunds from the custody wallet.
- programs/hive: optional future trustless implementation. It is retained and tested but is not required or deployed in the short-launch configuration.
- packages/execution: containers with no network, host mounts, wallet keys or provider secrets.
- packages/artifacts: private S3 or development-only content-addressed local storage.
- site/client.ts: UI integration bundled into site/backend.js. Existing CSS and artwork are preserved.

## Configure paid jobs and minting

Use `PAYMENT_MODE=custodial` and supply real launch values in .env:

- SOLANA_RPC_URL, SOLANA_CLUSTER and HMD_MINT. No HIVE_PROGRAM_ID is required in custodial mode.
- SEAT_COLLECTION_ADDRESS, MINT_BASE_URI and HMD_BURN_AMOUNT. MAX_SEATS_PER_WALLET defaults to 2 and is enforced in serializable database reservations.
- BUILDER_BPS, VERIFIER_BPS and TREASURY_WALLET. `VERIFIER_BPS` is the share for each accepted reviewer; with the default quorum use `7000 / 1500 / 1500`. Dynamic quote policy uses current sourced market rates, JOB_PRICE_MARKET_BPS (5000 = 50%), price bounds and quote TTL. Use `HMD_MANUAL_PRICE_USD` during initial price discovery, then remove it to restore liquidity/deviation-checked DEX pricing.
- CUSTODY_KEYPAIR_PATH on the trusted service host only. Its public key must equal TREASURY_WALLET and it must remain the collection update authority for launch minting.
- AI_API_KEY plus either AI_MODEL or every role-specific model, and provider/base URL. OpenAI Responses/Chat and Anthropic adapters are available.
- EXECUTION_ENABLED=true after building/testing the execution image.
- If the scheduler is hosted without Docker, set EXECUTION_URL and EXECUTION_TOKEN for the dedicated runner described in RUNNER-DEPLOY.md.
- Enable periodic holder distributions with HOLDER_DISTRIBUTIONS_ENABLED=true only after the DAS ownership snapshot and real payout smoke tests pass. The default interval is 72 hours.
- SOLANA_BACKUP_RPC_URL, Turnstile keys, private S3 storage, TRUST_PROXY=true and OPERATIONS_TOKEN are required by production validation.
- GAS_POLICY=user-pays and SETTLEMENT_POLICY=final-release only if the owner approves those policies.

Prices are positive integer token base units, never decimal floats. Mint decimals come from the actual token mint. In custodial mode, reward basis points must allocate 100% of the market-rate reward across the builder and required reviewers. Set JOB_DEADLINE_HOURS from 1 to 168; the deadline is shown with the quote and cryptographically bound to the funding memo. Rewards vest only after verified GitHub delivery. The scheduler automatically returns the full customer fee after an expired job. Alternative partial-work compensation policies need additional implementation, not just different marketing copy.

Job fees do not fund holder distributions: a successfully delivered job burns the customer's full fee. The existing holder-distribution ledger therefore stays disabled unless a separate treasury-funded holder allocation is introduced and tested. Distribution history and entries remain publicly inspectable through `/api/holder-distributions`.

Only classic SPL Token mints and conventional Metaplex NFTs are supported. Token-2022 extensions, compressed NFTs, gas sponsorship, automatic mainnet program deployment and arbitrary sandbox internet access are intentionally not enabled.

## Lean Solana setup

Custodial mode does not deploy a custom hive program. A user-paid atomic transaction burns exactly 8,888 HMD, creates the immutable Metaplex NFT, and verifies it into the collection. Removing or changing any instruction invalidates the server's partial signatures. The database reserves a unique seat under serializable isolation and independently enforces the two-seat lifetime mint limit.

Job payments transfer HMD into the custody wallet's token account. Each signed transaction carries a unique job memo; PostgreSQL maintains the per-job subledger. Before work starts, the coordinator reserves enough treasury HMD for the full market-rate agent reward and the customer's eventual fee burn. If capacity is unavailable, the payment is returned without scheduling work. After accepted GitHub delivery, the treasury pays the builder and independent reviewers, then burns the customer's complete job fee with a unique retry-safe memo. A missed deadline before completion returns the full fee and releases the treasury reservation. Payout, burn and refund journals prevent ordinary retries from executing twice. This is honest custodial escrow: it is cheaper, but customers trust the service and custody wallet.

Set `HMD_MINT` only when the token launches, then run `npm run nft:bind-hmd` to derive `HMD_BURN_AMOUNT`. Run the credentialed mainnet smoke suite before opening mint or payment routes.

## Optional future trustless program

The checked-in program ID is a development identifier, not a deployed protocol. Do not point production at it. The section below applies only if `PAYMENT_MODE=custom-program` is deliberately selected later.

Install compatible Solana/Anchor tooling on an operator build host. The source is compiled against Anchor 0.31.x; Cargo.lock pins dependencies. Generate the deployment keypair locally, synchronize declare_id/Anchor.toml using Anchor tooling, build the SBF binary and deploy on devnet using your operator wallet. Never commit keypairs or send them through chat.

Create/configure the actual HMD mint and approved collection on devnet, then initialize the hive program. The initialize instruction requires the program's upgrade authority, so a third party cannot initialize its policy. Set the existing collection's update authority to the config PDA for collection verification. Initialization pins HMD mint, collection, burn amount, wallet limit and metadata base URI.

Use the publication exporter before initializing metadata:
```
npx tsx infra/scripts/export-metadata.ts
```
Set NFT_IMAGE_BASE_URI and MINT_BASE_URI first. It verifies the original lock and creates separate publication/metadata files and a hash manifest; it never modifies approved PNGs or source metadata. Upload to durable storage under the chosen URLs. Export refuses to overwrite an existing publication.

The mint instruction burns HMD and issues a verified, zero-decimal, one-supply NFT with immutable metadata and a non-printable master edition in one transaction. Seat IDs, request receipts and wallet counters are PDAs. Existing external collection membership alone does not assign an approved numeric identity; pre-existing seats need an operator-verified ID-to-mint mapping.

The registry and payouts trust the configured coordinator authority's acceptance decision. Receipts prove which identities and artifact hashes were attested, not arbitrary program correctness or independence of humans behind wallets. Protect and monitor that authority.

## NFT-holder and project-operated agents

Enroll at least three independent holder wallets/seats: one builder and two reviewers. Build/review and the two reviews cannot reuse the same worker, seat or wallet for one artifact. Five identities—two builders and three review-capable agents—are recommended for launch throughput and failure tolerance. A wallet can own up to two NFTs, but a review quorum still requires distinct wallets. Repeated builder/verifier pairings are deprioritized, and low-reputation builders or reviewers stop receiving that class of work after the configured sample threshold.

Set HOLDER_WALLET_KEYPAIR_PATH, HOLDER_SEAT_ID, WORKER_NAME and optionally WORKER_CAPABILITIES, then run:
```
npm run agent:pair
```
The local wallet signs authentication; its private key is never sent. A scoped credential and device key are saved under `.hive/`. Supply that `WORKER_TOKEN` to the corresponding agent process, configure its own provider credentials and sandbox, and run the worker. See AGENT-OPERATOR-GUIDE.md.

Enrollment/revocation endpoints require authenticated wallet sessions. Work credentials expire after 30 days; re-enroll to rotate. Keys/tokens stay outside execution containers. Operators must keep credentials in an appropriate secret store in production.

The built-in provider runtime has a bounded build/test/review repair loop: four passes by default, configurable from one to eight with AGENT_REPAIR_PASSES. Passing deterministic checks alone does not return a build: the local reviewer must accept it with no failed checks or unresolved issues. Exhausted builds fail closed. Every submitted artifact then requires two independently enrolled agent reviews by default (`REVIEW_QUORUM=2`), and each review is independently rechecked by the trusted coordinator. Correct rejections count toward verifier reputation; approvals that disagree with trusted evidence count against it. The accepted project receives final assembled-product validation. Verifier rewards are divided between accepted quorum members. `AI_PLANNER_MODEL`, `AI_BUILDER_MODEL`, `AI_REVIEWER_MODEL` and `AI_FINAL_MODEL` can be configured without a redundant base model. OpenAI Responses API reasoning effort, service tier, bounded retries, timeout, input size and output tokens are configurable. The HTTP runtime adapter supports an existing private agent service through RUNTIME_URL. Its input/output contract is in worker/daemon/runtime.ts. Do not expose that service publicly without authentication and network access controls.

The owner-approved mint price is 8,888 HMD. Mint quotes and transaction preparation reject a configured raw amount that does not match that price using actual mint decimals. Run npm run launch:check after supplying HMD_MINT. See LAUNCH-INPUTS.md for remaining owner decisions and private credentials.

The standard sandbox image supports static sites and dependency-free Node tests. Tests that discover zero tests fail. Rust tasks require RUST_SANDBOX_IMAGE with the required offline dependencies preloaded. A base Rust sandbox Dockerfile is supplied; it is not a universal preinstalled Anchor/dependency environment. Missing tooling yields failure, never simulated execution. Only advertise capabilities your configured image can actually execute.

## Release delivery

Ordinary build jobs enter the delivery stage after independent review and trusted final checks. They become complete—and the owner download becomes available—only after the verified artifact is pushed to the requested GitHub repository. Netlify draft publication remains an optional additional release action.

GitHub requires a public GitHub App with Contents read/write permission, Metadata read, and **Request user authorization (OAuth) during installation** enabled. Set the App ID, private key, Client ID, Client Secret and public-link slug (`GITHUB_APP_SLUG`) to enable wallet-linked customer installations. The exact callback is `https://hmd.bot/api/github/callback`; leave wildcard callback matching disabled and do not set a separate Setup URL. A customer installs and authorizes the App, the backend records only repositories that GitHub says that user can push to, and final delivery is constrained to that wallet-linked list. The short-lived GitHub user token is not stored. A static operator installation plus `GITHUB_ALLOWED_OWNER` remains available as a fallback. Successful GitHub delivery is mandatory before completion or payout. The delivery branch is deterministic for retry recovery and is not silently merged into the default branch.

Delivery requires a clean repository with no existing GitHub Actions workflows, and generated bundles cannot add workflow files. This prevents a branch push containing untrusted generated code from activating repository workflows with access to repository secrets. Customers can copy or merge the reviewed branch into a different repository themselves after inspection.

Static hosting requires NETLIFY_TOKEN and NETLIFY_SITE_ID. Published files are checked against stored hashes before the release becomes complete. Site updates use explicit artifact-bound approval.

Solana-app mode holds rewards while the program release awaits approval. After a trusted devnet deployment, the frontend task receives actual program/IDL details and must emit a matching hive-deployment.json. The reviewed website then waits for hosting approval and live asset validation before completion and settlement.

Program delivery additionally requires:
- SOLANA_BUILD_IMAGE containing the supplied isolated runner, build-solana.cjs, Anchor/Solana tools and offline dependencies;
- DEPLOY_PROGRAM_SEED (32+ secret characters) derives a distinct stable program keypair for each workflow; the key is materialized only in the trusted service's temporary deployment directory;
- trusted-host Solana CLI and signer;
- configured devnet RPC and hosting.

The supplied deployment service verifies the deployed upgradeable program bytes against the built ELF. Actual program deployment and provider-backed work have not been exercised without credentials. Automatic mainnet deployment is disabled pending a reviewed deployment/spend policy.

## API and frontend deployment

GET /api/openapi.json lists routes and core request schemas. Authentication uses `hive_session` (HttpOnly) plus `X-CSRF-Token`; paired agents use scoped Bearer credentials. Public opted-in workflows expose sanitized workflow, task, event, worker and artifact-proof records; source bundles, briefs, policies and evidence text remain private. Owner routes and private SSE require authorization.

Keep site/ on Netlify if desired and proxy /api/* to the backend under the same public origin. Set PUBLIC_ORIGIN to the website's exact HTTPS origin. Do not embed service keys or signer paths in browser configuration. Existing netlify.toml still publishes only site/.

Your backend, scheduler, signing service and execution hosts require persistent server hosting. A static Netlify deployment by itself does not run these processes.

## Tests

```
npm run check
npm run test:integration
npx tsx infra/scripts/browser-smoke.ts
npm run test:program
```

Local integration tests need a dedicated PostgreSQL database named `hive_test`. Create it once with `docker exec hive-postgres-1 psql -U hive -d postgres -c "CREATE DATABASE hive_test"`. Each run creates a random schema, migrates it, and removes only that schema afterwards. `npm run test:integration:railway` creates a uniquely named temporary database, runs the same suite, and removes the database; use it only with a database role allowed to create/drop databases.

Unit tests run without external credentials; integration tests use actual PostgreSQL and explicit chain/model doubles. Browser smoke serves the real frontend in isolation and uses a generated wallet plus mocked unavailable API states; API signature verification is covered separately by the PostgreSQL integration suite. Rust tests compile the native program and exercise accounting when Docker/tooling is available. These do not replace validator/devnet transaction tests.

An unlisted devnet test token can set `DEVNET_TEST_HMD_PRICE_USD` in an isolated staging environment. A brand-new mainnet mint without a DEX pair can explicitly set `HMD_MANUAL_PRICE_USD`; quotes expose `tokenPriceSource=manual`, skip DEX depth checks and still use AI market research for the normal job value. Remove the manual value as soon as reliable DEX pricing exists.

## Operations

- /health checks the process; /ready checks PostgreSQL and Redis.
- /metrics requires Bearer OPERATIONS_TOKEN and exports request counters.
- Logs redact cookies, authorization headers and request bodies. Workflow transitions are stored in Event.
- Monitor stale leases, PENDING_TRUSTED reviews, payment states, failed/refund-pending workflows, PUBLISHING releases, outbox backlog and signer balances.
- Restart API/scheduler/agents independently. PostgreSQL is authoritative; the scheduler scans durable state even if Redis is lost.
- Prepared/sent payment signatures are journaled before broadcasting. Do not manually mark uncertain transactions as paid or failed.
- The scheduler enforces funded workflow deadlines. A job that has not reached verified delivery by its deadline is cancelled and fully refunded; accepted files are not exposed to the requester before completed delivery.
- Failed or expired transactions release their mint reservation. Prepared transactions are checked for finalized on-chain receipts before expiry cleanup, including direct wallet broadcasts that never reached the API. Cancelling while funding is pending waits for confirmation or expiry; confirmed funds enter the refund path without scheduling work.
- A PUBLISHING release interrupted during an external write must be reconciled before retry. GitHub's deterministic branch allows lookup; inspect Netlify or Solana before retrying an unknown outcome.
- Back up PostgreSQL using pg_dump, object storage using provider versioning/replication, and signer keys in your secret-management system. Restore to an isolated environment, run migrations and reconcile finalized chain receipts before enabling payouts.
- Use one coordinator/scheduler process for privileged publication until distributed external-operation claiming is fully validated. Atomic task claims support multiple paired agents.
- Host execution on dedicated machines. No Docker socket is exposed through the public API or into generated-code containers.
