export const timelinePrompt = (input: {
  crimeTime: string;
  crimeLocation: string;
  culpritId: string;
  characters: Array<{ id: string; name: string }>;
}): string => `Create a mutually consistent timeline matrix for this murder.
Crime time: ${input.crimeTime}; crime location: ${input.crimeLocation}; culprit: ${input.culpritId}.
Characters: ${input.characters.map((character) => `${character.id} (${character.name})`).join(", ")}.
Each witness relationship must be reciprocal at the exact same time and location. Nobody may occupy two locations at the same time. Include the culprit at the crime scene at the crime time.`;
