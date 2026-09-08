import { PrismaClient } from '@prisma/client'

// Singleton Prisma client with connection pooling
let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['warn', 'error'], // Only log warnings and errors in production
  })
} else {
  // Reuse Prisma instance in development to avoid connection exhaustion
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'], // More verbose in development
    })
  }
  prisma = global.prisma
}

export default prisma

declare global {
  var prisma: PrismaClient | undefined
}
