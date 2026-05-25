import type { NextFunction, Request, Response } from "express";
import express from "express";
import { env } from "./config/env.js";
import userRouter from "./routes/user.routes.js";
import { httpLogger } from "./utils/logger.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger);

app.use("/api/v1/users", userRouter);

app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  req.log.error({ err: error }, "An unexpected error occurred");
  return res.status(500).json({
    success: false,
    statusCode: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal Server Error",
    requestId: req.id,
  });
});

export const port = env.PORT ?? 8080;
export default app;
