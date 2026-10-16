import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const seedDirectory = dirname(fileURLToPath(import.meta.url));

config({
  path: [
    resolve(seedDirectory, "../../../.env.local"),
    resolve(seedDirectory, "../../../.env"),
  ],
});

const main = async () => {
  if (!process.env.DATABASE_URL) {
    console.info(
      "DATABASE_URL is not set. Add it to .env.local, then run: pnpm --filter @alibi/api db:seed",
    );
    return;
  }

  const [
    { manualScenarioCrimeScenes, manualScenarios },
    { assertValidScenarioTimeline, ScenarioSchema },
  ] = await Promise.all([
    import("../src/scenarios"),
    import("../../../packages/shared/src"),
  ]);

  const scenarios = manualScenarios.map((sourceScenario) => {
    const scenario = ScenarioSchema.parse(sourceScenario);
    const crimeScene = manualScenarioCrimeScenes[scenario.id];

    if (!crimeScene) {
      throw new Error(`Missing crime scene metadata for ${scenario.id}.`);
    }

    assertValidScenarioTimeline(scenario, crimeScene);
    return scenario;
  });

  const { getPrisma } = await import("../src/lib/prisma");
  const prisma = getPrisma();

  try {
    for (const scenario of scenarios) {
      await prisma.scenario.upsert({
        where: { id: scenario.id },
        create: {
          id: scenario.id,
          theme: scenario.theme,
          playerCount: scenario.playerCount,
          data: scenario,
          source: "PRESET",
        },
        update: {
          theme: scenario.theme,
          playerCount: scenario.playerCount,
          data: scenario,
          source: "PRESET",
        },
      });

      console.info(
        `Seeded ${scenario.id}: ${scenario.title} (${scenario.playerCount} players; culprit: ${scenario.truth.culpritId})`,
      );
    }

    const persistedScenarios = await prisma.scenario.findMany({
      where: { id: { in: scenarios.map((scenario) => scenario.id) } },
      select: { id: true, playerCount: true, data: true },
    });

    if (persistedScenarios.length !== scenarios.length) {
      throw new Error("Not every manual scenario was persisted.");
    }

    for (const persistedScenario of persistedScenarios) {
      const scenario = ScenarioSchema.parse(persistedScenario.data);
      const culpritCount = scenario.characters.filter(
        (character) => character.isCulprit,
      ).length;

      if (
        scenario.playerCount !== persistedScenario.playerCount ||
        culpritCount !== 1 ||
        scenario.truth.culpritId !==
          scenario.characters.find((character) => character.isCulprit)?.id
      ) {
        throw new Error(`Persisted scenario failed verification: ${scenario.id}.`);
      }
    }

    console.info(`Verified ${persistedScenarios.length} persisted manual scenarios.`);
  } finally {
    await prisma.$disconnect();
  }
};

void main().catch((error: unknown) => {
  console.error("Failed to seed manual scenarios.", error);
  process.exitCode = 1;
});
