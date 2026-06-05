import express from "express";
import errorHandler from "./middlewares/error-handler.middleware.js";
import projectRouter from "./modules/projects/project.routes.js";
import taskRouter from "./modules/tasks/task.routes.js";
import userRouter from "./modules/users/user.routes.js";
import { httpLogger } from "./utils/logger.js";

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger);

// Health Check
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/tasks", taskRouter);
app.use("/api/v1/projects", projectRouter);

// Error handling middleware
app.use(errorHandler);

export default app;
