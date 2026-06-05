import bcrypt from "bcrypt";
import { count, eq, getTableColumns, sql } from "drizzle-orm";
import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import {
  projectMembers,
  projects,
  tasks,
  userProfiles,
  users,
} from "../../db/schema.js";
import { recordExists } from "../../utils/helper.js";
import {
  ApiResponse,
  ConflictError,
  NotFoundError,
} from "../../utils/index.js";
import type {
  CreateUser,
  GetUserById,
  GetUserProjects,
  UpdateUser,
} from "./user.schema.js";

async function getUsers(_req: Request, res: Response): Promise<void> {
  const users = await db.query.users.findMany({
    with: { profile: true },
    orderBy: (users, { desc }) => [desc(users.createdAt)],
  });

  res.status(200).json(ApiResponse.ok(users, "Users retrieved successfully"));
}

async function getUserById(
  req: Request<GetUserById["params"]>,
  res: Response,
): Promise<void> {
  const { userId } = req.params;

  const user = await db.query.users.findFirst({
    columns: { passwordHash: false },
    with: { profile: true },
    where: (users, { eq }) => eq(users.id, userId),
  });

  if (!user) throw new NotFoundError("User not found");

  res.status(200).json(ApiResponse.ok(user, "User retrieved successfully"));
}

async function createUser(
  req: Request<{}, {}, CreateUser["body"]>,
  res: Response,
): Promise<void> {
  const input = req.body;

  const hashedPassword = await bcrypt.hash(input.password, 10);

  const [createdUser] = await db
    .insert(users)
    .values({
      email: input.email,
      fullName: input.fullName,
      passwordHash: hashedPassword,
    })
    .returning({ id: users.id })
    .onConflictDoNothing({ target: users.email });

  if (!createdUser) throw new ConflictError("Email already exists");

  res
    .status(201)
    .json(ApiResponse.created(createdUser, "User created successfully"));
}

async function updateUser(
  req: Request<UpdateUser["params"], {}, UpdateUser["body"]>,
  res: Response,
): Promise<void> {
  const input = req.body;

  const [updatedUser] = await db
    .insert(userProfiles)
    .values({
      userId: req.params.userId,
      bio: input.bio,
      phone: input.phone,
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { bio: input.bio, phone: input.phone },
    })
    .returning();

  res
    .status(200)
    .json(ApiResponse.ok(updatedUser, "User profile saved successfully"));
}

async function deleteUser(
  req: Request<GetUserById["params"]>,
  res: Response,
): Promise<void> {
  const { userId } = req.params;

  const [deletedUser] = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (!deletedUser) throw new NotFoundError("User not found");

  res
    .status(200)
    .json(ApiResponse.ok(deletedUser, "User deleted successfully"));
}

async function getUserTasks(
  req: Request<GetUserById["params"]>,
  res: Response,
): Promise<void> {
  const { userId } = req.params;

  const userExists = await recordExists(users, eq(users.id, userId));

  if (!userExists) throw new NotFoundError("User not found");

  const { assignedTo, ...taskColumns } = getTableColumns(tasks);

  const userTasks = await db
    .select(taskColumns)
    .from(tasks)
    .where(eq(tasks.assignedTo, userId));

  res
    .status(200)
    .json(ApiResponse.ok(userTasks, "User tasks retrieved successfully"));
}

async function getUserStats(
  req: Request<GetUserById["params"]>,
  res: Response,
): Promise<void> {
  const { userId } = req.params;

  const [result] = await db
    .select({
      userId: users.id,
      totalTasks: count(tasks.id),
      pendingTasks:
        sql<number>`count(${tasks.id}) filter (where ${tasks.status} = 'pending')`.mapWith(
          Number,
        ),
      inProgressTasks:
        sql<number>`count(${tasks.id}) filter (where ${tasks.status} = 'in_progress')`.mapWith(
          Number,
        ),
      completedTasks:
        sql<number>`count(${tasks.id}) filter (where ${tasks.status} = 'completed')`.mapWith(
          Number,
        ),
      cancelledTasks:
        sql<number>`count(${tasks.id}) filter (where ${tasks.status} = 'cancelled')`.mapWith(
          Number,
        ),
      overdueTasks: sql<number>`
        count(${tasks.id}) filter (
          where ${tasks.dueDate} is not null
            and ${tasks.dueDate} < CURRENT_DATE
            and ${tasks.status} = 'pending'
        )
      `.mapWith(Number),
    })
    .from(users)
    .leftJoin(tasks, eq(tasks.assignedTo, users.id))
    .where(eq(users.id, userId))
    .groupBy(users.id);

  if (!result) throw new NotFoundError("User not found");

  const { userId: _, ...stats } = result;

  res
    .status(200)
    .json(ApiResponse.ok(stats, "User stats retrieved successfully"));
}

async function getUserProjects(
  req: Request<GetUserProjects["params"]>,
  res: Response,
): Promise<void> {
  const { userId } = req.params;

  const userExists = await recordExists(users, eq(users.id, userId));

  if (!userExists) throw new NotFoundError("User not found");

  const userProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      role: projectMembers.role,
      joinedAt: projectMembers.createdAt,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(eq(projectMembers.userId, userId));

  res
    .status(200)
    .json(ApiResponse.ok(userProjects, "User projects retrieved successfully"));
}

export {
  createUser,
  deleteUser,
  getUserById,
  getUserProjects,
  getUsers,
  getUserStats,
  getUserTasks,
  updateUser
};

