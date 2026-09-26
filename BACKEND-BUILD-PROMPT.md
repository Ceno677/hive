# BUILD THE COMPLETE BACKEND FOR A SOLANA AI AGENT HIVE

> Consolidated implementation prompt for hive.md. This file incorporates the supplied prompt, the repository handoff, and additional requirements. It is an implementation specification, not a claim that the backend is implemented or production-ready.
>
> Read README.md, BACKEND-HANDOFF.md, DASHBOARD-API.md, site/app.js, site/dashboard.js, nft-source/verify-lock.mjs, and the collection manifest before coding. For product rules, the current user decisions and BACKEND-HANDOFF.md supersede stale frontend/README copy. This consolidated prompt corrects the supplied prompt's SOL-first payment and already-minted assumptions. Unresolved business policies remain configuration decisions, not invented production defaults.
>
> Reference: https://imd.fun/docs/#workflows (reviewed 2026-09-26). Use its release-workflow concept; do not copy its Ethereum payment mechanism, token economics, ENS requirement, or unrelated oracle products. The Solana-specific requirements below are proposed implementation requirements.

You are a senior distributed-systems, AI infrastructure, security, and Solana engineer.

Build the production-ready backend for an existing application that already has:

- A frontend
- An approved, locked 888-piece NFT artwork and metadata collection representing worker/agent seats; on-chain deployment is not established by these files.

Preserve the existing frontend design; add only the integration controls and copy needed for real flows.
DO NOT regenerate, replace, or expand the approved artwork collection. Implement minting of these approved identities as specified below.

The product is a decentralized AI workforce inspired by the workflow model of IMD/Hive:

USER REQUEST
→ PLANNER
→ JOB GRAPH
→ BUILDER AGENT
→ TESTS
→ INDEPENDENT VERIFIER
→ ACCEPT / REJECT
→ RETRY/FIX
→ NEXT JOB
→ FINAL VALIDATION
→ DELIVERY

The system must be genuinely functional. Do not fake agent execution, job statuses, GitHub deployments, verification, payments, or worker activity.

---

# 1. PRODUCT MODEL

Users submit natural-language requests such as:

"Build me a Solana token-gated website."

"Create a Solana program for an NFT staking system."

"Build a landing page and deploy it."

"Create an API that indexes this Solana program."

The backend converts the request into a structured workflow.

Example:

User Request
    ↓
Planner
    ↓
Workflow
    ├── Job 1: architecture
    ├── Job 2: Solana program
    ├── Job 3: program tests
    ├── Job 4: backend/API
    ├── Job 5: frontend integration
    ├── Job 6: deployment
    └── Job 7: final validation

Jobs may form a DAG rather than a simple sequence.

Example:

          Architecture
          /          \
     Program          UI
        |              |
      Tests          Build
          \          /
          Integration
               |
            Deploy
               |
         Final Verify

Jobs must declare their dependencies.

A job cannot execute until required parent jobs have been accepted.

---

# 2. TECHNOLOGY STACK

Use:

Backend:
- TypeScript
- Node.js
- Fastify
- PostgreSQL
- Prisma
- Redis
- BullMQ

Solana:
- @solana/web3.js
- SPL libraries where appropriate
- Metaplex/Umi for NFT ownership verification when appropriate

AI:
Create a provider abstraction supporting multiple model providers.

Repository/deployment:
- GitHub API
- Docker
- isolated execution environments

Observability:
- structured logs
- metrics
- job audit trail

Testing:
- Vitest
- integration tests
- end-to-end workflow tests

Use a monorepo.

Suggested structure:

apps/
  api/
  scheduler/
  worker-gateway/

packages/
  database/
  queue/
  solana/
  ai/
  planner/
  orchestrator/
  verification/
  github/
  execution/
  payments/
  reputation/
  shared/

worker/
  sdk/
  daemon/

programs/
  hive_registry/
  hive_escrow/

infra/
  docker/
  migrations/
  scripts/

---

# 3. EXISTING NFT SEATS

The 888 approved artwork/metadata identities already exist locally. The repository does not establish that these seats are already minted on Solana. Support validated existing on-chain seats if the owner supplies their deployment, and implement burn-to-mint issuance of the approved identities. Never interpret a local JSON record as ownership.

NFT ownership determines whether someone is allowed to register a worker.

DO NOT mint replacement NFTs.

Configuration:

SEAT_COLLECTION_ADDRESS=
SOLANA_RPC_URL=

When a worker registers:

1. Receive wallet address.
2. Generate authentication challenge.
3. User signs challenge.
4. Verify signature.
5. Query Solana.
6. Verify wallet currently owns an NFT belonging to the configured collection.
7. Extract NFT mint.
8. Register that NFT as the worker's seat.
9. Prevent the same seat from controlling multiple active workers unless explicitly configured.

Store:

