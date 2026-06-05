import { Router } from "express";
import { validateRequest } from "../../middlewares/validate-request.middleware.js";
import {
  createTask,
  deleteTask,
  getOverdueTasks,
  getTaskById,
  updateTask,
} from "./task.controller.js";
import {
  createTaskSchema,
  deleteTaskSchema,
  getTaskByIdSchema,
  updateTaskSchema,
} from "./task.schema.js";

const router = Router();

router.post("/", validateRequest(createTaskSchema), createTask);
router.get("/overdue", getOverdueTasks);
router
  .route("/:id")
  .get(validateRequest(getTaskByIdSchema), getTaskById)
  .patch(validateRequest(updateTaskSchema), updateTask)
  .delete(validateRequest(deleteTaskSchema), deleteTask);

export default router;
