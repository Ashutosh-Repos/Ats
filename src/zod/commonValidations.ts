import { z } from "zod";
export const nameValidation = z
  .string({ required_error: "name is required" })
  .min(2, { message: "must be atleast of 2 charaters" })
  .regex(/^[A-Z]/, {
    message: "first letter must be uppercase",
  })
  .regex(/^[^0-9]*$/, { message: "does not contain Numbers-(0-9)" })
  .regex(/^[A-Za-z ]*$/, {
    message: "does not special charaters-($@.*!+-/&#~`'?.etc)",
  });

export const passwordValidation = z
  .string({ required_error: "password is required" })
  .min(8, { message: "must be at least of 8 charaters" })
  .max(13, { message: "must be less than of 14 characters" })
  .regex(/(?=.*[a-z])/, {
    message: "contains atleast one lowercase letter",
  })
  .regex(/(?=.*[A-Z])/, {
    message: "contains atleast one uppercase letter",
  })
  .regex(/^(?=.*\d)/, { message: "contains at least one digit" })
  .regex(/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])/, {
    message: "contains atleast one special character",
  });

export const emailValidation = z
  .string({ required_error: "email is required" })
  .email({ message: "must be valid email" });
export const ageValidation = z.coerce
  .number({
    required_error: "Age is required",
    invalid_type_error: "Age must be a number",
  })
  .gte(16, { message: "< 16 years not allowed" })
  .positive({ message: "age can't be negative!" })
  .int({ message: "only integer" })
  .lte(200, { message: "age >= 200 can't possible, " });

export const genderValidation = z.enum(["M", "F", "O"]);
// for future when adding functionality of phone and otp
export const phoneNumberValidation = z
  .string({ required_error: "phone number is required" })
  .regex(/^\+?(\d{1,3})?[-.\s]?(\(?\d{3}\)?)[-.\s]?(\d{3})[-.\s]?(\d{4})$/, {
    message: "invalid phone number, must be of 10 digits",
  });

export const userValidation = z
  .string()
  .min(4, { message: "must be at least of 4 charaters" })
  .max(10, { message: "must be less than of 11 charaters" })
  .regex(/^[a-zA-Z0-9_]+$/, {
    message: "must not contain any special charater",
  });

export const titleValidation = z
  .string()
  .min(5, { message: "title must be atleast 4 characters long" })
  .max(20, { message: "must be smaller than 20 charaters" })
  .regex(/(?=.*[a-zA-Z])/, { message: "must contain atleast one alphabet" });
export const descriptionValidation = z
  .string()
  .min(10, { message: "title must be atleast 4 characters long" })
  .max(200, { message: "must be smaller than 20 charaters" })
  .regex(/(?=.*[a-zA-Z])/, { message: "must contain atleast one alphabet" });
