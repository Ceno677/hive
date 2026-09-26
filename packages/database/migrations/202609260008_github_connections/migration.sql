-- CreateTable
CREATE TABLE "GitHubConnectState" (
    "stateHash" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubConnectState_pkey" PRIMARY KEY ("stateHash")
);

-- CreateTable
CREATE TABLE "GitHubRepository" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "private" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubRepository_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GitHubConnectState_expiresAt_idx" ON "GitHubConnectState"("expiresAt");

-- CreateIndex
CREATE INDEX "GitHubRepository_wallet_account_idx" ON "GitHubRepository"("wallet", "account");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubRepository_wallet_fullName_key" ON "GitHubRepository"("wallet", "fullName");

-- AddForeignKey
ALTER TABLE "GitHubConnectState" ADD CONSTRAINT "GitHubConnectState_wallet_fkey" FOREIGN KEY ("wallet") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubRepository" ADD CONSTRAINT "GitHubRepository_wallet_fkey" FOREIGN KEY ("wallet") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
