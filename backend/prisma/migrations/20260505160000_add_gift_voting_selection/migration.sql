-- Add selected final gift to celebration events.
ALTER TABLE "CelebrationEvent" ADD COLUMN "selectedGiftIdeaId" TEXT;
ALTER TABLE "GiftIdea" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Attach votes to events so one user can have only one active vote per event.
ALTER TABLE "Vote" ADD COLUMN "eventId" TEXT;

UPDATE "Vote"
SET "eventId" = "GiftIdea"."eventId"
FROM "GiftIdea"
WHERE "Vote"."ideaId" = "GiftIdea"."id";

DELETE FROM "Vote"
WHERE "eventId" IS NULL;

DELETE FROM "Vote"
WHERE ctid IN (
  SELECT ctid
  FROM (
    SELECT
      ctid,
      ROW_NUMBER() OVER (
        PARTITION BY "eventId", "userId"
        ORDER BY "createdAt" DESC, "id" DESC
      ) AS row_number
    FROM "Vote"
  ) duplicates
  WHERE duplicates.row_number > 1
);

ALTER TABLE "Vote" ALTER COLUMN "eventId" SET NOT NULL;

DROP INDEX "Vote_ideaId_userId_key";

CREATE UNIQUE INDEX "Vote_eventId_userId_key" ON "Vote"("eventId", "userId");
CREATE INDEX "Vote_ideaId_idx" ON "Vote"("ideaId");

ALTER TABLE "CelebrationEvent" ADD CONSTRAINT "CelebrationEvent_selectedGiftIdeaId_fkey" FOREIGN KEY ("selectedGiftIdeaId") REFERENCES "GiftIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CelebrationEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