seat_id
nft_mint
owner_wallet
worker_id
registered_at
last_ownership_check
status

Ownership MUST periodically be revalidated.

If NFT ownership changes, worker authorization must update accordingly.

Never trust NFT information supplied by the client.

---

# 4. WALLET AUTHENTICATION

Implement Sign-In With Solana style authentication.

Flow:

POST /auth/challenge

Return:

nonce
message
expiresAt

Wallet signs message.

POST /auth/verify

Backend verifies:

- wallet public key
- signature
- nonce
- expiration
- domain
- replay protection

Return secure session/JWT.

Do not authenticate wallets merely because the client claims an address.

---

# 5. WORKER SYSTEM

NFT holders can operate worker nodes.

Each worker advertises capabilities.

Example:

{
  "workerId": "...",
  "seatMint": "...",
  "capabilities": [
    "typescript",
    "react",
    "solana",
    "rust",
    "anchor",
    "testing",
    "deployment"
  ],
  "maxConcurrentJobs": 2
}

Worker states:

ONLINE
BUSY
OFFLINE
SUSPENDED

Workers maintain a heartbeat.

If heartbeat expires:

ONLINE → OFFLINE

Do not assign new jobs to offline workers.

---

# 6. WORKER DAEMON

Build a separate worker daemon that NFT holders can run on their own machines or servers.

Example:

npm install
npm run worker

Configuration:

HIVE_API_URL=
WALLET_KEYPAIR_PATH=
WORKER_NAME=
MAX_CONCURRENT_JOBS=

On startup:

1. Load wallet.
2. Authenticate.
3. Verify NFT seat.
4. Register worker.
5. Advertise capabilities.
6. Establish authenticated connection to backend.
7. Send heartbeat.
8. Wait for jobs.

Worker must NOT expose the user's private key to the central backend.

Private keys remain local.

---

# 7. JOB CREATION

Endpoint:

POST /jobs

Input:

{
  "prompt": "...",
  "budget": "...",
  "preferences": {}
}

Create:

job request
workflow
workflow tasks
dependency graph

Initial state:

PLANNING

Planner analyzes request.

Planner must output structured JSON.

Example:

{
  "title": "NFT staking application",
  "summary": "...",
  "tasks": [
    {
      "id": "architecture",
      "type": "architecture",
      "dependencies": [],
      "requiredSkills": ["solana"]
    },
    {
      "id": "program",
      "type": "coding",
      "dependencies": ["architecture"],
      "requiredSkills": ["rust", "anchor", "solana"]
    },
    {
      "id": "tests",
      "type": "testing",
      "dependencies": ["program"],
      "requiredSkills": ["anchor", "testing"]
    }
  ]
}

Validate planner output before inserting task/dependency records. Persist the request and planning attempt separately so failures remain auditable.

Reject malformed DAGs.

Detect dependency cycles.

---

# 8. JOB STATE MACHINE

Use explicit states.

Workflow:

PLANNING
QUEUED
RUNNING
VERIFYING
COMPLETED
FAILED
CANCELLED

Task:

BLOCKED
QUEUED
CLAIMED
RUNNING
SUBMITTED
VERIFYING
ACCEPTED
REJECTED
RETRYING
FAILED
CANCELLED

State changes MUST happen transactionally.

Do not let clients arbitrarily change task status.

Maintain complete state-transition history.

---

# 9. SCHEDULER

Build a scheduler responsible for assigning jobs to appropriate workers.

Consider:

- required capabilities
- online status
- concurrent workload
- historical success rate
- recent failures
- reputation
- seat status
- timeout history

Never assign a worker a task whose required capabilities are unsupported.

Use Redis/BullMQ for queueing.

Use leases rather than permanently assigning jobs.

Example:

worker claims task
↓
lease expires in N minutes
↓
worker periodically renews lease

If worker crashes:

lease expires
↓
task returns to queue

This prevents dead jobs.

---

# 10. BUILD AGENT

Builder receives a sandbox containing:

- task instructions
- accepted parent artifacts
- relevant repository state
- permitted tools
- acceptance criteria

Example agent instruction:

TASK:
Implement the Anchor instruction create_vault.

INPUTS:
architecture.md
existing program source

ACCEPTANCE:
cargo build succeeds
anchor test succeeds
no unauthorized account access
IDL generated successfully

OUTPUT:
patch
logs
test results
artifact manifest

Builder cannot declare itself successful.

It only SUBMITS work.

---

# 11. ARTIFACT SYSTEM

Every task produces immutable artifacts.

Examples:

source patch
files
JSON
markdown
compiled output metadata
test output
deployment information

Store metadata in PostgreSQL.

Store large artifacts in object storage.

Artifact record:

id
workflow_id
task_id
worker_id
type
content_hash
storage_location
created_at

Use SHA-256 hashes.

Once submitted for verification, the submitted artifact must be immutable.

