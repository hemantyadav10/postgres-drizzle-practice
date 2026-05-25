import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import pg from "pg";
import { db } from "../db/index.js";
import { userProfiles, users } from "../db/schema.js";
import type {
  CreateUserSchema,
  GetUserByIdSchema,
  UpdateUserSchema,
} from "../schemas/user.schema.js";

/** Retrieve all users with their profiles */
async function getUsers(_req: Request, res: Response) {
  const users = await db.query.users.findMany({
    with: { profile: true },
    orderBy: (users, { desc }) => [desc(users.createdAt)],
  });

  return res.json({ message: "Users retrieved successfully", data: users });
}

/** Retrieve a single user by ID */
async function getUserById(
  req: Request<GetUserByIdSchema["params"]>,
  res: Response,
) {
  const userId = req.params.userId;

  const user = await db.query.users.findFirst({
    columns: { passwordHash: false },
    with: { profile: true },
    where: (users, { eq }) => eq(users.id, userId),
  });

  if (!user) return res.status(404).json({ message: "User not found" });

  return res.json({ message: "User retrieved successfully", data: user });
}

/** Create a new user */
async function createUser(
  req: Request<{}, {}, CreateUserSchema["body"]>,
  res: Response,
) {
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

    return res.status(409).json({ message: "Email already exists" });
  }

  return res
    .status(201)
    .json({ message: "User created successfully", data: createdUser });
}

/** Create or update a user's profile */
async function updateUser(
  req: Request<UpdateUserSchema["params"], {}, UpdateUserSchema["body"]>,
  res: Response,
  next: NextFunction,
) {
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

    return res.json({
      message: "User profile saved successfully",
      data: updatedUser,
    });
  } catch (error) {
    const cause = error instanceof Error ? error.cause : null;

    if (cause instanceof pg.DatabaseError && cause.code === "23503")
      return res.status(404).json({ message: "User not found" });

    return next(error);
  }
}

/** Permanently delete a user and their data */
async function deleteUser(
  req: Request<GetUserByIdSchema["params"]>,
  res: Response,
) {
  const userId = req.params.userId;

  const [deletedUser] = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (!deletedUser) return res.status(404).json({ message: "User not found" });

  return res.json({ message: "User deleted successfully", data: deletedUser });
}

export { createUser, deleteUser, getUserById, getUsers, updateUser };

