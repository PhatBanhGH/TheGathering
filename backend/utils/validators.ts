/**
 * Validation and sanitization utilities
 * Combines password and input validation
 */

// ============================================
// Password Validation
// ============================================

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: "weak" | "medium" | "strong";
}

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let strength: "weak" | "medium" | "strong" = "weak";

  if (!password) {
    return {
      isValid: false,
      errors: ["Password is required"],
      strength: "weak",
    };
  }

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  // Determine strength
  if (errors.length === 0) {
    if (password.length >= 12 && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      strength = "strong";
    } else if (password.length >= 10) {
      strength = "medium";
    } else {
      strength = "medium";
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Check if password is in common passwords list
 */
export function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    "password",
    "12345678",
    "password123",
    "admin123",
    "qwerty123",
    "letmein",
    "welcome123",
    "monkey123",
    "1234567890",
    "password1",
  ];

  return commonPasswords.includes(password.toLowerCase());
}

// ============================================
// Input Validation & Sanitization
// ============================================

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove < and >
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, ""); // Remove event handlers like onclick=
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.toLowerCase());
}

/**
 * Validate username format
 * Requirements:
 * - 3-20 characters
 * - Alphanumeric and underscores only
 * - Cannot start or end with underscore
 */
export function isValidUsername(username: string): boolean {
  if (!username || typeof username !== "string") {
    return false;
  }

  const usernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9_]{1,18}[a-zA-Z0-9])?$/;
  return usernameRegex.test(username) && username.length >= 3 && username.length <= 20;
}

/**
 * Validate room ID format
 */
export function isValidRoomId(roomId: string): boolean {
  if (!roomId || typeof roomId !== "string") {
    return false;
  }

  // Room ID should be alphanumeric with hyphens, 3-50 characters
  const roomIdRegex = /^[a-zA-Z0-9-]{3,50}$/;
  return roomIdRegex.test(roomId);
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitizeString(sanitized[key]);
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }

  return sanitized;
}
