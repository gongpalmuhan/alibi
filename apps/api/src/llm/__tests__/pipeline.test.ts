import type { Scenario } from "../../../../../packages/shared/src";
import { describe, expect, it } from "vitest";

import { generateScenario, PipelineGenerationError } from "../pipeline";
import type {
  GenerateStructuredInput,
  LlmProvider,
  LlmUsage,
  StructuredGeneration,
} from "../openaiProvider";
import { validateGeneratedScenario } from "../validate";
import { redactScenarioFor } from "../../services/redact";

const usage: LlmUsage = {
  inputTokens: 10,
  cachedInputTokens: 0,
  outputTokens: 10,
};

type ProviderOptions = {
  playerCount?: 4 | 5 | 6;
  invalidTimelineAttempts?: number;
  invalidCharacters?: boolean;
  verificationCulpritId?: string;
};

class FixtureProvider implements LlmProvider {
  readonly calls: string[] = [];
  private timelineAttempts = 0;

  constructor(private readonly options: ProviderOptions = {}) {}

  async generateStructured<T>(
    input: GenerateStructuredInput<T>,
  ): Promise<StructuredGeneration<T>> {
    this.calls.push(input.step);
    const data = this.fixtureFor(input.step);
    return { data: input.schema.parse(data), usage };
  }

  private fixtureFor(step: string): unknown {
    const ids = ["suspect-1", "suspect-2", "suspect-3", "suspect-4", "suspect-5", "suspect-6"];
    const characters = ids.slice(0, this.options.playerCount ?? 4);
    switch (step) {
      case "truth":
        return {
          title: "폭풍 속 저택",
          intro: "폭풍이 몰아치는 밤, 저택의 주인이 죽었다.",
          victim: { name: "박 회장", description: "저택의 주인", deathDescription: "서재에서 숨진 채 발견되었다." },
          crimeTime: "22:00",
          crimeLocation: "서재",
          culpritId: "suspect-1",
          motive: "상속 분쟁",
          method: "독이 든 위스키",
        };
      case "characters":
        return {
          characters: characters.map((id, index) => ({
            id: this.options.invalidCharacters && index === 3 ? "victim" : id,
            name: `용의자 ${index + 1}`,
            occupation: "가족",
            relationshipToVictim: "가족",
            publicProfile: "침착해 보인다.",
            secretFact: "피해자에게 숨긴 빚이 있다.",
          })),
        };
      case "timeline": {
        this.timelineAttempts += 1;
        const invalid = this.timelineAttempts <= (this.options.invalidTimelineAttempts ?? 0);
        const people = characters;
        return {
          timeline: people.map((characterId, index) => ({
            time: "22:00",
            characterId,
            location: invalid && index === 0 ? "복도" : "서재",
            action: characterId === "suspect-1" ? "murder를 실행했다." : "소리를 들었다.",
            witnessedBy: people.filter((id) => id !== characterId),
          })),
        };
      }
      case "scripts":
        return {
          privateScript: "나는 범인이다. 범행을 숨겨라.",
          secret: "나만 아는 비밀이 있다.",
          objectives: ["의심을 피하라"],
        };
      case "clues":
        return {
          clues: [
            {
              id: "clue-1",
              title: "깨진 잔",
              content: "서재의 잔에서 독 성분이 검출되었다.",
              revealPhase: "investigation",
              pointsTo: ["suspect-1", "suspect-2"],
            },
          ],
        };
      case "verification":
        return { culpritId: this.options.verificationCulpritId ?? "suspect-1" };
      default:
        throw new Error(`Unexpected step: ${step}`);
    }
  }
}

const run = async (provider: LlmProvider, playerCount: 4 | 5 | 6 = 4) =>
  generateScenario(provider, {
    theme: "1920년대 저택",
    playerCount,
    scenarioId: "generated-test",
    onStep: () => undefined,
    onUsage: () => undefined,
  });

describe("LLM scenario pipeline", () => {
  it.each([4, 5, 6] as const)("validates and returns a %i-player scenario", async (playerCount) => {
    // This fixture supports all counts through its deterministic IDs.
    const provider = new FixtureProvider({ playerCount });
    const scenario = await run(provider, playerCount);
    expect(scenario.playerCount).toBe(playerCount);
    expect(scenario.characters).toHaveLength(playerCount);
    expect(scenario.truth.culpritId).toBe("suspect-1");
  });

  it("rejects a victim accidentally returned as a player character", async () => {
    await expect(run(new FixtureProvider({ invalidCharacters: true }))).rejects.toMatchObject({
      code: "CHARACTER_IDS_INVALID",
    } satisfies Partial<PipelineGenerationError>);
  });

  it("rejects zero or multiple culprits through the final ScenarioSchema check", () => {
    const base: Scenario = {
      id: "scenario",
      title: "제목",
      theme: "테마",
      playerCount: 4,
      intro: "소개",
      victim: { name: "NPC", description: "피해자", deathDescription: "사망" },
      characters: ["suspect-1", "suspect-2", "suspect-3", "suspect-4"].map((id) => ({
        id,
        name: id,
        occupation: "직업",
        publicProfile: "프로필",
        privateScript: "개인 대본",
        secret: "비밀",
        objectives: ["목표"],
        isCulprit: false,
      })),
      clues: [],
      truth: {
        culpritId: "suspect-1",
        motive: "동기",
        method: "수법",
        timeline: [],
      },
    };
    expect(() => validateGeneratedScenario(base)).toThrow("does not match ScenarioSchema");
    base.characters[0].isCulprit = true;
    base.characters[1].isCulprit = true;
    expect(() => validateGeneratedScenario(base)).toThrow("does not match ScenarioSchema");
  });

  it("regenerates only the timeline step, at most twice", async () => {
    const provider = new FixtureProvider({ invalidTimelineAttempts: 2 });
    await run(provider);
    expect(provider.calls.filter((step) => step === "timeline")).toHaveLength(3);
    expect(provider.calls.filter((step) => step === "truth")).toHaveLength(1);
    expect(provider.calls.filter((step) => step === "characters")).toHaveLength(1);
  });

  it("does not return a scenario when verification picks another culprit", async () => {
    await expect(
      run(new FixtureProvider({ verificationCulpritId: "suspect-2" })),
    ).rejects.toMatchObject({ code: "VERIFICATION_FAILED" } satisfies Partial<PipelineGenerationError>);
  });

  it("keeps truth, private scripts, secrets, and clue points out of public data", async () => {
    const scenario = await run(new FixtureProvider());
    const publicScenario = redactScenarioFor(scenario, "lobby", null);
    const serialized = JSON.stringify(publicScenario);
    expect(publicScenario).not.toHaveProperty("truth");
    expect(serialized).not.toContain("privateScript");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("pointsTo");
    expect(serialized).not.toContain("isCulprit");
  });
});
