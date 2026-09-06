/**
 * Issue Certificate Use Case
 * 
 * Orchestrates the certificate issuance process with business rule validation
 * 
 * Rules:
 * 1. User must have EXPERT plan
 * 2. Must complete >= 90% of course
 * 3. Must submit >= 3 graded assignments
 * 4. Must score >= 70% on quiz
 * 5. Certificate can only be issued once (idempotent)
 */

import { nanoid } from 'nanoid'
import { EventBus } from '@/lib/events/event-bus'
import { UserRepository } from '@/lib/repositories/user.repository'
import { ProgressRepository } from '@/lib/repositories/progress.repository'
import { NotificationService } from '@/lib/services/notification.service'
import {
  BusinessError,
  NotFoundError,
  ForbiddenError,
} from '@/lib/errors/business.error'
import {
  CertificateAlreadyIssuedError,
  InsufficientProgressError,
  InsufficientSubmissionsError,
  InsufficientQuizScoreError,
} from '@/lib/errors/domain.error'
import logger from '@/lib/logger'

export interface Certificate {
  id: string
  userId: string
  certCode: string
  filePath: string
  issuedAt: Date
}

export interface CertificateRepository {
  findByUserId(userId: string): Promise<Certificate | null>
  create(data: Omit<Certificate, 'id' | 'issuedAt'>): Promise<Certificate>
}

export interface CertificateGenerator {
  generate(data: {
    user: { name: string; email: string }
    certCode: string
  }): Promise<Buffer>
}

export interface StorageService {
  uploadCertificate(userId: string, buffer: Buffer): Promise<string>
}

export interface SubmissionRepository {
  countGraded(userId: string): Promise<number>
}

export interface QuizRepository {
  getBestScore(userId: string): Promise<number>
}

export class IssueCertificateUseCase {
  constructor(
    private userRepo: UserRepository,
    private progressRepo: ProgressRepository,
    private certRepo: CertificateRepository,
    private submissionRepo: SubmissionRepository,
    private quizRepo: QuizRepository,
    private certificateGenerator: CertificateGenerator,
    private storageService: StorageService,
    private notificationService: NotificationService,
    private eventBus: EventBus
  ) {}

  async execute(userId: string): Promise<Certificate> {
    logger.info({ userId }, 'Attempting to issue certificate')

    try {
      // Rule 1: User must have EXPERT plan
      const user = await this.userRepo.findById(userId)
      if (!user) {
        throw new NotFoundError('User', userId)
      }

      if (user.planType !== 'EXPERT') {
        logger.warn(
          { userId, planType: user.planType },
          'User does not have EXPERT plan'
        )
        throw new ForbiddenError(
          `Chứng chỉ chỉ dành cho gói EXPERT (hiện tại: ${user.planType})`
        )
      }

      // Rule 5: Check if already issued (idempotent)
      const existing = await this.certRepo.findByUserId(userId)
      if (existing) {
        logger.info({ userId, certId: existing.id }, 'Certificate already issued')
        throw new CertificateAlreadyIssuedError(userId)
      }

      // Rule 2: Complete >= 90% of course
      const { percentage } = await this.progressRepo.getUserCompletionSummary(userId)
      if (percentage < 90) {
        logger.warn(
          { userId, percentage },
          'Insufficient progress for certificate'
        )
        throw new InsufficientProgressError(percentage, 90)
      }

      // Rule 3: Submit >= 3 graded assignments
      const gradedSubmissions = await this.submissionRepo.countGraded(userId)
      if (gradedSubmissions < 3) {
        logger.warn(
          { userId, submissions: gradedSubmissions },
          'Insufficient graded submissions'
        )
        throw new InsufficientSubmissionsError(gradedSubmissions, 3)
      }

      // Rule 4: Score >= 70% on quiz
      const quizScore = await this.quizRepo.getBestScore(userId)
      if (quizScore < 70) {
        logger.warn({ userId, score: quizScore }, 'Insufficient quiz score')
        throw new InsufficientQuizScoreError(quizScore, 70)
      }

      // All rules passed - generate certificate
      logger.info({ userId }, 'All certificate rules passed')

      // Generate certificate code
      const certCode = `CSE-${new Date().getFullYear()}-${nanoid(8).toUpperCase()}`
      logger.debug({ userId, certCode }, 'Generated certificate code')

      // Generate PDF
      const pdfBuffer = await this.certificateGenerator.generate({
        user: { name: user.name, email: user.email },
        certCode,
      })
      logger.debug({ userId }, 'PDF certificate generated')

      // Upload to storage
      const filePath = await this.storageService.uploadCertificate(userId, pdfBuffer)
      logger.info({ userId, filePath }, 'Certificate uploaded to storage')

      // Save to database
      const cert = await this.certRepo.create({
        userId,
        certCode,
        filePath,
      })
      logger.info({ userId, certId: cert.id, certCode }, 'Certificate saved to database')

      // Send email confirmation
      try {
        await this.notificationService.sendCertificateEmail(
          { email: user.email, name: user.name },
          certCode
        )
      } catch (error) {
        logger.error({ error, userId }, 'Failed to send certificate email')
      }

      // Emit domain event
      await this.eventBus.emit('certificate.issued', {
        userId,
        certCode,
        filePath,
      })

      logger.info({ userId, certCode }, 'Certificate issued successfully')
      return cert
    } catch (error) {
      if (
        error instanceof CertificateAlreadyIssuedError ||
        error instanceof InsufficientProgressError ||
        error instanceof InsufficientSubmissionsError ||
        error instanceof InsufficientQuizScoreError ||
        error instanceof ForbiddenError ||
        error instanceof NotFoundError
      ) {
        logger.warn({ userId, error: error.message }, 'Certificate issuance failed')
        throw error
      }

      logger.error({ userId, error }, 'Unexpected error issuing certificate')
      throw new BusinessError(
        'Failed to issue certificate',
        'CERTIFICATE_ISSUE_ERROR'
      )
    }
  }
}
