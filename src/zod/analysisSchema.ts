import { z } from "zod";

export const analysisSchema = z.object({
  candidateName: z.string().min(1),
  email: z.string().email(),
  score: z.number().min(0).max(100).optional(),
  goodPoints: z.array(z.string()).optional(),
  badPoints: z.array(z.string()).optional(),
  jobDescription: z.string().min(1),
  resumeText: z.string().min(1),
  jobRole: z.string().optional(), // MongoDB ObjectId as string
});

export type AnalysisType = z.infer<typeof analysisSchema>;
