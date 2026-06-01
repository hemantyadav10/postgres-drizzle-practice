import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

async function globalErrorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      requestId: req.id,
      errors: error.issues.map((e) => ({
        code: e.code,
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  req.log.error({ err: error }, "An unexpected error occurred");
  return res.status(500).json({
    success: false,
    statusCode: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal Server Error",
    requestId: req.id,
  });
}

export default globalErrorHandler;
