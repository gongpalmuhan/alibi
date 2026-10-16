import { z } from "zod";

export const ScriptStepSchema = z.object({
  privateScript: z.string().trim().min(1),
  secret: z.string().trim().min(1),
  objectives: z.array(z.string().trim().min(1)).min(1),
});

export type ScriptStep = z.infer<typeof ScriptStepSchema>;
