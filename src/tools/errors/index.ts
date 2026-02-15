/**
 * Custom error types for MCP tools
 * These map to appropriate MCP ErrorCode values
 */

export class ValidationError extends Error {
  public details?: any;
  
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ApiError extends Error {
  public statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export class InvalidParameterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidParameterError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}