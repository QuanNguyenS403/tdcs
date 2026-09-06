/**
 * Domain-specific errors representing failed business rules
 */

export class DomainError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'DomainError'
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      context: this.context,
    }
  }
}

/**
 * Plan upgrade/downgrade errors
 */
export class PlanError extends DomainError {
  constructor(message: string, code = 'PLAN_ERROR', context?: Record<string, any>) {
    super(message, code, context)
  }
}

export class PlanDowngradeError extends PlanError {
  constructor(currentPlan: string, requestedPlan: string) {
    super(
      `Không thể hạ cấp từ ${currentPlan} xuống ${requestedPlan}`,
      'PLAN_DOWNGRADE_NOT_ALLOWED',
      { currentPlan, requestedPlan }
    )
  }
}

export class PlanAlreadyActiveError extends PlanError {
  constructor(planType: string) {
    super(
      `Bạn đã đăng ký gói ${planType}`,
      'PLAN_ALREADY_ACTIVE',
      { planType }
    )
  }
}

/**
 * Order/Payment errors
 */
export class OrderError extends DomainError {
  constructor(message: string, code = 'ORDER_ERROR', context?: Record<string, any>) {
    super(message, code, context)
  }
}

export class OrderNotFoundError extends OrderError {
  constructor(orderId: string) {
    super(`Đơn hàng không tìm thấy: ${orderId}`, 'ORDER_NOT_FOUND', { orderId })
  }
}

export class OrderExpiredError extends OrderError {
  constructor(orderId: string) {
    super(`Đơn hàng đã hết hạn: ${orderId}`, 'ORDER_EXPIRED', { orderId })
  }
}

export class PaymentAmountMismatchError extends OrderError {
  constructor(expected: number, actual: number, diff: number) {
    super(
      `Số tiền không khớp. Kỳ vọng: ${expected}, Nhận: ${actual} (chênh: ${diff} VND)`,
      'PAYMENT_AMOUNT_MISMATCH',
      { expected, actual, diff }
    )
  }
}

export class DuplicateTransactionError extends OrderError {
  constructor(transactionId: string) {
    super(
      `Giao dịch đã được xử lý: ${transactionId}`,
      'DUPLICATE_TRANSACTION',
      { transactionId }
    )
  }
}

/**
 * Certificate errors
 */
export class CertificateError extends DomainError {
  constructor(message: string, code = 'CERTIFICATE_ERROR', context?: Record<string, any>) {
    super(message, code, context)
  }
}

export class InsufficientProgressError extends CertificateError {
  constructor(currentPercentage: number, requiredPercentage: number = 90) {
    super(
      `Cần hoàn thành ít nhất ${requiredPercentage}% khóa học (hiện tại: ${currentPercentage}%)`,
      'INSUFFICIENT_PROGRESS',
      { currentPercentage, requiredPercentage }
    )
  }
}

export class InsufficientSubmissionsError extends CertificateError {
  constructor(current: number, required: number = 3) {
    super(
      `Cần ít nhất ${required} bài thực hành được chấm (hiện tại: ${current})`,
      'INSUFFICIENT_SUBMISSIONS',
      { current, required }
    )
  }
}

export class InsufficientQuizScoreError extends CertificateError {
  constructor(score: number, required: number = 70) {
    super(
      `Cần đạt ít nhất ${required}% trắc nghiệm (hiện tại: ${score}%)`,
      'INSUFFICIENT_QUIZ_SCORE',
      { score, required }
    )
  }
}

export class CertificateAlreadyIssuedError extends CertificateError {
  constructor(userId: string) {
    super(
      `Chứng chỉ đã được cấp cho người dùng`,
      'CERTIFICATE_ALREADY_ISSUED',
      { userId }
    )
  }
}

/**
 * Progress errors
 */
export class ProgressError extends DomainError {
  constructor(message: string, code = 'PROGRESS_ERROR', context?: Record<string, any>) {
    super(message, code, context)
  }
}

export class LessonNotFoundError extends ProgressError {
  constructor(lessonId: string) {
    super(`Bài học không tìm thấy: ${lessonId}`, 'LESSON_NOT_FOUND', { lessonId })
  }
}

/**
 * User errors
 */
export class UserError extends DomainError {
  constructor(message: string, code = 'USER_ERROR', context?: Record<string, any>) {
    super(message, code, context)
  }
}

export class UserNotFoundError extends UserError {
  constructor(userId: string) {
    super(`Người dùng không tìm thấy: ${userId}`, 'USER_NOT_FOUND', { userId })
  }
}

export class UserAlreadyExistsError extends UserError {
  constructor(email: string) {
    super(`Người dùng đã tồn tại: ${email}`, 'USER_ALREADY_EXISTS', { email })
  }
}
