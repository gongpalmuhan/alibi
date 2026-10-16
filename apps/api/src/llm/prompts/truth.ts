export const truthPrompt = (input: {
  theme: string;
  suspectIds: string[];
}): string => `Create the hidden murder truth for a social deduction game.
Theme: ${input.theme}
Player character IDs (use exactly one as culprit): ${input.suspectIds.join(", ")}
The victim is an NPC and must never be one of those IDs. Return Korean text where appropriate.`;
