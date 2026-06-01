import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import * as z from "zod";
import { tasks } from "../../db/schema.js";

const taskIdParamsSchema = z.object({
  id: z.uuid("Invalid task ID"),
});

export const getTaskByIdSchema = z.object({
  params: taskIdParamsSchema,
});

export const createTaskSchema = z.object({
  body: createInsertSchema(tasks, {
    title: (schema) =>
      schema.min(2, "Title too short").max(100, "Title too long"),
    description: (schema) => schema.max(500, "Description too long"),
    priority: (schema) => schema.min(1).max(5),
  }).omit({ id: true, createdAt: true, updatedAt: true }),
});

export const updateTaskSchema = z.object({
  params: taskIdParamsSchema,
  body: createUpdateSchema(tasks, {
    title: (schema) => schema.min(2).max(100),
    description: (schema) => schema.max(500),
    priority: (schema) => schema.min(1).max(5),
  })
    .omit({ id: true, projectId: true, createdAt: true, updatedAt: true })
    .refine((data) => Object.values(data).some((v) => v !== undefined), {
      error: "At least one field must be provided",
    }),
});

export const deleteTaskSchema = z.object({
  params: taskIdParamsSchema,
});

export type GetTaskByIdSchema = z.infer<typeof getTaskByIdSchema>;
export type CreateTaskSchema = z.infer<typeof createTaskSchema>;
export type UpdateTaskSchema = z.infer<typeof updateTaskSchema>;
export type DeleteTaskSchema = z.infer<typeof deleteTaskSchema>;
