export const cluesPrompt = (input: {
  theme: string;
  characterIds: string[];
  culpritId: string;
}): string => `Create public clues for a Korean murder mystery game.
Theme: ${input.theme}
Suspect IDs: ${input.characterIds.join(", ")}
The actual culprit is ${input.culpritId}; clues should collectively lead there, but no single clue may identify that ID alone. Store internal pointsTo IDs for validation.`;
