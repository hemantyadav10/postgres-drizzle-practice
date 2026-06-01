import {
  and,
  DrizzleQueryError,
  eq,
  isNotNull,
  lt,
  notInArray,
  sql,
} from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { DatabaseError } from "pg";
import { db } from "../../db/index.js";
import { projects, tasks } from "../../db/schema.js";
import type {
  CreateTaskSchema,
  DeleteTaskSchema,
  GetTaskByIdSchema,
  UpdateTaskSchema,
} from "./task.schema.js";

async function getTaskById(
  req: Request<GetTaskByIdSchema["params"]>,
  res: Response,
): Promise<void> {
  const taskId = req.params.id;

  const task = await db.query.tasks.findFirst({
    with: {
      assignee: {
        columns: { id: true, fullName: true, email: true },
      },
    },
    where: (tasks, { eq }) => eq(tasks.id, taskId),
  });

  if (!task) {
    res.status(404).json({ message: "Task not found" });
    return;
  }

  res.status(200).json({
    message: "Task fetched successfully",
    data: task,
  });
}

async function createTask(
  req: Request<{}, {}, CreateTaskSchema["body"]>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const input = req.body;

  try {
    const [projectExists] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, input.projectId))
      .limit(1);

    if (!projectExists) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    const [createdTask] = await db.insert(tasks).values(input).returning();

    res.status(201).json({
      message: "Task created successfully",
      data: createdTask,
    });
  } catch (err) {
    if (
      err instanceof DrizzleQueryError &&
      err.cause instanceof DatabaseError &&
      err.cause.code === "23503"
    ) {
      const messages: Record<string, string> = {
        tasks_project_id_projects_id_fk: "Project not found",
        tasks_assigned_to_users_id_fk: "Assigned user not found",
      };
      const constraint =
        typeof err.cause.constraint === "string"
          ? err.cause.constraint
          : undefined;
      const message = constraint
        ? (messages[constraint] ?? "Related resource not found")
        : "Related resource not found";
      res.status(404).json({ message });
      return;
    }

    next(err);
    return;
  }
}

async function updateTask(
  req: Request<UpdateTaskSchema["params"], {}, UpdateTaskSchema["body"]>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const taskId = req.params.id;
  const input = req.body;

  try {
    const [updatedTask] = await db
      .update(tasks)
      .set(input)
      .where(eq(tasks.id, taskId))
      .returning();

    if (!updatedTask) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    res.status(200).json({
      message: "Task updated successfully",
      data: updatedTask,
    });
  } catch (err) {
    if (
      err instanceof DrizzleQueryError &&
      err.cause instanceof DatabaseError &&
      err.cause.code === "23503"
    ) {
      const messages: Record<string, string> = {
        tasks_assigned_to_users_id_fk: "Assigned user not found",
      };
      const constraint =
        typeof err.cause.constraint === "string"
          ? err.cause.constraint
          : undefined;
      const message = constraint
        ? (messages[constraint] ?? "Related resource not found")
        : "Related resource not found";
      res.status(404).json({ message });
      return;
    }

    next(err);
    return;
  }
}

async function deleteTask(
  req: Request<DeleteTaskSchema["params"]>,
  res: Response,
): Promise<void> {
  const taskId = req.params.id;

  const [deletedTask] = await db
    .delete(tasks)
    .where(eq(tasks.id, taskId))
    .returning({ id: tasks.id });

  if (!deletedTask) {
    res.status(404).json({ message: "Task not found" });
    return;
  }

  res.status(200).json({
    message: "Task deleted successfully",
    data: deletedTask,
  });
}

async function getOverdueTasks(_req: Request, res: Response): Promise<void> {
  const overdueTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        isNotNull(tasks.dueDate),
        lt(tasks.dueDate, sql`CURRENT_DATE`),
        notInArray(tasks.status, ["completed", "cancelled"]),
      ),
    );

  res.status(200).json({
    message: "Overdue tasks fetched successfully",
    data: overdueTasks,
  });
}

export { createTask, deleteTask, getOverdueTasks, getTaskById, updateTask };

