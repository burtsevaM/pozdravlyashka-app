ALTER TABLE "Notification"
ADD COLUMN "title" TEXT,
ADD COLUMN "reminderOffsetDays" INTEGER,
ADD COLUMN "readAt" TIMESTAMP(3),
ADD COLUMN "errorMessage" TEXT;

CREATE UNIQUE INDEX "Notification_eventId_userId_channel_type_reminderOffsetDays_key"
ON "Notification"("eventId", "userId", "channel", "type", "reminderOffsetDays");

CREATE INDEX "Notification_userId_createdAt_idx"
ON "Notification"("userId", "createdAt");
