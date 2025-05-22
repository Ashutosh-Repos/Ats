import { z } from "zod";

export const jobRoleSchema = z.object({
  hiringManager: z.string().optional(), // MongoDB ObjectId as string
  hiringYear: z.number().min(2000),
  jobRole: z.string(),
  postingDate: z.union([
    z.string().transform((val) => new Date(val)),
    z.date(),
  ]),
  requiredSkills: z.array(z.string()).optional(),
  academicQualifications: z.object({
    minQualification: z.string(),
    addedQualifications: z.string().optional(),
    description: z.string().optional(),
  }),
});

export type JobRoleType = z.infer<typeof jobRoleSchema>;
