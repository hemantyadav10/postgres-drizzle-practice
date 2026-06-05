import { and, eq, isNotNull, lt, notInArray, sql } from "drizzle-orm";
import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { projects, tasks } from "../../db/schema.js";
import { NotFoundError } from "../../utils/api-error.js";
import { ApiResponse } from "../../utils/api-response.js";
import { recordExists } from "../../utils/helper.js";
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

  if (!task) throw new NotFoundError("Task not found");

  res.status(200).json(ApiResponse.ok(task, "Task fetched successfully"));
}

async function createTask(
  req: Request<{}, {}, CreateTaskSchema["body"]>,
  res: Response,
): Promise<void> {
  const input = req.body;

  const projectExists = await recordExists(
    projects,
    eq(projects.id, input.projectId),
  );

  if (!projectExists) throw new NotFoundError("Project not found");

  const [createdTask] = await db.insert(tasks).values(input).returning();

  res
    .status(201)
    .json(ApiResponse.created(createdTask, "Task created successfully"));
}

async function updateTask(
  req: Request<UpdateTaskSchema["params"], {}, UpdateTaskSchema["body"]>,
  res: Response,
): Promise<void> {
  const taskId = req.params.id;
  const input = req.body;

  const [updatedTask] = await db
    .update(tasks)
    .set(input)
    .where(eq(tasks.id, taskId))
    .returning();

  if (!updatedTask) throw new NotFoundError("Task not found");

  res
    .status(200)
    .json(ApiResponse.ok(updatedTask, "Task updated successfully"));
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

  if (!deletedTask) throw new NotFoundError("Task not found");

  res
    .status(200)
    .json(ApiResponse.ok(deletedTask, "Task deleted successfully"));
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

  res
    .status(200)
    .json(ApiResponse.ok(overdueTasks, "Overdue tasks fetched successfully"));
}

export { createTask, deleteTask, getOverdueTasks, getTaskById, updateTask };

