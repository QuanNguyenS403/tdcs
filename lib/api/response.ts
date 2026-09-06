/**
 * API Response helpers
 * Consistent response envelope for all API endpoints
 */

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    fields?: Array<{ field: string; message: string }>
    details?: Record<string, any>
  }
  meta?: {
    timestamp: string
    path?: string
    [key: string]: any
  }
}

/**
 * Success response
 */
export function successResponse<T>(
  data: T,
  meta?: Record<string, any>
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  }
}

/**
 * Error response
 */
export function errorResponse(
  code: string,
  message: string,
  options?: {
    fields?: Array<{ field: string; message: string }>
    details?: Record<string, any>
    meta?: Record<string, any>
  }
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      fields: options?.fields,
      details: options?.details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...options?.meta,
    },
  }
}

/**
 * Validation error response
 */
export function validationErrorResponse(
  fields: Array<{ field: string; message: string }>
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Dữ liệu không hợp lệ',
      fields,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * HTTP response builders
 */
export function jsonResponse<T>(
  data: ApiResponse<T>,
  status: number = 200
): Response {
  return Response.json(data, { status })
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  options?: {
    fields?: Array<{ field: string; message: string }>
    details?: Record<string, any>
  }
): Response {
  const response = errorResponse(code, message, options)
  return Response.json(response, { status })
}
