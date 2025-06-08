import { z } from "zod";
import { RoleName } from "@/db/models";
import { passwordValidation } from "./commonValidations";
export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  roleName: z.nativeEnum(RoleName).optional(),
  password: passwordValidation,
  verifyCode: z.string().optional(),
  verified: z.boolean().optional(),
});

export type UserType = z.infer<typeof userSchema>;
