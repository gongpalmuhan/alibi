-- CreateEnum
CREATE TYPE "ScenarioSource" AS ENUM ('PRESET', 'GENERATED');

-- The queued value is used by the following migration after this transaction
-- commits; PostgreSQL does not permit a newly-added enum value to be used in
-- the same transaction.
ALTER TYPE "GenerationStatus" ADD VALUE IF NOT EXISTS 'queued';

-- AlterTable
ALTER TABLE "Scenario"
ADD COLUMN "source" "ScenarioSource" NOT NULL DEFAULT 'PRESET';

