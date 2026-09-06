/**
 * Base Error class for all business logic errors
 */
export class BusinessError extends Error {
  constructor(
    message: string,
    public code: string = 'BUSINESS_ERROR',
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'BusinessError'
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    }
  }
}

/**
 * Validation error - Input validation failed
 */
export class ValidationError extends BusinessError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 422, details)
    this.name = 'ValidationError'
  }
}

/**
 * Not found error
 */
export class NotFoundError extends BusinessError {
  constructor(resource: string, id: string) {
    super(`${resource} không tìm thấy: ${id}`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

/**
 * Conflict error - State conflict
 */
export class ConflictError extends BusinessError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFLICT', 409, details)
    this.name = 'ConflictError'
  }
}

/**
 * Forbidden error - Access denied
 */
export class ForbiddenError extends BusinessError {
  constructor(message: string) {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends BusinessError {
  constructor(message: string = 'Không xác thực') {
    super(message, 'UNAUTHENTICATED', 401)
    this.name = 'AuthenticationError'
  }
}
