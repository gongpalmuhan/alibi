import { z } from "zod";

export const VerificationStepSchema = z.object({
  culpritId: z.string().trim().min(1),
});

export type VerificationStep = z.infer<typeof VerificationStepSchema>;
