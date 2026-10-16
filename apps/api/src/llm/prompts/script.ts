export const scriptPrompt = (input: {
  character: { id: string; name: string; occupation: string; publicProfile: string; secretFact: string };
  isCulprit: boolean;
  victimName: string;
}): string => `Write a private Korean role script for one player in a murder game.
Player: ${input.character.name} (${input.character.id}), ${input.character.occupation}
Public profile: ${input.character.publicProfile}
Private factual secret: ${input.character.secretFact}
NPC victim: ${input.victimName}
${input.isCulprit ? "You are the culprit. Explicitly state that the player is the culprit in the private script." : "You are not the culprit, but you must have a personal secret."}
Only write information this character could know. Do not reveal other players' private scripts.`;
