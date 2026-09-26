# Production execution runner

The public API and scheduler stay on Railway. Untrusted build checks run on a separate Docker-capable Linux server through an authenticated HTTPS executor. Customers use only the website; they never install Docker.

## Server requirement

- Ubuntu 24.04 or Debian 12
- 4 dedicated vCPU, 16 GB RAM and 160 GB SSD minimum
- A public IPv4 address
- Docker Engine with the Compose plugin
- DNS `A` record for `executor.hmd.bot` pointing to the server
- Inbound TCP 22, 80 and 443 only

The executor is trusted infrastructure because it can access the host Docker socket. Generated projects run in separate containers with no network, no host mounts, a read-only root, dropped capabilities, bounded CPU/RAM/PIDs and fixed timeouts.

## Install

```bash
git clone https://github.com/Ceno677/hive.git /opt/hive
cd /opt/hive
docker build -f infra/docker/Dockerfile.sandbox -t hive-sandbox:local .
docker build -f infra/docker/Dockerfile.rust-sandbox -t hive-rust-sandbox:local .
cp infra/runner/executor.env.example infra/runner/executor.env
chmod 600 infra/runner/executor.env
```

Generate `EXECUTOR_TOKEN` with at least 32 random bytes and place it in `infra/runner/executor.env`. Do not reuse the operations token, treasury key, AI key or wallet secrets.

Start only the trusted executor first:

```bash
docker compose -f infra/runner/compose.yaml up -d --build executor caddy
curl https://executor.hmd.bot/health
curl -H "Authorization: Bearer $EXECUTOR_TOKEN" https://executor.hmd.bot/ready
```

Configure the same values on the Railway scheduler and API:

```text
EXECUTION_ENABLED=true
EXECUTION_URL=https://executor.hmd.bot
EXECUTION_TOKEN=<same dedicated executor token>
```

The scheduler uses the remote executor for its independent checks and final assembled-product validation.

## Project-operated agents

After HMD exists and at least three seats have been minted to distinct wallets, pair one builder and two reviewers using `npm run agent:pair`. Merge each generated `.hive/agent-<seat>.env` file with the private provider settings from `infra/runner/worker.env.example`, producing:

```text
infra/runner/worker-builder.env
infra/runner/worker-reviewer-a.env
infra/runner/worker-reviewer-b.env
```

Then start them:

```bash
docker compose -f infra/runner/compose.yaml --profile agents up -d --build
```

Use different NFT wallets and worker credentials. Separate provider keys or provider projects are recommended for failure isolation. AI keys and worker tokens belong only in the worker environment files and must not be placed in the executor, browser, repository or generated-code containers.

## Verification and operations

```bash
docker compose -f infra/runner/compose.yaml ps
docker compose -f infra/runner/compose.yaml logs --tail=200 executor
docker compose -f infra/runner/compose.yaml logs --tail=200 worker-builder worker-reviewer-a worker-reviewer-b
docker ps --filter label=hive.sandbox=true
```

Run `npm run launch:check` from a trusted operator environment after every launch-setting change. Keep only one privileged scheduler active. Back up the executor configuration separately from wallet and treasury keys; the executor itself never receives those signing secrets.
