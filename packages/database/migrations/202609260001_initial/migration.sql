-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Wallet" (
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "AuthChallenge" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "tokenHash" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "csrfHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "Seat" (
    "id" INTEGER NOT NULL,
    "mint" TEXT,
    "imageHash" TEXT NOT NULL,
    "metadataUri" TEXT,
    "ownerWallet" TEXT,
    "checkedAt" TIMESTAMP(3),
    "slot" BIGINT,

    CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "seatId" INTEGER NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capabilities" TEXT[],
    "maxConcurrent" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "tokenHash" TEXT NOT NULL,
    "generation" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "heartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "buildAccepted" INTEGER NOT NULL DEFAULT 0,
    "buildRejected" INTEGER NOT NULL DEFAULT 0,
    "verifyAccepted" INTEGER NOT NULL DEFAULT 0,
    "timeouts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "public" BOOLEAN NOT NULL DEFAULT false,
    "plan" JSONB,
    "planHash" TEXT,
    "failure" TEXT,
    "amount" TEXT NOT NULL,
    "builderBps" INTEGER NOT NULL,
    "verifierBps" INTEGER NOT NULL,
    "treasury" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "fundedSignature" TEXT,
    "escrow" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "requiredSkills" TEXT[],
    "policy" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'BLOCKED',
    "generation" INTEGER NOT NULL DEFAULT 0,
    "buildCount" INTEGER NOT NULL DEFAULT 0,
    "acceptedArtifact" TEXT,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dependency" (
    "taskId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,

    CONSTRAINT "Dependency_pkey" PRIMARY KEY ("taskId","parentId")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "ownerWallet" TEXT NOT NULL,
    "seatId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "generation" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'CLAIMED',
    "leaseUntil" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "submissionHash" TEXT,
    "feedback" JSONB,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "artifactHash" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "checks" JSONB NOT NULL,
    "issues" JSONB NOT NULL,
    "trustedEvidence" JSONB,
    "state" TEXT NOT NULL DEFAULT 'PENDING_TRUSTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "seq" BIGSERIAL NOT NULL,
    "workflowId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "ChainOperation" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT,
    "mintRequestId" TEXT,
    "operationKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PREPARED',
    "signature" TEXT,
    "transaction" TEXT,
    "lastValidBlockHeight" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChainOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MintRequest" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "seatId" INTEGER NOT NULL,
    "amount" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'QUOTED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "signature" TEXT,
    "mint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MintRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "beneficiary" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "receiptHash" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'CLAIMABLE',
    "signature" TEXT,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "operationKey" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "beneficiary" TEXT,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "artifactHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "cluster" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "kind" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "artifactHash" TEXT NOT NULL,
    "manifest" JSONB,
    "url" TEXT,
    "failure" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pairing" (
    "builder" TEXT NOT NULL,
    "verifier" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pairing_pkey" PRIMARY KEY ("builder","verifier")
);

-- CreateIndex
CREATE INDEX "AuthChallenge_expiresAt_idx" ON "AuthChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_wallet_idx" ON "Session"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_mint_key" ON "Seat"("mint");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_seatId_key" ON "Worker"("seatId");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_deviceKey_key" ON "Worker"("deviceKey");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_tokenHash_key" ON "Worker"("tokenHash");

-- CreateIndex
CREATE INDEX "Worker_status_heartbeatAt_idx" ON "Worker"("status", "heartbeatAt");

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_fundedSignature_key" ON "Workflow"("fundedSignature");

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_escrow_key" ON "Workflow"("escrow");

-- CreateIndex
CREATE INDEX "Workflow_status_createdAt_idx" ON "Workflow"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_wallet_requestKey_key" ON "Workflow"("wallet", "requestKey");

-- CreateIndex
CREATE INDEX "Task_state_idx" ON "Task"("state");

-- CreateIndex
CREATE UNIQUE INDEX "Task_workflowId_key_key" ON "Task"("workflowId", "key");

-- CreateIndex
CREATE INDEX "Attempt_state_leaseUntil_idx" ON "Attempt"("state", "leaseUntil");

-- CreateIndex
CREATE INDEX "Attempt_workerId_state_idx" ON "Attempt"("workerId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_taskId_generation_key" ON "Attempt"("taskId", "generation");

-- CreateIndex
CREATE UNIQUE INDEX "Artifact_attemptId_key" ON "Artifact"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "Artifact_objectKey_key" ON "Artifact"("objectKey");

-- CreateIndex
CREATE INDEX "Artifact_workflowId_accepted_idx" ON "Artifact"("workflowId", "accepted");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_attemptId_key" ON "Verification"("attemptId");

-- CreateIndex
CREATE INDEX "Verification_state_idx" ON "Verification"("state");

-- CreateIndex
CREATE INDEX "Event_publishedAt_seq_idx" ON "Event"("publishedAt", "seq");

-- CreateIndex
CREATE INDEX "Event_workflowId_seq_idx" ON "Event"("workflowId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "ChainOperation_operationKey_key" ON "ChainOperation"("operationKey");

-- CreateIndex
CREATE UNIQUE INDEX "ChainOperation_signature_key" ON "ChainOperation"("signature");

-- CreateIndex
CREATE INDEX "ChainOperation_state_idx" ON "ChainOperation"("state");

-- CreateIndex
CREATE UNIQUE INDEX "MintRequest_signature_key" ON "MintRequest"("signature");

-- CreateIndex
CREATE UNIQUE INDEX "MintRequest_mint_key" ON "MintRequest"("mint");

-- CreateIndex
CREATE INDEX "MintRequest_seatId_state_idx" ON "MintRequest"("seatId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "MintRequest_wallet_requestKey_key" ON "MintRequest"("wallet", "requestKey");

-- CreateIndex
CREATE INDEX "Reward_beneficiary_state_idx" ON "Reward"("beneficiary", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Reward_workflowId_receiptHash_kind_key" ON "Reward"("workflowId", "receiptHash", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_operationKey_key" ON "LedgerEntry"("operationKey");

-- CreateIndex
CREATE INDEX "LedgerEntry_workflowId_idx" ON "LedgerEntry"("workflowId");

-- CreateIndex
CREATE INDEX "Approval_workflowId_action_idx" ON "Approval"("workflowId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "Release_workflowId_kind_artifactHash_target_key" ON "Release"("workflowId", "kind", "artifactHash", "target");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_wallet_fkey" FOREIGN KEY ("wallet") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_wallet_fkey" FOREIGN KEY ("wallet") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_wallet_fkey" FOREIGN KEY ("wallet") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dependency" ADD CONSTRAINT "Dependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dependency" ADD CONSTRAINT "Dependency_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChainOperation" ADD CONSTRAINT "ChainOperation_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "Seat" ADD CONSTRAINT "seat_range" CHECK (id BETWEEN 1 AND 888);
ALTER TABLE "Workflow" ADD CONSTRAINT "fee_range" CHECK ("builderBps" >= 0 AND "verifierBps" >= 0 AND "builderBps" + "verifierBps" <= 10000);
ALTER TABLE "Worker" ADD CONSTRAINT "capacity_range" CHECK ("maxConcurrent" BETWEEN 1 AND 4);
ALTER TABLE "Dependency" ADD CONSTRAINT "no_self_dependency" CHECK ("taskId" <> "parentId");
ALTER TABLE "Artifact" ADD CONSTRAINT "artifact_size" CHECK (bytes > 0 AND bytes <= 2000000);
