/**
 * Event handler registration
 * All domain event listeners are registered here
 */

import { EventBus } from './event-bus'
import logger from '@/lib/logger'

// Type definitions for domain events
export interface PaymentConfirmedEvent {
  orderId: string
  userId: string
  amount: number
  planType: string
  email: string
  name: string
}

export interface PaymentAmountMismatchEvent {
  orderId: string
  expectedAmount: number
  actualAmount: number
  difference: number
}

export interface CertificateIssuedEvent {
  userId: string
  certCode: string
  filePath: string
}

export interface ProgressMilestoneEvent {
  userId: string
  percentage: number
  courseId?: string
}

export interface LessonCompletedEvent {
  userId: string
  lessonId: string
  courseId: string
  completionTime: number // seconds
}

export interface UserRegisteredEvent {
  userId: string
  email: string
  name: string
}

/**
 * Register all event handlers
 * Call this during application initialization
 */
export function registerEventHandlers(bus: EventBus) {
  logger.info('Registering domain event handlers...')

  // ========================================
  // Payment Events
  // ========================================

  bus.on('payment.confirmed', async (event: PaymentConfirmedEvent) => {
    try {
      logger.info({ userId: event.userId }, 'Payment confirmed - sending welcome email')
      // TODO: await automationService.sendWelcomeEmail(event)
    } catch (error) {
      logger.error({ error, event }, 'Failed to send welcome email')
    }
  })

  bus.on('payment.confirmed', async (event: PaymentConfirmedEvent) => {
    try {
      logger.info({ userId: event.userId }, 'Payment confirmed - updating student records')
      // TODO: await excelService.appendStudentRecord(event)
    } catch (error) {
      logger.error({ error, event }, 'Failed to update student records')
    }
  })

  bus.on('payment.confirmed', async (event: PaymentConfirmedEvent) => {
    try {
      logger.info({ userId: event.userId }, 'Payment confirmed - syncing to Google Sheets')
      // TODO: await sheetsService.appendRow(event)
    } catch (error) {
      logger.error({ error, event }, 'Failed to sync Google Sheets')
    }
  })

  bus.on('payment.confirmed', async (event: PaymentConfirmedEvent) => {
    try {
      logger.info({ userId: event.userId }, 'Payment confirmed - notifying admin')
      // TODO: await notificationService.notifyAdmin('PAYMENT_CONFIRMED', event)
    } catch (error) {
      logger.error({ error, event }, 'Failed to notify admin')
    }
  })

  bus.on('payment.amount_mismatch', async (event: PaymentAmountMismatchEvent) => {
    try {
      logger.warn({ event }, 'Payment amount mismatch - alerting admin')
      // TODO: await notificationService.alertAdmin('AMOUNT_MISMATCH', event)
    } catch (error) {
      logger.error({ error, event }, 'Failed to alert admin')
    }
  })

  // ========================================
  // Certificate Events
  // ========================================

  bus.on('certificate.issued', async (event: CertificateIssuedEvent) => {
    try {
      logger.info({ userId: event.userId }, 'Certificate issued - sending confirmation email')
      // TODO: await automationService.sendCertificateEmail(event)
    } catch (error) {
      logger.error({ error, event }, 'Failed to send certificate email')
    }
  })

  bus.on('certificate.issued', async (event: CertificateIssuedEvent) => {
    try {
      logger.info({ userId: event.userId }, 'Certificate issued - notifying admin')
      // TODO: await notificationService.notifyAdmin('CERTIFICATE_ISSUED', event)
    } catch (error) {
      logger.error({ error, event }, 'Failed to notify admin')
    }
  })

  // ========================================
  // Progress Events
  // ========================================

  bus.on('progress.milestone', async (event: ProgressMilestoneEvent) => {
    try {
      logger.info({ userId: event.userId, percentage: event.percentage }, 'Progress milestone - sending progress email')
      // TODO: await automationService.sendProgressEmail(event)
    } catch (error) {
      logger.error({ error, event }, 'Failed to send progress email')
    }
  })

  bus.on('progress.milestone', async (event: ProgressMilestoneEvent) => {
    try {
      // Check if eligible for certificate at 90%
      if (event.percentage >= 90) {
        logger.info({ userId: event.userId }, 'User reached 90% - eligible for certificate')
        // TODO: await issueC certificateUseCase.execute(event.userId)
      }
    } catch (error) {
      logger.error({ error, event }, 'Failed to check certificate eligibility')
    }
  })

  bus.on('lesson.completed', async (event: LessonCompletedEvent) => {
    try {
      logger.info({ userId: event.userId, lessonId: event.lessonId }, 'Lesson completed')
      // TODO: await progressService.updateCourseProgress(event.userId, event.courseId)
    } catch (error) {
      logger.error({ error, event }, 'Failed to update course progress')
    }
  })

  // ========================================
  // User Events
  // ========================================

  bus.on('user.registered', async (event: UserRegisteredEvent) => {
    try {
      logger.info({ userId: event.userId, email: event.email }, 'User registered - sending welcome')
      // TODO: await automationService.sendRegistrationWelcome(event)
    } catch (error) {
      logger.error({ error, event }, 'Failed to send welcome email')
    }
  })

  logger.info(`Event handlers registered successfully`)
}

/**
 * Example of how to emit events in services:
 *
 * // In PaymentService.processWebhookTransaction()
 * await eventBus.emit('payment.confirmed', {
 *   orderId: order.id,
 *   userId: order.userId,
 *   amount: order.amount,
 *   planType: order.planType,
 *   email: user.email,
 *   name: user.name,
 * })
 *
 * // In IssueCertificateUseCase.execute()
 * await eventBus.emit('certificate.issued', {
 *   userId,
 *   certCode,
 *   filePath,
 * })
 */
