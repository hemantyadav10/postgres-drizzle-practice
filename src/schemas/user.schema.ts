import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import * as z from "zod";
import { userProfiles, users } from "../db/schema.js";

const userIdParamsSchema = z.object({
  userId: z.uuid("Invalid user ID"),
});

export const getUserByIdSchema = z.object({
  params: userIdParamsSchema,
});

export const createUserSchema = z.object({
  body: createInsertSchema(users, {
    fullName: (schema) =>
      schema.min(2, "Name too short").max(100, "Name too long"),
    email: () => z.email().transform((v) => v.toLowerCase().trim()),
  })
    .omit({ passwordHash: true, id: true, createdAt: true, updatedAt: true })
    .extend({
      password: z.string().min(8, "Password must be at least 8 characters"),
    }),
});

export const updateUserSchema = z.object({
  params: userIdParamsSchema,
  body: createUpdateSchema(userProfiles, {
    bio: (schema) =>
      schema.trim().max(160, "Bio must be at most 160 characters"),
    phone: () =>
      z.e164(
        "Must be a valid phone number in international format e.g. +919876543210",
      ),
  })
    .omit({ userId: true, createdAt: true, updatedAt: true, avatarUrl: true })
    .refine((data) => Object.values(data).some((v) => v !== undefined), {
      error: "At least one field must be provided",
    }),
});

export type CreateUserSchema = z.infer<typeof createUserSchema>;
export type GetUserByIdSchema = z.infer<typeof getUserByIdSchema>;
export type UpdateUserSchema = z.infer<typeof updateUserSchema>;
