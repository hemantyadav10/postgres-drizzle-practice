import {
  and,
  count,
  desc,
  DrizzleQueryError,
  eq,
  getTableColumns,
} from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { DatabaseError } from "pg";
import { db } from "../../db/index.js";
import {
  projectMembers,
  projects,
  tasks,
  userProfiles,
  users,
} from "../../db/schema.js";
import type {
  AddProjectMember,
  CreateProject,
  GetProjectById,
  GetProjectMembers,
  GetProjectTasks,
  RemoveProjectMember,
  UpdateProject,
  UpdateProjectMemberRole,
} from "./project.schema.js";

async function getAllProjects(_req: Request, res: Response): Promise<void> {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      memberCount: count(projectMembers.userId),
      owner: {
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: userProfiles.avatarUrl,
      },
    })
    .from(projects)
    .leftJoin(users, eq(projects.ownerId, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .leftJoin(projectMembers, eq(projects.id, projectMembers.projectId))
    .groupBy(projects.id, users.id, userProfiles.userId)
    .orderBy(desc(projects.createdAt));

  res.status(200).json({
    message: "Projects retrieved successfully",
    data: rows,
  });
}

async function getProjectById(
  req: Request<GetProjectById["params"]>,
  res: Response,
): Promise<void> {
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      memberCount: count(projectMembers.userId),
      owner: {
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: userProfiles.avatarUrl,
        bio: userProfiles.bio,
        phone: userProfiles.phone,
      },
    })
    .from(projects)
    .leftJoin(users, eq(projects.ownerId, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .leftJoin(projectMembers, eq(projects.id, projectMembers.projectId))
    .where(eq(projects.id, req.params.id))
    .groupBy(projects.id, users.id, userProfiles.userId);

  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }

  res.status(200).json({
    message: "Project retrieved successfully",
    data: project,
  });
}

async function deleteProject(
  req: Request<GetProjectById["params"]>,
  res: Response,
): Promise<void> {
  const projectId = req.params.id;

  const [deletedProject] = await db
    .delete(projects)
    .where(eq(projects.id, projectId))
    .returning({ id: projects.id });

  if (!deletedProject) {
    res.status(404).json({ message: "Project not found" });
    return;
  }

  res.status(200).json({
    message: "Project deleted successfully",
    data: deletedProject,
  });
}

async function createProject(
  req: Request<{}, {}, CreateProject["body"]>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const input = req.body;

  try {
    const [newProject] = await db.insert(projects).values(input).returning();

    res.status(201).json({
      message: "Project created successfully",
      data: newProject,
    });
  } catch (err) {
    if (
      err instanceof DrizzleQueryError &&
      err.cause instanceof DatabaseError &&
      err.cause.code === "23503"
    ) {
      res.status(404).json({ message: "Owner not found" });
      return;
    }

    next(err);
    return;
  }
}

async function updateProject(
  req: Request<UpdateProject["params"], {}, UpdateProject["body"]>,
  res: Response,
): Promise<void> {
  const input = req.body;
  const projectId = req.params.id;

  const [updatedProject] = await db
    .update(projects)
    .set(input)
    .where(eq(projects.id, projectId))
    .returning();

  if (!updatedProject) {
    res.status(404).json({ message: "Project not found" });
    return;
  }

  res.status(200).json({
    message: "Project updated successfully",
    data: updatedProject,
  });
}

async function getProjectMembers(
  req: Request<GetProjectMembers["params"]>,
  res: Response,
): Promise<void> {
  const projectId = req.params.id;

  const [projectExists] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!projectExists) {
    res.status(404).json({ message: "Project not found" });
    return;
  }

  const data = await db
    .select({
      role: projectMembers.role,
      joinedAt: projectMembers.createdAt,
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
      avatarUrl: userProfiles.avatarUrl,
      bio: userProfiles.bio,
      phone: userProfiles.phone,
    })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(projectMembers.projectId, projectId));

  res.status(200).json({
    message: "Project members fetched successfully",
    data,
  });
}

async function addProjectMember(
  req: Request<AddProjectMember["params"], {}, AddProjectMember["body"]>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const projectId = req.params.id;
  const { userId, role } = req.body;

  try {
    const [newMember] = await db
      .insert(projectMembers)
      .values({ projectId, userId, role })
      .returning();

    res
      .status(201)
      .json({ message: "Member added successfully", data: newMember });
  } catch (err) {
    if (
      err instanceof DrizzleQueryError &&
      err.cause instanceof DatabaseError
    ) {
      const constraint =
        typeof err.cause.constraint === "string"
          ? err.cause.constraint
          : undefined;

      // Foreign key violation
      if (err.cause.code === "23503") {
        const messages: Record<string, string> = {
          project_members_project_id_projects_id_fk: "Project not found",
          project_members_user_id_users_id_fk: "User not found",
        };
        const message = constraint
          ? (messages[constraint] ?? "Related resource not found")
          : "Related resource not found";
        res.status(404).json({ message });
        return;
      }

      // Primary key violation — already a member
      if (err.cause.code === "23505") {
        res
          .status(409)
          .json({ message: "User is already a member of this project" });
        return;
      }
    }

    next(err);
    return;
  }
}

async function updateProjectMemberRole(
  req: Request<
    UpdateProjectMemberRole["params"],
    {},
    UpdateProjectMemberRole["body"]
  >,
  res: Response,
): Promise<void> {
  const { id: projectId, userId } = req.params;
  const { role } = req.body;

  const [updatedMember] = await db
    .update(projectMembers)
    .set({ role })
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .returning();

  if (!updatedMember) {
    res.status(404).json({ message: "Project member not found" });
    return;
  }

  res.status(200).json({
    message: "Member role updated successfully",
    data: updatedMember,
  });
}

async function removeProjectMember(
  req: Request<RemoveProjectMember["params"]>,
  res: Response,
): Promise<void> {
  const { id: projectId, userId } = req.params;

  const [removedMember] = await db
    .delete(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .returning();

  if (!removedMember) {
    res.status(404).json({ message: "Project member not found" });
    return;
  }

  res.status(200).json({ message: "Member removed successfully" });
}

async function getProjectTasks(
  req: Request<GetProjectTasks["params"]>,
  res: Response,
) {
  const projectId = req.params.id;

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }

  const { projectId: _, ...taskColumns } = getTableColumns(tasks);

  const projectTasks = await db
    .select(taskColumns)
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  res.status(200).json({
    message: "Project Tasks fetched successfully",
    data: projectTasks,
  });
}

export {
  addProjectMember,
  createProject,
  deleteProject,
  getAllProjects,
  getProjectById,
  getProjectMembers,
  getProjectTasks,
  removeProjectMember,
  updateProject,
  updateProjectMemberRole
};

