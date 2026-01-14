import { Request, Response, NextFunction } from "express";

/**
 * Simple in-memory rate limiter
 * For production, use Redis-based rate limiter
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Rate limiter middleware
 * @param windowMs - Time window in milliseconds
 * @param maxRequests - Maximum requests per window
 */
export function rateLimiter(windowMs: number = 60000, maxRequests: number = 100) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip rate limiting for health check endpoint
    if (req.path === "/api/health" || req.path === "/health") {
      next();
      return;
    }

    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    // Clean up expired entries
    Object.keys(store).forEach((k) => {
      if (store[k].resetTime < now) {
        delete store[k];
      }
    });

    // Check if key exists and is within limit
    if (store[key]) {
      if (store[key].resetTime > now) {
        if (store[key].count >= maxRequests) {
          res.status(429).json({
            success: false,
            message: "Too many requests, please try again later",
            retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
          });
          return;
        }
        store[key].count++;
      } else {
        // Reset window
        store[key] = {
          count: 1,
          resetTime: now + windowMs,
        };
      }
    } else {
      // Create new entry
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
    }

    // Add rate limit headers
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - store[key].count));
    res.setHeader("X-RateLimit-Reset", new Date(store[key].resetTime).toISOString());

    next();
  };
}

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimiter(900000, 5); // 5 requests per 15 minutes

/**
 * General API rate limiter
 * Increased to 300 requests per minute to accommodate:
 * - Multiple tabs/windows (shared IP)
 * - Notification polling (every 30s)
 * - Chat messages, forum posts, search, etc.
 */
export const apiRateLimiter = rateLimiter(60000, 300); // 300 requests per minute
