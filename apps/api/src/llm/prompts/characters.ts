export const charactersPrompt = (input: {
  theme: string;
  victimName: string;
  suspectIds: string[];
}): string => `Create exactly one living suspect for every supplied ID in this murder game.
Theme: ${input.theme}
NPC victim: ${input.victimName}
Required IDs, in order: ${input.suspectIds.join(", ")}
Do not create the victim as a character. Each suspect needs a distinct private factual secret.`;
