import { z } from "zod";

export const TimelineStepSchema = z.object({
  timeline: z.array(
    z.object({
      time: z.string().trim().min(1),
      characterId: z.string().trim().min(1),
      location: z.string().trim().min(1),
      action: z.string().trim().min(1),
      witnessedBy: z.array(z.string().trim().min(1)),
    }),
  ),
});

export type TimelineStep = z.infer<typeof TimelineStepSchema>;
