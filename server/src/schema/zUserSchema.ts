import { z } from "zod";
import { AuthProvider } from "../types/userTypes";

export const registerSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal(AuthProvider.LOCAL),

    name: z.string().trim().min(2),
    email: z.string().email(),
    password: z.string().min(8),
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

