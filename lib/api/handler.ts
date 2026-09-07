/**
 * API Handler Wrapper
 * Provides:
 * - Authentication & authorization
 * - Rate limiting
 * - Global error handling
 * - Consistent response format
 */

import { NextRequest, NextResponse } from 'next/server'
import { ZodError, ZodSchema } from 'zod'
import { getServerSession } from 'next-auth'
import {
  BusinessError,
  ValidationError,
  ForbiddenError,
  AuthenticationError,
} from '@/lib/errors/business.error'
import {
  DomainError,
  PlanDowngradeError,
  OrderExpiredError,
  CertificateAlreadyIssuedError,
} from '@/lib/errors/domain.error'
import { RateLimiter, getClientIP } from './rate-limit'
import { successResponse, validationErrorResponse, jsonError, jsonResponse } from './response'
import logger from '@/lib/logger'
import redis from '@/lib/redis'

export interface ApiContext {
  params?: Record<string, string>
  query?: Record<string, string | string[]>
  body?: any
  session?: any
  ip?: string
}

export type ApiHandler<T = any> = (
  req: NextRequest,
  context: ApiContext
) => Promise<T>

export interface ApiOptions {
  requireAuth?: boolean
  requireRole?: string[]
  rateLimit?: { max: number; window: number }
  validateBody?: ZodSchema
  validateQuery?: ZodSchema
}

/**
 * Wrapper for API handlers with auth, rate limiting, and error handling
 */
export function withApi<T = any>(handler: ApiHandler<T>, options: ApiOptions = {}) {
  return async function wrappedHandler(
    req: NextRequest,
    context: { params?: Record<string, string> } = {}
  ) {
    const ip = getClientIP(req)
    const url = new URL(req.url)

    logger.debug(
      { method: req.method, path: url.pathname, ip },
      'API request received'
    )

    try {
      // 1. Get session
      let session = null
      try {
        session = await getServerSession()
      } catch (error) {
        logger.debug({ error }, 'Failed to get session')
      }

      // 2. Check authentication
      if (options.requireAuth && !session) {
        logger.warn({ ip, path: url.pathname }, 'Unauthorized request')
        return jsonError(
          'UNAUTHORIZED',
          'Cần đăng nhập để truy cập',
          401
        )
      }

      // 3. Check authorization (role)
      if (options.requireRole && session) {
        const user = session.user as typeof session.user & {
          id?: string
          role?: string
        }
        const userRole = user?.role || 'USER'
        const hasRole = options.requireRole.includes(userRole)

        if (!hasRole) {
          logger.warn(
            { userId: user?.id, role: userRole, required: options.requireRole },
            'Forbidden access'
          )
          return jsonError(
            'FORBIDDEN',
            'Không có quyền truy cập tài nguyên này',
            403
          )
        }
      }

      // 4. Rate limiting
      if (options.rateLimit) {
        const rateLimiter = new RateLimiter(redis)
        const rateLimitKey = `${ip}:${url.pathname}`
        const result = await rateLimiter.check(rateLimitKey, {
          max: options.rateLimit.max,
          window: options.rateLimit.window,
          keyPrefix: 'api-rate-limit',
        })

        if (!result.allowed) {
          logger.warn({ ip, path: url.pathname, remaining: result.remaining }, 'Rate limit exceeded')
          return jsonError(
            'RATE_LIMITED',
            'Quá nhiều request. Vui lòng thử lại sau.',
            429
          )
        }
      }

      // 5. Validate request body
      let body: any
      if (options.validateBody) {
        try {
          const json = await req.json()
          body = options.validateBody.parse(json)
        } catch (error) {
          if (error instanceof ZodError) {
            const fields = error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
            }))
            logger.warn({ fields }, 'Validation error')
            return jsonResponse(validationErrorResponse(fields), 422)
          }
          throw error
        }
      }

      // 6. Validate query parameters
      let query: Record<string, string | string[]> = {}
      if (options.validateQuery) {
        try {
          const queryParams = Object.fromEntries(url.searchParams)
          query = options.validateQuery.parse(queryParams)
        } catch (error) {
          if (error instanceof ZodError) {
            const fields = error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
            }))
            logger.warn({ fields }, 'Query validation error')
            return jsonResponse(validationErrorResponse(fields), 422)
          }
          throw error
        }
      }

      // 7. Execute handler
      const result = await handler(req, {
        params: context.params || {},
        query,
        body,
        session,
        ip,
      })

      // 8. Success response
      logger.debug({ path: url.pathname }, 'API request completed successfully')
      return jsonResponse(successResponse(result), 200)
    } catch (error) {
      return handleApiError(error, url.pathname)
    }
  }
}

/**
 * Global error handler
 */
function handleApiError(error: unknown, path: string): Response {
  // Zod validation errors
  if (error instanceof ZodError) {
    const fields = error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }))
    logger.warn({ fields, path }, 'Validation error')
    return jsonResponse(validationErrorResponse(fields), 422)
  }

  // Domain errors (business rule violations)
  if (error instanceof DomainError) {
    logger.warn({ code: error.code, path }, 'Domain error')
    return jsonError(error.code, error.message, 400, {
      details: error.context,
    })
  }

  // Business errors (validation, conflict, etc.)
  if (error instanceof BusinessError) {
    const status = error.statusCode || 400
    logger.warn({ code: error.code, path }, 'Business error')
    return jsonError(error.code, error.message, status, {
      details: error.details,
    })
  }

  // Unexpected errors - log and return generic message
  logger.error({ error, path }, 'Unhandled API error')

  // TODO: Send to Sentry/error tracking
  // Sentry.captureException(error)

  return jsonError(
    'INTERNAL_ERROR',
    'Đã có lỗi xảy ra. Vui lòng thử lại sau.',
    500
  )
}

/**
 * Error handler for GET requests without body validation
 */
export function withGetApi<T = any>(
  handler: ApiHandler<T>,
  options: Omit<ApiOptions, 'validateBody'> = {}
) {
  return withApi(handler, options)
}

/**
 * Error handler for POST requests with body validation
 */
export function withPostApi<T = any>(
  handler: ApiHandler<T>,
  schema: ZodSchema,
  options: Omit<ApiOptions, 'validateBody'> = {}
) {
  return withApi(handler, { ...options, validateBody: schema })
}
