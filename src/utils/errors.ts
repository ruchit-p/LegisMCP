/**
 * Custom error classes for the LegislativeMCP application
 * Provides a hierarchy of errors with proper status codes and details
 */

/**
 * Base error class for all custom errors
 */
export class BaseError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string, statusCode: number, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Invalid parameter error (400)
 */
export class InvalidParameterError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'INVALID_PARAMETER', 400, details);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', 404, details);
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'RATE_LIMIT_ERROR', 429, details);
  }
}

/**
 * Configuration error (500)
 */
export class ConfigurationError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIGURATION_ERROR', 500, details);
  }
}

/**
 * Service error (500)
 */
export class ServiceError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'SERVICE_ERROR', 500, details);
  }
}

/**
 * API error with status code
 */
export class ApiError extends BaseError {
  constructor(message: string, statusCode: number, details?: any) {
    super(message, 'API_ERROR', statusCode, details);
  }
}

/**
 * Maps HTTP status codes to appropriate error classes
 */
export function createErrorFromStatus(status: number, message: string, details?: any): BaseError {
  switch (status) {
    case 400:
      return new ValidationError(message, details);
    case 401:
      return new AuthenticationError(message, details);
    case 404:
      return new NotFoundError(message, details);
    case 429:
      return new RateLimitError(message, details);
    default:
      if (status >= 500) {
        return new ServiceError(message, details);
      }
      return new ApiError(message, status, details);
  }
}