If corrections are needed, create a new artifact version.

---

# 12. INDEPENDENT VERIFICATION

THIS IS CRITICAL.

The worker that builds something must NOT verify its own submission.

Builder A
↓
Verifier B

Enforce:

builder_worker_id != verifier_worker_id

Also enforce:

builder_seat_id != verifier_seat_id

builder_owner_wallet != verifier_owner_wallet

Check assignment-time identity snapshots and current authorization. Different wallets do not prove different humans; document this remaining trust limitation.

Verifier receives:

task
acceptance criteria
submitted artifact
test instructions
parent artifacts

Verifier independently:

- inspects changes
- runs tests
- checks acceptance criteria
- performs security checks
- checks for obvious malicious behavior
- checks whether requested functionality exists

Verifier returns STRUCTURED output:

{
  "decision": "ACCEPT",
  "checks": [
    {
      "name": "build",
      "passed": true,
      "evidence": "..."
    }
  ],
  "issues": [],
  "confidence": 0.94
}

or:

{
  "decision": "REJECT",
  "issues": [
    {
      "severity": "HIGH",
      "file": "program/src/lib.rs",
      "description": "...",
      "suggestedFix": "..."
    }
  ]
}

---

# 13. REJECTION / RETRY LOOP

If verification fails:

SUBMITTED
↓
VERIFYING
↓
REJECTED
↓
RETRYING
↓
BUILDER
↓
SUBMITTED
↓
NEW VERIFIER

Pass verifier feedback to the next build attempt.

Set:

MAX_TASK_ATTEMPTS=3

After maximum attempts:

task → FAILED

Dependent tasks remain BLOCKED.

Workflow becomes FAILED unless recovery strategy exists.

Never create infinite retry loops.

---

# 14. VERIFICATION SECURITY

Do not rely only on an LLM saying:

"Looks good."

Verification must combine deterministic checks and AI review.

Examples:

npm test
npm run build
cargo test
cargo clippy
anchor build
anchor test
eslint
tsc
dependency audit
secret scanning

Capture:

exit code
stdout
stderr
duration
command
artifact hash

AI review happens AFTER deterministic evidence is collected.

---

# 15. SAFE CODE EXECUTION

NEVER run arbitrary worker-generated code directly on the main API machine.

Create an execution abstraction.

Execution environments must be isolated.

Initial implementation:

Docker containers.

Each task execution receives:

- temporary filesystem
- CPU limit
- RAM limit
- execution timeout
- process limit
- disk quota
- restricted environment variables
- restricted networking

NO production secrets inside the sandbox.

Destroy sandbox after execution.

Design ExecutionProvider so stronger isolation can later replace Docker.

Examples:

DockerExecutionProvider
FirecrackerExecutionProvider
CloudSandboxProvider

---

# 16. NETWORK POLICY

Generated code must not automatically have unrestricted internet access.

Create explicit network profiles:

NONE
PACKAGE_REGISTRIES
GITHUB
SOLANA_RPC
DEPLOYMENT
CUSTOM_ALLOWLIST

Default:

NONE

Only enable the minimum necessary profile.

---

# 17. SECRET MANAGEMENT

Never put deployment secrets inside prompts.

Never send secrets to third-party worker machines.

Centralize privileged operations.

Examples:

GitHub token
deployment token
production Solana authority

Workers generate artifacts.

Trusted backend services perform privileged publishing/deployment.

---

# 18. GITHUB INTEGRATION

When workflow requires a repository:

Create/use repository.

Tasks operate using branches.

Example:

hive/job-UUID/task-UUID

Worker returns patches/commits.

Verifier reviews exact commit SHA.

After ACCEPT:

merge accepted changes.

Record:

repository
branch
commit SHA
PR
worker
verifier
artifact hashes

Never merge unverified work.

---

# 19. SOLANA DEPLOYMENT

Separate:

BUILDING

from:

DEPLOYING

Worker agents should generally produce the program binary/source.

A trusted deployment service handles actual production signing.

Never send deployment authority keys to workers.

Deployment pipeline:

accepted program
↓
rebuild in trusted environment
↓
verify build
↓
simulation/devnet
↓
policy checks
↓
deployment authorization
↓
deploy
↓
record program ID + tx signature

Start with devnet.

Production/mainnet deployment must require explicit authorization.

---

# 20. ON-CHAIN REGISTRY

Create an Anchor program:

hive_registry

Purpose:

provide publicly verifiable records for important events.

DO NOT put all workflow data on-chain.

Store hashes/checkpoints.

Possible PDA:

WorkflowReceipt

Fields:

workflow_id
requester
artifact_root_hash
status
created_at
completed_at

Task receipt:

workflow
task_id_hash
builder
verifier
artifact_hash
decision
timestamp

This lets anyone verify recorded, authorized claims about:

which worker identity submitted it
which verifier identity reviewed it
which artifact hash was accepted
when the record was committed

