-- CreateTable
CREATE TABLE "HolderDistribution" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREPARED',
    "collection" TEXT NOT NULL,
    "snapshotSlot" BIGINT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "totalAmount" TEXT NOT NULL,
    "eligibleSeats" INTEGER NOT NULL,
    "excludedSeats" INTEGER NOT NULL DEFAULT 0,
    "cutoffAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "HolderDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolderDistributionEntry" (
    "id" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "assetIds" TEXT[],
    "amount" TEXT NOT NULL,
    "receiptHash" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'CLAIMABLE',
    "signature" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HolderDistributionEntry_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Reward" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "holderDistributionId" TEXT;

-- CreateIndex
CREATE INDEX "HolderDistribution_status_createdAt_idx" ON "HolderDistribution"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HolderDistributionEntry_receiptHash_key" ON "HolderDistributionEntry"("receiptHash");

-- CreateIndex
CREATE UNIQUE INDEX "HolderDistributionEntry_distributionId_wallet_key" ON "HolderDistributionEntry"("distributionId", "wallet");

-- CreateIndex
CREATE INDEX "HolderDistributionEntry_state_createdAt_idx" ON "HolderDistributionEntry"("state", "createdAt");

-- CreateIndex
CREATE INDEX "Reward_kind_state_holderDistributionId_createdAt_idx" ON "Reward"("kind", "state", "holderDistributionId", "createdAt");

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_holderDistributionId_fkey" FOREIGN KEY ("holderDistributionId") REFERENCES "HolderDistribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolderDistributionEntry" ADD CONSTRAINT "HolderDistributionEntry_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "HolderDistribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
