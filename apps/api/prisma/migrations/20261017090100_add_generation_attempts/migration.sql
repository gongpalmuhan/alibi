-- The prior migration committed the new `queued` GenerationStatus value.
ALTER TABLE "Room" ALTER COLUMN "generationStatus" SET DEFAULT 'queued';

-- CreateTable
CREATE TABLE "GenerationAttempt" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "scenarioId" TEXT,
    "status" "GenerationStatus" NOT NULL DEFAULT 'queued',
    "step" TEXT,
    "model" TEXT NOT NULL,
    "reservedNanoUsd" BIGINT NOT NULL,
    "actualNanoUsd" BIGINT,
    "inputTokens" INTEGER,
    "cachedInputTokens" INTEGER,
    "outputTokens" INTEGER,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GenerationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationBudget" (
    "date" TIMESTAMP(3) NOT NULL,
    "reservedNanoUsd" BIGINT NOT NULL DEFAULT 0,
    "spentNanoUsd" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "GenerationBudget_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE INDEX "GenerationAttempt_roomId_createdAt_idx" ON "GenerationAttempt"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "GenerationAttempt" ADD CONSTRAINT "GenerationAttempt_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationAttempt" ADD CONSTRAINT "GenerationAttempt_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
