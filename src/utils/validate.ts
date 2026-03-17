import { z } from "zod";

export const submitEvalSchema = z.object({
  jobId: z.string().min(1),
  taskSpec: z.string().min(1),
  submission: z.string().min(1),
  rubric: z.string().min(1),
  metadata: z
    .object({
      rubric_version: z.string().optional(),
      score_tolerance: z.number().int().min(0).max(100).optional(),
      confidence_tolerance: z.number().int().min(0).max(100).optional()
    })
    .passthrough()
    .optional()
});

export type SubmitEvalSchema = z.infer<typeof submitEvalSchema>;
