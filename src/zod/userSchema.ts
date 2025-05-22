import { z } from "zod";

export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["hr", "admin"]).optional(),
  password: z.string().optional(),
  age: z.string().optional(),
  verifyCode: z.string().optional(),
  verified: z.boolean().optional(),
});

export type UserType = z.infer<typeof userSchema>;
