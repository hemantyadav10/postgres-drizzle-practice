import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest.middleware.js";
import {
  addProjectMember,
  createProject,
  deleteProject,
  getAllProjects,
  getProjectById,
  getProjectMembers,
  getProjectTasks,
  removeProjectMember,
  updateProject,
  updateProjectMemberRole,
} from "./project.controller.js";
import {
  addProjectMemberSchema,
  createProjectSchema,
  getProjectByIdSchema,
  getProjectMembersSchema,
  getProjectTasksSchema,
  removeProjectMemberSchema,
  updateProjectMemberRoleSchema,
  updateProjectSchema,
} from "./project.schema.js";

const router = Router();

router
  .route("/")
  .get(getAllProjects)
  .post(validateRequest(createProjectSchema), createProject);
router
  .route("/:id")
  .get(validateRequest(getProjectByIdSchema), getProjectById)
  .delete(validateRequest(getProjectByIdSchema), deleteProject)
  .patch(validateRequest(updateProjectSchema), updateProject);
router
  .route("/:id/members")
  .get(validateRequest(getProjectMembersSchema), getProjectMembers)
  .post(validateRequest(addProjectMemberSchema), addProjectMember);
router
  .route("/:id/members/:userId")
  .patch(
    validateRequest(updateProjectMemberRoleSchema),
    updateProjectMemberRole,
  )
  .delete(validateRequest(removeProjectMemberSchema), removeProjectMember);
router
  .route("/:id/tasks")
  .get(validateRequest(getProjectTasksSchema), getProjectTasks);

export default router;
