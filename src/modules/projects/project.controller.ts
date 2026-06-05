import { and, count, desc, eq, getTableColumns } from "drizzle-orm";
import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import {
  projectMembers,
  projects,
  tasks,
  userProfiles,
  users,
} from "../../db/schema.js";
import { NotFoundError } from "../../utils/api-error.js";
import { ApiResponse } from "../../utils/api-response.js";
import { recordExists } from "../../utils/helper.js";
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

  res.status(200).json(ApiResponse.ok(rows, "Projects retrieved successfully"));
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

  if (!project) throw new NotFoundError("Project not found");

  res
    .status(200)
    .json(ApiResponse.ok(project, "Project retrieved successfully"));
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

  if (!deletedProject) throw new NotFoundError("Project not found");

  res
    .status(200)
    .json(ApiResponse.ok(deletedProject, "Project deleted successfully"));
}

async function createProject(
  req: Request<{}, {}, CreateProject["body"]>,
  res: Response,
): Promise<void> {
  const input = req.body;

  const [newProject] = await db.insert(projects).values(input).returning();

  res
    .status(201)
    .json(ApiResponse.created(newProject, "Project created successfully"));
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

  if (!updatedProject) throw new NotFoundError("Project not found");

  res
    .status(200)
    .json(ApiResponse.ok(updatedProject, "Project updated successfully"));
}

async function getProjectMembers(
  req: Request<GetProjectMembers["params"]>,
  res: Response,
): Promise<void> {
  const projectId = req.params.id;

  const projectExists = await recordExists(
    projects,
    eq(projects.id, projectId),
  );

  if (!projectExists) throw new NotFoundError("Project not found");

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

  res
    .status(200)
    .json(ApiResponse.ok(data, "Project members fetched successfully"));
}

async function addProjectMember(
  req: Request<AddProjectMember["params"], {}, AddProjectMember["body"]>,
  res: Response,
): Promise<void> {
  const projectId = req.params.id;
  const { userId, role } = req.body;

  const [newMember] = await db
    .insert(projectMembers)
    .values({ projectId, userId, role })
    .returning();

  res
    .status(201)
    .json(ApiResponse.created(newMember, "Member added successfully"));
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

  if (!updatedMember) throw new NotFoundError("Project member not found");

  res
    .status(200)
    .json(ApiResponse.ok(updatedMember, "Member role updated successfully"));
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

  if (!removedMember) throw new NotFoundError("Project member not found");

  res.status(200).json(ApiResponse.ok(null, "Member removed successfully"));
}

async function getProjectTasks(
  req: Request<GetProjectTasks["params"]>,
  res: Response,
) {
  const projectId = req.params.id;

  const projectExists = await recordExists(
    projects,
    eq(projects.id, projectId),
  );

  if (!projectExists) throw new NotFoundError("Project not found");

  const { projectId: _, ...taskColumns } = getTableColumns(tasks);

  const projectTasks = await db
    .select(taskColumns)
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  res
    .status(200)
    .json(ApiResponse.ok(projectTasks, "Project Tasks fetched successfully"));
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