A receipt proves an attestation and its integrity, not that arbitrary code is correct or that two wallet owners are independent.

without storing massive code on-chain.

---

# 21. ESCROW / PAYMENTS

Build:

hive_escrow

Support the configured $HMD SPL token for job escrow and rewards from the first usable release. SOL is for network fees and account rent. Optional SOL job payments are a separate, disabled-by-default extension, not a substitute for $HMD.

Workflow:

user funds job
↓
funds locked
↓
tasks completed
↓
verified work accepted
↓
worker reward becomes claimable

Do NOT release payment merely because a worker submitted something.

Payment requires accepted verification.

Track:

total budget
reserved amount
builder reward
verifier reward
protocol fee
refunded amount

Example configurable split:

builder 80%
verifier 15%
protocol 5%

Do not hardcode percentages.

---

# 22. PAYMENT SAFETY

Use integer token base units for $HMD and integer lamports for SOL fees/rent. Read and validate the configured mint's decimals and token program. Serialize monetary values as decimal strings in JSON and use checked integer arithmetic on-chain. Never use JavaScript Number or floating-point accounting.

Protect against:

double claims
double payouts
replayed instructions
incorrect PDA authority
unauthorized cancellation
duplicate acceptance

Write Anchor tests for all payment paths.

---

# 23. REPUTATION

Track reputation separately for:

BUILDING
VERIFYING

Metrics:

tasks attempted
tasks accepted
tasks rejected
verification agreement
timeouts
failures
average execution time

Do NOT make reputation simply "number of jobs."

Use Bayesian/smoothed scoring so a worker with 1/1 success does not outrank a worker with hundreds of successful jobs solely because of percentage.

---

# 24. ANTI-COLLUSION

Track relationships between builder/verifier assignments.

Avoid repeatedly pairing the same workers.

Create pairing history.

Scheduler should penalize:

frequent A→B verification
same ownership
suspicious coordinated behavior

Seats controlled by the same wallet are ineligible to independently verify each other's work. Do not weaken this rule when the worker pool is small; report unavailable verifier capacity.

---

# 25. FINAL WORKFLOW VERIFIER

After all tasks finish, run a final integration verification.

Example:

PROGRAM accepted
BACKEND accepted
FRONTEND accepted

does NOT automatically mean:

PRODUCT works.

Final verifier checks the combined output.

Run:

build
integration tests
end-to-end tests
deployment checks
link checks
API health checks

Only then:

workflow → COMPLETED

---

# 26. EVENT SYSTEM

Every important action generates an event.

Examples:

workflow.created
workflow.planned
task.queued
task.claimed
task.started
task.submitted
verification.started
verification.accepted
verification.rejected
task.retry
artifact.created
worker.online
worker.offline
deployment.started
deployment.completed
payment.released
workflow.completed

Events must contain timestamps.

Store events for auditability.

Also publish authorized events over SSE. The existing dashboard currently polls a snapshot every 15 seconds; preserve its exact contract and add streaming as a separate integration.

---

# 27. PUBLIC EXPLORER API

Create APIs so the frontend can show the hive operating live.

GET /workflows/:id

GET /workflows/:id/tasks

GET /workflows/:id/events

GET /tasks/:id

GET /workers

GET /workers/:id

GET /artifacts/:id

Example response:

Workflow
"Build NFT staking app"

STATUS
RUNNING

Architecture
✓ BUILT
✓ VERIFIED

Solana Program
✓ BUILT
VERIFYING...

Frontend
RUNNING

Deployment
BLOCKED

Display:

builder
verifier
timestamps
attempt count
verification results
artifact hashes

Do not expose secrets or private prompts.

---

# 28. REAL-TIME UPDATES

Implement:

GET /workflows/:id/events/stream

using Server-Sent Events or authenticated WebSockets.

Frontend should receive state changes immediately.

Do not poll every second.

---

# 29. DATABASE

Create proper normalized models for:

User
Wallet
Seat
Worker
WorkerCapability
WorkerHeartbeat
Workflow
WorkflowTask
TaskDependency
TaskAttempt
TaskLease
Artifact
ArtifactVersion
Verification
VerificationCheck
WorkflowEvent
Repository
Deployment
Escrow
Payment
Reward
Reputation
WorkerPairing

Add appropriate indexes.

Important indexes:

workflow status
task status
worker status
seat mint
wallet
task required capabilities
created_at
lease expiration

Use database transactions for critical state transitions.

---

# 30. IDEMPOTENCY

Critical operations need idempotency.

Examples:

workflow creation
task claiming
artifact submission
verification result
payment release
deployment request

Use idempotency keys.

Retries must not duplicate effects.

---

# 31. CONCURRENCY

Expect multiple workers to request tasks simultaneously.

Task claiming MUST be atomic.

Use PostgreSQL locking or equivalent:

