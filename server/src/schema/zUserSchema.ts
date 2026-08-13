import { z } from "zod";
import { AuthProvider } from "../types/userTypes";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal(AuthProvider.LOCAL),
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().trim().email("Enter a valid email").toLowerCase(),
    password: passwordSchema,
  }),

  z.object({
    provider: z.literal(AuthProvider.GOOGLE),
    providerId: z.string().min(1),
    name: z.string().trim().min(2),
    email: z.string().email(),
    avatar: z.string().nullable().optional(),
    givenName: z.string().nullable().optional(),
    familyName: z.string().nullable().optional(),
    locale: z.string().nullable().optional(),
    emailVerified: z.boolean().optional(),
  }),
]);
