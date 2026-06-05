import { ErrorCodes, type ErrorCode } from "../constants/error-codes.js";

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface ApiErrorOptions {
  statusCode?: number;
  code?: ErrorCode;
  errors?: ValidationIssue[];
}

class ApiError extends Error {
  public readonly success = false;
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly errors: ValidationIssue[] | undefined;

  constructor(
    message = "Something went wrong",
    {
      statusCode = 500,
      code = ErrorCodes.INTERNAL_SERVER_ERROR,
      errors,
    }: ApiErrorOptions = {},
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends ApiError {
  constructor(message = "Bad Request") {
    super(message, { statusCode: 400, code: ErrorCodes.BAD_REQUEST });
  }
}

class NotFoundError extends ApiError {
  constructor(message = "Not Found") {
    super(message, { statusCode: 404, code: ErrorCodes.NOT_FOUND });
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(message, { statusCode: 401, code: ErrorCodes.UNAUTHORIZED });
  }
}

class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(message, { statusCode: 403, code: ErrorCodes.FORBIDDEN });
  }
}

class ConflictError extends ApiError {
  constructor(message = "Conflict") {
    super(message, { statusCode: 409, code: ErrorCodes.CONFLICT });
  }
}

class ValidationError extends ApiError {
  constructor(errors: ValidationIssue[], message = "Validation Failed") {
    super(message, {
      statusCode: 400,
      code: ErrorCodes.VALIDATION_ERROR,
      errors,
    });
  }
}

export {
  ApiError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError
};