SELECT ... FOR UPDATE SKIP LOCKED

or another correct transactional mechanism.

Two workers must never successfully claim the same task attempt.

---

# 32. HEARTBEATS

Worker heartbeat:

POST /workers/:id/heartbeat

Example every:

15 seconds

Mark unavailable after configurable threshold.

Heartbeat contains:

currentJobs
cpuLoad optional
memoryLoad optional
daemonVersion

Never trust worker-reported statistics for financial/reputation decisions without independent evidence.

---

# 33. WORKER PROTOCOL

Create a documented protocol.

Endpoints/messages:

REGISTER
HEARTBEAT
REQUEST_JOB
CLAIM_JOB
START_JOB
UPLOAD_ARTIFACT
SUBMIT_JOB
RENEW_LEASE
REPORT_ERROR

Verifier:

REQUEST_VERIFICATION
CLAIM_VERIFICATION
SUBMIT_VERIFICATION

Use schemas for every payload.

Use Zod.

Reject unknown/malformed critical fields.

---

# 34. SECURITY

Implement:

rate limiting
CORS configuration
helmet/security headers
request-size limits
wallet signature authentication
RBAC
schema validation
SQL injection protection
path traversal protection
archive extraction protection
SSRF defenses
command execution isolation
secret scanning
dependency checks
audit logs

Never trust:

worker output
repository contents
uploaded archives
AI-generated commands
client-supplied wallet information

Treat all as hostile input.

---

# 35. PROMPT INJECTION AND TOOL AUTHORIZATION

Treat user briefs, repositories, dependencies, artifacts, logs, web content, and model output as untrusted data. Repository text must never override server policy or expand permissions.

The orchestrator, not the model, authorizes tool execution, write paths, network access, deployment, acceptance, and payments. Validate each tool request against a pinned task policy. A command embedded in a README is not authorization. Separate instructions from retrieved data, preserve provenance, and redact secrets before logs or AI calls.

Provide adversarial tests for instructions that request secret disclosure, altered tests, unauthorized writes, network access, self-acceptance, or payment release.

# 36. SOLANA RELEASE WORKFLOW AND DEPLOYMENT HANDOFF

Reference concept: reviewed program work proceeds through deployment, a website built against the real deployment, publication, and live validation. Admission checks capability and permissions before charging. See https://imd.fun/docs/#workflows.

Implement three explicit product modes:
- Build only: source/artifacts and verification, with optional authorized repository delivery.
- Website/API: build, review, authorized hosting, and live validation.
- Solana application: program build/tests/review, authorized deployment, integration against actual program details, hosting, and final live validation.

The required Solana application dependency chain is:

approved plan + confirmed funding
-> program implementation + tests
-> independent program review
-> trusted rebuild
-> authorized devnet deployment
-> immutable deployment handoff
-> frontend/API integration against that handoff
-> independent integration review
-> authorized publication
-> live verification
-> completed release

UI scaffolding may run in parallel, but final integration must depend on the actual deployment. No guessed program IDs, placeholder transaction signatures, or simulated deployed results.

Create a versioned deployment manifest containing:
- workflow/release ID, cluster and genesis hash;
- repository and accepted commit;
- toolchain and build-image digests;
- program ID, loader type, program-data account when applicable;
- binary digest and verification method;
- IDL location and digest;
- configuration/account addresses, PDA seed specifications, relevant token mints;
- transaction signatures, observed slots and commitment;
- upgrade authority and approved authority policy;
- public client configuration, with no secret RPC credentials.

Frontend/API artifacts must record the manifest digest they consumed. Final validation checks the deployed executable, IDL/configuration consistency, published asset hashes, API health, and required end-to-end user behavior. Do not compare unrelated binary/account byte layouts blindly; document the verification method for the supported loader.

For hosting propagation, persist deadline, attempt count and next retry. A later release may supersede a site alias without erasing the earlier immutable release. A site URL alone is not proof of completion.

# 37. BURN-TO-MINT FOR THE APPROVED 888 SEATS

Implement a mint module and an on-chain program/validated program integration that atomically enforces the required $HMD burn and issuance of one approved NFT identity. Server-side promises of a future mint are insufficient.

The program must reject wrong token mints, incorrect amounts, unauthorized signers, invalid token programs, repeated request IDs, duplicate identity IDs, and issuance above the approved supply. It must bind identity IDs to committed approved metadata, not caller-selected arbitrary URLs. Burn and issuance must roll back together on failure.

Preserve all source PNGs, seeds, traits, ranks, and the collection lock. Generate a separate publication manifest with durable metadata/image URLs, hashes, and the mapping:
collection ID -> cluster -> NFT mint/asset address -> metadata URI.
Do not rewrite locked source assets to publish metadata.

