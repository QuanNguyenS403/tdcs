/**
 * Simple logger utility
 * In production, replace with Winston, Pino, or Sentry
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  timestamp: string
  message: string
  context?: Record<string, any>
  error?: any
}

class Logger {
  private isDev = process.env.NODE_ENV !== 'production'

  private format(level: LogLevel, message: string, context?: any): LogEntry {
    return {
      level,
      timestamp: new Date().toISOString(),
      message,
      context,
    }
  }

  debug(context: any, message?: string) {
    if (!this.isDev) return
    const msg = message || context
    console.log('[DEBUG]', this.format('debug', msg, typeof context === 'string' ? undefined : context))
  }

  info(context: any, message?: string) {
    const msg = message || context
    console.log('[INFO]', this.format('info', msg, typeof context === 'string' ? undefined : context))
  }

  warn(context: any, message?: string) {
    const msg = message || context
    console.warn('[WARN]', this.format('warn', msg, typeof context === 'string' ? undefined : context))
  }

  error(contextOrError: any, message?: string) {
    let error: any
    let context: any

    if (contextOrError instanceof Error) {
      error = contextOrError
      context = { error: error.message, stack: error.stack }
    } else if (typeof contextOrError === 'object') {
      context = contextOrError
      error = contextOrError.error
    } else {
      message = contextOrError
    }

    console.error('[ERROR]', this.format('error', message || 'Unknown error', context))
  }
}

export const logger = new Logger()
export default logger
