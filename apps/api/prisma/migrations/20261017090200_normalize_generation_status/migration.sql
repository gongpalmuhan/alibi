-- `queued` was committed in the first migration, so it is now safe to use.
UPDATE "Room"
SET "generationStatus" = 'queued'
WHERE "generationStatus" = 'pending';