Define configurable collection format, mint authority, burn amount in base units, eligibility/per-wallet policy, ID allocation policy and gas sponsorship. Do not choose production economics or addresses without owner input. Clearly distinguish local/devnet fixtures from real addresses.

If an existing deployed collection is supplied, reconcile its verified members with approved IDs before enabling new issuance; do not create a competing replacement collection.

Provide:
GET /api/mint/config
POST /api/mint/quote
POST /api/mint/prepare
POST /api/mint/confirm
GET /api/mint/requests/:id

Persist quote digest, wallet, amount, approved identity, cluster, expiry, request ID, transaction state and final result. Confirm by server-side chain inspection. A client-supplied signature or successful simulation is not proof of minting. Temporary allocation reservations must survive retries and be released only when safe.

# 38. REQUEST ADMISSION, QUOTES AND BUDGETS

Provide one canonical request flow; /jobs may be a compatibility alias:
POST /api/requests/quote
POST /api/requests/:id/prepare-payment
POST /api/requests/:id/submit
GET /api/requests/:id
GET /api/capabilities

Before requesting funding, validate the plan, supported skills, independent verifier capacity, required external integrations, requester permissions and budget. Return structured blockers. Capacity can change after quoting: define admission timeout and refund behavior.

Pin plan version/hash, input artifact hashes, requester, cluster, asset mint, amount, fee allocation, attempt allowances, expiry, destination escrow and permissions into the quote. Identical idempotency key and payload return the original result; changed payload returns a conflict.

Record planning/AI usage and enforce quotas, cost limits, wall-clock limits and rate limits even before funding. The owner must define how planning, retries and verifier effort are priced. No unapproved extra charge after budget exhaustion.

Quote/payment/admission states are separate from workflow execution. After payment succeeds but process creation fails, reconciliation must eventually create exactly one workflow or follow the defined refund path.

# 39. DURABLE STATE MACHINES AND QUEUE RECOVERY

PostgreSQL is the source of truth. BullMQ carries delivery notifications and runnable work; it is not authoritative for acceptance, ownership or balances.

Commit domain transitions and an outbox record in one database transaction. Publish outbox events with retry; consumers deduplicate with stable event IDs. Rebuild queue work after Redis loss.

Use database time and monotonically increasing lease generations/fencing tokens. Every start, renew, upload completion, submission and verification result must bind to the active task attempt and lease generation. Reject stale workers after reassignment, even if their output is valid.

Heartbeat liveness is distinct from an attempt lease. Allocate concurrency slots atomically across builds and reviews. Reclaim expired verifier leases too.

Add workflow states/reasons for QUOTED, AWAITING_FUNDS, AWAITING_APPROVAL, BLOCKED and REFUND_PENDING where appropriate. Track release stage, payment state and execution state separately. Persist retry schedules, cancellation propagation, terminal reasons and resumable checkpoints.

State transition tables must identify authorized actor, preconditions, transaction effects, event, and recovery behavior. Cancellation revokes work leases, blocks stale submissions and preserves any earned obligations under the approved settlement policy.

# 40. DEVICE CREDENTIALS, OWNERSHIP TRANSFERS AND AI RUNTIMES

Support enrollment by wallet-signed approval of a generated device public key, followed by short-lived scoped device credentials. A wallet key file may be an explicit local development option, but unattended operation must not require placing the seat-owning wallet inside task execution.

Credentials bind wallet, seat, worker, device, scopes, expiry and authorization generation. Provide rotation, revocation and logout. Keep wallet/device credentials outside sandbox mounts and prompts.

Verify collection membership using the explicitly supported NFT standard, trusted program ownership and authoritative ownership evidence. Metadata name, image, symbol and an unverified collection claim are insufficient. Reject unsupported standards explicitly.

Recheck before assignment and on a bounded schedule. Record ownership observation slot and freshness. If ownership cannot be confirmed beyond the allowed window, suspend new assignments. On transfer/revocation, invalidate old device authority and leases. Pin reward beneficiaries at earning time so later transfers cannot redirect already-earned rewards; unfinished-work policy must be explicit.

Define an AgentRuntime adapter for holders' existing agents: capability discovery, execution, cancellation, streaming logs, artifact output and usage. Implement at least one real supported runtime adapter plus provider-backed execution. Distinguish a callable model from an agent loop: provide bounded tool execution, iterations, token usage and cost controls.

Worker-owned model keys stay local. Central model keys may only be used by a trusted service or scoped proxy with quotas. Never distribute shared provider keys to workers.

# 41. VERIFICATION TRUST, SKILLS AND ARTIFACT INTEGRATION

Pin a versioned runnable skill catalog containing input/output schemas, toolchain, permitted write paths, commands, acceptance criteria, network profile and limits. Reference material is distinct from executable skills.

Builder output cannot edit the server acceptance policy or remove required tests. Independent verifier evidence binds to exact artifact hashes, input hashes, commit and runner environment. Missing, skipped or empty required checks fail. LLM confidence never overrides a failed required check.

