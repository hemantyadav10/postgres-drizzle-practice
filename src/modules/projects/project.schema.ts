import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import * as z from "zod";
import { projectMembers, projects } from "../../db/schema.js";

const projectIdParamsSchema = z.object({
  id: z.uuid("Invalid task ID"),
});

export const getProjectByIdSchema = z.object({
  params: projectIdParamsSchema,
});

export const createProjectSchema = z.object({
  body: createInsertSchema(projects, {
    name: (schema) =>
      schema
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must be at most 100 characters"),
    description: (schema) =>
      schema.max(500, "Description must be at most 500 characters"),
  }).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  }),
});

export const updateProjectSchema = z.object({
  params: projectIdParamsSchema,
  body: createUpdateSchema(projects, {
    name: (schema) =>
      schema
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must be at most 100 characters"),
    description: (schema) =>
      schema.max(500, "Description must be at most 500 characters"),
  })
    .omit({
      id: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
    })
    .refine((data) => Object.values(data).some((v) => v !== undefined), {
      error: "At least one field must be provided",
    }),
});

export const getProjectMembersSchema = z.object({
  params: projectIdParamsSchema,
});

export const addProjectMemberSchema = z.object({
  params: projectIdParamsSchema,
  body: createInsertSchema(projectMembers).pick({
    role: true,
    userId: true,
  }),
});

export const updateProjectMemberRoleSchema = z.object({
  params: projectIdParamsSchema.extend({
    userId: z.uuid("Invalid user ID"),
  }),
  body: createUpdateSchema(projectMembers)
    .pick({ role: true })
    .required({ role: true }),
});

export const removeProjectMemberSchema = updateProjectMemberRoleSchema.pick({
  params: true,
});

export const getProjectTasksSchema = z.object({
  params: projectIdParamsSchema,
});

export type GetProjectById = z.infer<typeof getProjectByIdSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type GetProjectMembers = z.infer<typeof getProjectMembersSchema>;
export type AddProjectMember = z.infer<typeof addProjectMemberSchema>;
export type UpdateProjectMemberRole = z.infer<
  typeof updateProjectMemberRoleSchema
>;
export type RemoveProjectMember = z.infer<typeof removeProjectMemberSchema>;
export type GetProjectTasks = z.infer<typeof getProjectTasksSchema>;
