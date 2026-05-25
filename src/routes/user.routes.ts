import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from "../controllers/user.controller.js";
import { validateRequest } from "../middlewares/validateRequest.middleware.js";
import {
  createUserSchema,
  getUserByIdSchema,
  updateUserSchema,
} from "../schemas/user.schema.js";

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

export default router;