For payout eligibility, reproduce required deterministic checks in a trusted isolated runner; decentralized verifier logs alone are untrusted claims. Human/semantic quality still depends on reviewer judgment. Define escalation/disputes and stronger review policy for money-moving program changes. Do not claim automatic review equals a security audit.

Verifiers have independent capacity, leases, retries and compensation policy. No eligible independent verifier means BLOCKED, not self-review. Suspicious pairing and owner relationships affect assignment; different wallets alone are not a Sybil defense.

Parallel tasks pin the same accepted baseline and declare write paths. Reject unauthorized path changes and conflicts. Integration creates a new candidate artifact/commit and must be verified again before becoming an accepted combined baseline. Acceptance of a branch does not automatically approve a changed merge.

Object storage must enforce upload size/type limits, server-verified hashes, immutable finalized objects, tenant authorization and retention. Do not expose permanent private object URLs. Safely reject traversal, symlink escapes and oversized archive expansion. Jobs may consume another workflow's artifacts only if accepted and access is authorized.

# 42. SOLANA TRANSACTION RECONCILIATION AND SETTLEMENT AUTHORITY

Implement a transaction journal for prepared, submitted, confirmed, finalized, expired, failed and unknown outcomes. Track recent blockhash validity, signatures, cluster and business operation ID. Before rebuilding an expired transaction, reconcile whether its business operation already succeeded. Enforce on-chain idempotency across differently signed retries.

Use an explicit commitment policy: finalized chain evidence gates irreversible accounting and terminal mint/settlement results. Indexer/RPC failures must never become successful payment records. Validate expected program/account/mint/amount/beneficiary changes; signature existence alone is insufficient.

The escrow program must validate signer roles, PDA seeds/bumps, token-account ownership, token mint/program, payout authorization and per-task claim uniqueness. Select and document an initial token-program compatibility policy; reject unsupported Token-2022 extensions rather than assuming ordinary transfer/burn accounting.

Define who authorizes acceptance for escrow release: configured coordinator authority, quorum, or another explicitly implemented model. The program cannot infer code correctness from a hash. Document this trust boundary and key rotation/pause powers. An initial centralized settlement authority is not trustless verification.

Maintain a reconciled ledger with checked arithmetic:
funded = remaining escrow + cumulative payouts + cumulative refunds,
with remaining escrow partitioned into available, reserved and claimable obligations without double counting.
Separate protocol income, builder/verifier rewards, fees, rent and sponsorship costs.

Pin fee terms per quote and handle rounding deterministically. Specify whether accepted task rewards vest before final release completion; cancellation/refund cannot spend amounts already claimable. Verifier compensation for honest rejection, dispute windows, timeout refunds and partial work need explicit policies, not invented percentage defaults.

# 43. ACTUAL SANDBOX ENFORCEMENT

Use dedicated execution hosts, unprivileged containers, read-only root filesystems, dropped capabilities, no-new-privileges, seccomp and host security policy where available. No host filesystem mounts, host networking, Docker socket, cloud metadata access or signing credentials inside sandboxes.

Enforce egress through an actual proxy/firewall that validates destinations, redirects, resolved addresses and private-network access. A profile enum alone is not a network boundary. Separate dependency acquisition from no-network test runs and verify lockfiles/cache integrity.

Demonstrate enforcement of CPU, memory, process, wall-clock, disk and output limits. If the host cannot enforce a required control, report execution unavailable rather than silently ignoring it. Clean up after crashes using a janitor. Docker shares the host kernel: document its limitations and supported deployment assumptions.

# 44. API PRIVACY AND EXISTING FRONTEND CONTRACT

Use /api as the canonical namespace with documented aliases if needed. Generate OpenAPI from request/response schemas. Include cursor pagination, request IDs, stable error codes and per-resource authorization.

Workflows, briefs, logs, repository source and artifacts are private by default. Public summaries require explicit visibility policy. Authenticate detail and SSE access; apply the same policy to downloads, cached data and event replay. Device credentials cannot read unrelated workflows. Short-lived signed URLs are scoped to exact objects.

For browser sessions implement secure HttpOnly cookies, CSRF protection for mutation routes, exact allowed origins, expiry and revocation. Worker tokens use explicit scopes. Consume authentication nonces atomically and bind signatures to domain, URI, cluster, wallet and expiry.

Implement GET /api/network/snapshot exactly as DASHBOARD-API.md requires:
{ agents: [], activity: [], jobs: [], reviews: [], artifacts: [] }
All five arrays are present, latest-first, with at most 5,000 records each. Project internal states to the documented lowercase frontend states, including BUSY -> working. nftId is the approved numeric ID, not a Solana address. Serve only authorized public fields and HTTPS artifact links.

