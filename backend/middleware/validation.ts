import { Request, Response, NextFunction } from "express";

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export const validateRequired = (
  fields: string[],
  data: Record<string, unknown>
): ValidationResult => {
  const missing = fields.filter((field) => !data[field]);
  if (missing.length > 0) {
    return {
      isValid: false,
      message: `Missing required fields: ${missing.join(", ")}`,
    };
  }
  return { isValid: true };
};

export const validateLength = (
  value: string,
  min: number,
  max: number | null,
  fieldName: string
): ValidationResult => {
  if (value.length < min) {
    return {
      isValid: false,
      message: `${fieldName} must be at least ${min} characters`,
    };
  }
  if (max && value.length > max) {
    return {
      isValid: false,
      message: `${fieldName} must be at most ${max} characters`,
    };
  }
  return { isValid: true };
};

export const validateMessage = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { message, type } = req.body;
  
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: "Message content is required",
    });
    return;
  }

  if (message.length > 2000) {
    res.status(400).json({
      success: false,
      message: "Message is too long (max 2000 characters)",
    });
    return;
  }

  const validTypes = ["global", "dm", "nearby", "group"];
  if (type && !validTypes.includes(type)) {
    res.status(400).json({
      success: false,
      message: `Invalid message type. Must be one of: ${validTypes.join(", ")}`,
    });
    return;
  }

  next();
};

export const validateChannel = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { name, type } = req.body;
  
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: "Channel name is required",
    });
    return;
  }

  if (name.length > 100) {
    res.status(400).json({
      success: false,
      message: "Channel name is too long (max 100 characters)",
    });
    return;
  }

  const validTypes = ["text", "voice"];
  if (type && !validTypes.includes(type)) {
    res.status(400).json({
      success: false,
      message: `Invalid channel type. Must be one of: ${validTypes.join(", ")}`,
    });
    return;
  }

  next();
};

