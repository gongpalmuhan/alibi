import { z } from "zod";

export const CharactersStepSchema = z.object({
  characters: z.array(
    z.object({
      id: z.string().trim().min(1),
      name: z.string().trim().min(1),
      occupation: z.string().trim().min(1),
      relationshipToVictim: z.string().trim().min(1),
      publicProfile: z.string().trim().min(1),
      secretFact: z.string().trim().min(1),
    }),
  ),
});

export type CharactersStep = z.infer<typeof CharactersStepSchema>;