Healthy empty data is distinct from an unavailable feed. Do not seed fake online workers or successful jobs. Preserve the existing 15-second polling contract. SSE adds durable event IDs, Last-Event-ID replay, authorization, heartbeat and bounded backpressure; it does not require a frontend rewrite.

Wire wallet, mint and job dialogs with progress, cancellation and clear failures. Replace free-mint copy with configured burn-to-mint terms. Preserve the design, theme, art controls and local-only visitor terminal.

# 45. PUBLISHING, OPERATIONS AND CONFIGURATION

Use a GitHub App with scoped installation credentials for central publication. Verify webhook signatures and replay/delivery IDs. Check requester authority over repository/deployment targets. Approval binds to exact commit/artifact hash, cluster, destination and spend limit; changed artifacts invalidate approval.

Provide real hosting adapters for static exports and, separately, persistent APIs/workers. A static hosting provider cannot run arbitrary backend services. Record publication IDs, artifact digests, URLs, health evidence and rollback targets. Do not roll back an on-chain program automatically without authority and a supported plan.

Provide Docker Compose for API, scheduler, worker gateway, PostgreSQL, Redis and local object storage; keep execution and signer boundaries explicit. Preserve the Netlify static deployment and document backend routing/CORS. Include migrations, backup/restore instructions, health/readiness endpoints, structured redacted logs, metrics, alarms and reconciliation commands.

Configuration must distinguish required production decisions from local fixtures:
cluster/RPC, supported token/NFT standards, HMD mint and decimals, collection address, mint/escrow/registry program IDs, metadata storage, burn amount, mint limits, ID allocation, sponsorship limits, fee/reward/refund policies, settlement/signing authority, model/runtime providers, sandbox hosts, object storage, GitHub App, hosting and allowed origins.

Validate configuration at startup. Optional integrations may be disabled with explicit capability reasons; required missing configuration must not produce fake working endpoints. Do not deploy contracts, upload immutable production metadata or spend real funds as part of a default setup command.

Add models as needed: AuthChallenge, Session, DeviceCredential, OwnershipObservation, MintRequest, CollectionIdentity, Quote, PaymentAttempt, LedgerEntry, Approval, SkillVersion, Release, DeploymentManifest, OutboxEvent, ProcessedEvent and IdempotencyRecord. Uniqueness/foreign-key/check constraints must enforce critical invariants.

# 46. IMPLEMENTATION DELIVERABLES AND COMPLETION EVIDENCE

Implement in usable milestones, with a working vertical slice before extending breadth:
1. Shared schemas, database, auth/device enrollment, real ownership checks and snapshot API.
2. Quote and $HMD escrow, approved-seat minting, chain journal and reconciliation on localnet/devnet.
3. Planner, task DAG, real worker runtime, independent verification, immutable artifacts and retry recovery.
4. Authorized GitHub delivery, Solana deployment handoff, hosting and final validation.
5. Frontend wiring, operations, security tests and documented production decisions.

Provide source code, lockfiles, migrations, Anchor programs/tests, SDK/daemon, OpenAPI, environment example without secrets, setup instructions, operator runbook and IMPLEMENTATION-STATUS.md. Do not supply only interfaces, TODOs, pseudocode, fake adapters or hardcoded success responses.

Required evidence:
- Existing npm run build still verifies all 888 locked artworks and frontend syntax.
- Two separately authorized seats complete a real paid devnet workflow; a failed submission is rejected, corrected and independently accepted.
- Burn failure prevents mint issuance; duplicate request/identity and exhausted supply are rejected.
- Authentication replay, wrong domain, ownership transfer and stale worker submission fail.
- Concurrent claims and simultaneous worker-capacity allocation cannot exceed constraints.
- Crashes between database/outbox/queue steps recover; Redis loss does not lose workflows.
- Expired verification leases recover; duplicate results and stale fencing tokens cannot accept work.
- Confirmed payment with interrupted admission recovers without charging twice.
- Wrong mint/program/beneficiary, duplicate reward claims and cancellation/refund races fail.
- Tampered artifacts, modified required tests, path escapes and forbidden egress fail.
- Private data does not appear in public snapshot, unauthorized SSE or download routes.
- Deployment approval cannot be reused for a changed artifact or cluster.
- Final validation fails on stale program ID, IDL mismatch, missing hosted assets or unhealthy API.
- Restart preserves progress; real provider outages report retry/block/failure states truthfully.

Use test fixtures/mocks only in explicitly labeled tests. Run at least one real provider-backed execution and supported-runtime smoke test when credentials exist. If external credentials or tooling are unavailable, complete all independently testable implementation and report exactly which live scenarios remain unverified.

Do not claim production readiness from unit tests alone. Report implemented, tested locally, tested on devnet, blocked by configuration, and not implemented separately. Do not silently omit requirements or claim successful mainnet deployment/security audit. End with commands to run, evidence obtained and the precise remaining owner decisions.
