import { z } from "zod";

export const CluesStepSchema = z.object({
  clues: z.array(
    z.object({
      id: z.string().trim().min(1),
      title: z.string().trim().min(1),
      content: z.string().trim().min(1),
      revealPhase: z.enum(["reading", "investigation", "discussion", "voting"]),
      pointsTo: z.array(z.string().trim().min(1)).min(1),
    }),
  ),
});

export type CluesStep = z.infer<typeof CluesStepSchema>;
