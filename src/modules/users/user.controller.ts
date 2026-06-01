import bcrypt from "bcrypt";
import { count, eq, getTableColumns, sql } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import pg from "pg";
import { db } from "../../db/index.js";
import {
  projectMembers,
  projects,
  tasks,
  userProfiles,
  users,
} from "../../db/schema.js";
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

  res
    .status(200)
    .json({ message: "Users retrieved successfully", data: users });
}

async function getUserById(
  req: Request<GetUserById["params"]>,
  res: Response,
): Promise<void> {
  const userId = req.params.userId;

  const user = await db.query.users.findFirst({
    columns: { passwordHash: false },
    with: { profile: true },
    where: (users, { eq }) => eq(users.id, userId),
  });

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json({ message: "User retrieved successfully", data: user });
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

  if (!createdUser) {
    req.log.warn(
      { email: input.email },
      "Attempt to create user with existing email",
    );

    res.status(409).json({ message: "Email already exists" });
    return;
  }

  res.status(201).json({
    message: "User created successfully",
    data: createdUser,
  });
}

async function updateUser(
  req: Request<UpdateUser["params"], {}, UpdateUser["body"]>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const input = req.body;

  try {
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

    res.status(200).json({
      message: "User profile saved successfully",
      data: updatedUser,
    });
  } catch (error) {
    const cause = error instanceof Error ? error.cause : null;

    if (cause instanceof pg.DatabaseError && cause.code === "23503") {
      res.status(404).json({ message: "User not found" });
      return;
    }

    next(error);
    return;
  }
}

async function deleteUser(
  req: Request<GetUserById["params"]>,
  res: Response,
): Promise<void> {
  const userId = req.params.userId;

  const [deletedUser] = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (!deletedUser) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json({
    message: "User deleted successfully",
    data: deletedUser,
  });
}

async function getUserTasks(
  req: Request<GetUserById["params"]>,
  res: Response,
): Promise<void> {
  const userId = req.params.userId;

  const [userExists] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userExists) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const { assignedTo, ...taskColumns } = getTableColumns(tasks);

  const userTasks = await db
    .select(taskColumns)
    .from(tasks)
    .where(eq(tasks.assignedTo, userId));

  res.status(200).json({
    message: "User tasks retrieved successfully",
    data: userTasks,
  });
}

async function getUserStats(
  req: Request<GetUserById["params"]>,
  res: Response,
): Promise<void> {
  const userId = req.params.userId;

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

  if (!result) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const { userId: _, ...stats } = result;

  res.status(200).json({
    message: "User stats retrieved successfully",
    data: stats,
  });
}

async function getUserProjects(
  req: Request<GetUserProjects["params"]>,
  res: Response,
): Promise<void> {
  const userId = req.params.userId;

  const [userExists] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userExists) {
    res.status(404).json({ message: "User not found" });
    return;
  }

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

  res.status(200).json({
    message: "User projects retrieved successfully",
    data: userProjects,
  });
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

