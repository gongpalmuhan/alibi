import type {
  Phase,
  RedactedCharacter,
  RedactedScenario,
  Scenario,
} from "../../../../packages/shared/src";

type RequestingPlayer = {
  characterId: string | null;
};

const phaseOrder: Record<Phase, number> = {
  lobby: 0,
  reading: 1,
  investigation: 2,
  discussion: 3,
  voting: 4,
  reveal: 5,
};

export const redactScenarioFor = (
  scenario: Scenario,
  phase: Phase,
  requestingPlayer: RequestingPlayer | null,
): RedactedScenario => {
  const canReadPrivateCharacter =
    phase !== "lobby" &&
    requestingPlayer !== null &&
    requestingPlayer.characterId !== null;

  const characters = scenario.characters.map((character) => {
    const publicCharacter: RedactedCharacter = {
      id: character.id,
      name: character.name,
      occupation: character.occupation,
      publicProfile: character.publicProfile,
    };

    if (
      canReadPrivateCharacter &&
      character.id === requestingPlayer?.characterId
    ) {
      return {
        ...publicCharacter,
        privateScript: character.privateScript,
        secret: character.secret,
        objectives: character.objectives,
      };
    }

    return publicCharacter;
  });

  const clues = scenario.clues
    .filter((clue) => phaseOrder[clue.revealPhase] <= phaseOrder[phase])
    .map(({ pointsTo: _pointsTo, ...clue }) => clue);

  return {
    id: scenario.id,
    title: scenario.title,
    theme: scenario.theme,
    playerCount: scenario.playerCount,
    intro: scenario.intro,
    victim: scenario.victim,
    characters,
    clues,
    ...(phase === "reveal" ? { truth: scenario.truth } : {}),
  };
};
