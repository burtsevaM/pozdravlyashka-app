-- AlterTable
ALTER TABLE "Contribution" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Delegation" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "eventId" TEXT,
ALTER COLUMN "endDate" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CelebrationEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Delegation_teamId_eventId_idx" ON "Delegation"("teamId", "eventId");
