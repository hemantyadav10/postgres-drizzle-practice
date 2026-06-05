import { Router } from "express";
import { validateRequest } from "../../middlewares/validate-request.middleware.js";
import {
  createUser,
  deleteUser,
  getUserById,
  getUserProjects,
  getUsers,
  getUserStats,
  getUserTasks,
  updateUser,
} from "./user.controller.js";
import {
  createUserSchema,
  getUserByIdSchema,
  getUserProjectsSchema,
  updateUserSchema,
} from "./user.schema.js";

const router = Router();

router
  .route("/")
  .get(getUsers)
  .post(validateRequest(createUserSchema), createUser);
router
  .route("/:userId")
  .get(validateRequest(getUserByIdSchema), getUserById)
  .delete(validateRequest(getUserByIdSchema), deleteUser)
  .patch(validateRequest(updateUserSchema), updateUser);
router.get("/:userId/tasks", validateRequest(getUserByIdSchema), getUserTasks);
router.get("/:userId/stats", validateRequest(getUserByIdSchema), getUserStats);
router.get(
  "/:userId/projects",
  validateRequest(getUserProjectsSchema),
  getUserProjects,
);

export default router;
