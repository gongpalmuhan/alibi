import { z } from "zod";

export const TruthStepSchema = z.object({
  title: z.string().trim().min(1),
  intro: z.string().trim().min(1),
  victim: z.object({
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    deathDescription: z.string().trim().min(1),
  }),
  crimeTime: z.string().trim().min(1),
  crimeLocation: z.string().trim().min(1),
  culpritId: z.string().trim().min(1),
  motive: z.string().trim().min(1),
  method: z.string().trim().min(1),
});

export type TruthStep = z.infer<typeof TruthStepSchema>;
