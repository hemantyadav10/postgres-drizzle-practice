import { DrizzleQueryError } from "drizzle-orm";
import type { ErrorRequestHandler } from "express";
import { DatabaseError } from "pg";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { ErrorCodes } from "../constants/error-codes.js";
import {
  ApiError,
  ConflictError,
  NotFoundError,
  ValidationError,
  type ValidationIssue,
} from "../utils/api-error.js";

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let error = err;

  // Normalize ZodError into ApiError for uniform error handling
  if (error instanceof ZodError) {
    const errors: ValidationIssue[] = error.issues.map((e) => ({
      code: e.code,
      path: e.path.join("."),
      message: e.message,
    }));
    error = new ValidationError(errors);
  }

  // Translate known database errors into application errors
  if (
    error instanceof DrizzleQueryError &&
    error.cause instanceof DatabaseError
  ) {
    const mapped = mapDatabaseError(error.cause);
    if (mapped) {
      mapped.statusCode >= 500
        ? req.log.error({ err: error }, "Database error")
        : req.log.warn({ err: error }, "Database constraint violation");
      error = mapped;
    }
  }

  if (error instanceof ApiError) {
    // Only log 5xx — 4xx are expected client errors
    if (error.statusCode >= 500) {
      req.log.error({ err: error }, "Internal server error");
    }

    const { code, statusCode, success, message, errors } = error;

    res.status(statusCode).json({
      success,
      message,
      code,
      ...(errors && errors.length > 0 && { errors }),
    });

    return;
  }

  // Unexpected error — not thrown intentionally
  req.log.error({ err: error }, "An unexpected error occurred");

  const message =
    env.NODE_ENV === "production"
      ? "An unexpected error occurred"
      : error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Unknown error";

  res.status(500).json({
    success: false,
    message,
    code: ErrorCodes.INTERNAL_SERVER_ERROR,
    ...(env.NODE_ENV !== "production" &&
      error instanceof Error && {
        stack: error.stack,
      }),
  });
};

/**
 * Maps PostgreSQL error codes to ApiErrors for errors that only manifest at
 * query time — FK violations, unique conflicts, deadlocks, and infrastructure failures.
 */
function mapDatabaseError(error: DatabaseError): ApiError | undefined {
  const { code, detail, message } = error;

  const isProd = env.NODE_ENV === "production";
  const devMessage = detail ?? message;

  switch (code) {
    // FK violation
    case "23503":
      return new NotFoundError(
        isProd ? "The referenced resource could not be found." : devMessage,
      );

    // Unique constraint
    case "23505":
      return new ConflictError(
        isProd
          ? "A resource with the provided details already exists."
          : devMessage,
      );

    case "40P01": // Deadlock
    case "40001": // Serialization failure
      return new ApiError(
        isProd
          ? "A concurrency conflict occurred. Please retry your request."
          : devMessage,
        {
          statusCode: 409,
          code: ErrorCodes.CONFLICT,
        },
      );

    // Database unavailable
    case "08000":
    case "08003":
    case "08006":
    case "57P01":
    case "53300":
      return new ApiError(
        isProd
          ? "Service temporarily unavailable. Please try again shortly."
          : devMessage,
        {
          statusCode: 503,
          code: ErrorCodes.SERVICE_UNAVAILABLE,
        },
      );

    default:
      return undefined;
  }
}

export default errorHandler;
