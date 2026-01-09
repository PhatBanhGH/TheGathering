import { Request, Response, NextFunction } from "express";
import { Error as MongooseError } from "mongoose";

interface CustomError extends Error {
  statusCode?: number;
  code?: number;
  keyPattern?: Record<string, unknown>;
  errors?: Record<string, { message: string }>;
}

/**
 * Global Error Handler Middleware
 * Handles all errors in a consistent way
 */
export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error("Error:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const validationError = err as MongooseError.ValidationError;
    const errors = Object.values(validationError.errors).map((e) => e.message);
    res.status(400).json({
      success: false,
      message: "Validation Error",
      errors,
    });
    return;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : "field";
    res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
    return;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
    return;
  }

  if (err.name === "TokenExpiredError") {
    res.status(401).json({
      success: false,
      message: "Token expired",
    });
    return;
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

