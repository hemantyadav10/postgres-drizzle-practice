import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

export const validateRequest = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        requestId: req.id,
        errors: result.error.issues.map((e) => ({
          code: e.code,
          path: e.path.join("."),
          message: e.message,
        })),
      });
    }

    return next();
  };
};
