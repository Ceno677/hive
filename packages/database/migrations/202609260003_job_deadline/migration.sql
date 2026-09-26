ALTER TABLE "Workflow" ADD COLUMN "deadlineHours" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "Workflow" ADD COLUMN "deadlineAt" TIMESTAMP(3);
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_deadlineHours_check" CHECK ("deadlineHours" >= 1 AND "deadlineHours" <= 168);
CREATE INDEX "Workflow_deadlineAt_status_idx" ON "Workflow"("deadlineAt", "status");
