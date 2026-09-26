ALTER TABLE "Workflow" ADD COLUMN "deploymentTarget" TEXT;
CREATE UNIQUE INDEX "Workflow_deploymentTarget_key" ON "Workflow"("deploymentTarget");
