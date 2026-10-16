export const verificationPrompt = (input: {
  scripts: Array<{ id: string; privateScript: string; secret: string; objectives: string[] }>;
  clues: Array<{ title: string; content: string }>;
}): string => `Infer exactly one culprit ID from these player scripts and public clues. Do not assume access to any hidden truth.
Scripts: ${JSON.stringify(input.scripts)}
Public clues: ${JSON.stringify(input.clues)}`;
