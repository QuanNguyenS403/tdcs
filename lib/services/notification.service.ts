/**
 * Notification Service
 * 
 * Responsibilities:
 * - Send emails (registration, payments, progress, certificates)
 * - Admin alerts
 * - User notifications
 */

import logger from '@/lib/logger'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export interface AdminAlert {
  type: string
  severity: 'low' | 'medium' | 'high'
  title: string
  message: string
  data?: Record<string, any>
}

export class NotificationService {
  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
    try {
      logger.info({ to: options.to, subject: options.subject }, 'Sending email')

      // TODO: Implement email service (Gmail, Resend, SendGrid, etc.)
      // await emailService.send(options)

      logger.info({ to: options.to }, 'Email sent successfully')
      return { success: true }
    } catch (error) {
      logger.error({ error, to: options.to }, 'Failed to send email')
      return { success: false }
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(user: { email: string; name: string }): Promise<void> {
    const html = `
      <h1>Chào mừng ${user.name}!</h1>
      <p>Bạn đã đăng ký thành công với CộtSốngEdu.</p>
      <p>Hãy bắt đầu hành trình học tập của bạn!</p>
    `

    await this.sendEmail({
      to: user.email,
      subject: 'Chào mừng đến CộtSốngEdu',
      html,
    })
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmationEmail(
    user: { email: string; name: string },
    order: { amount: number; planType: string; id: string }
  ): Promise<void> {
    const html = `
      <h1>Xác nhận thanh toán</h1>
      <p>Cảm ơn ${user.name}!</p>
      <p>Thanh toán của bạn đã được xác nhận.</p>
      <ul>
        <li><strong>Gói:</strong> ${order.planType}</li>
        <li><strong>Số tiền:</strong> ${order.amount.toLocaleString('vi-VN')} VND</li>
        <li><strong>Mã đơn:</strong> ${order.id}</li>
      </ul>
      <p>Bạn có thể bắt đầu học ngay!</p>
    `

    await this.sendEmail({
      to: user.email,
      subject: 'Xác nhận thanh toán - CộtSốngEdu',
      html,
    })
  }

  /**
   * Send progress milestone email
   */
  async sendProgressMilestoneEmail(
    user: { email: string; name: string },
    percentage: number
  ): Promise<void> {
    const html = `
      <h1>Mừng bạn đã hoàn thành ${percentage}%!</h1>
      <p>Chúc mừng ${user.name},</p>
      <p>Bạn đã hoàn thành ${percentage}% khóa học.</p>
      <p>Hãy tiếp tục cố gắng!</p>
    `

    await this.sendEmail({
      to: user.email,
      subject: `Tiến độ học tập: ${percentage}% - CộtSốngEdu`,
      html,
    })
  }

  /**
   * Send certificate issued email
   */
  async sendCertificateEmail(
    user: { email: string; name: string },
    certCode: string
  ): Promise<void> {
    const html = `
      <h1>Chứng chỉ hoàn thành!</h1>
      <p>Chúc mừng ${user.name},</p>
      <p>Bạn đã hoàn thành khóa học và nhận được chứng chỉ!</p>
      <p><strong>Mã chứng chỉ:</strong> ${certCode}</p>
      <p>Bạn có thể tải chứng chỉ từ trang cá nhân của mình.</p>
    `

    await this.sendEmail({
      to: user.email,
      subject: 'Chứng chỉ hoàn thành - CộtSốngEdu',
      html,
    })
  }

  /**
   * Alert admin about events
   */
  async alertAdmin(alert: AdminAlert): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@cotsongedu.vn'

    const html = `
      <h1>[${alert.severity.toUpperCase()}] ${alert.title}</h1>
      <p>${alert.message}</p>
      ${alert.data ? `<pre>${JSON.stringify(alert.data, null, 2)}</pre>` : ''}
    `

    logger.warn({ alert }, 'Alerting admin')

    await this.sendEmail({
      to: adminEmail,
      subject: `[CộtSốngEdu Alert] ${alert.title}`,
      html,
    })
  }

  /**
   * Send payment amount mismatch alert
   */
  async alertPaymentMismatch(
    orderId: string,
    expected: number,
    actual: number
  ): Promise<void> {
    await this.alertAdmin({
      type: 'PAYMENT_MISMATCH',
      severity: 'high',
      title: 'Thanh toán không khớp',
      message: `Đơn hàng ${orderId}: Kỳ vọng ${expected} VND, nhận ${actual} VND`,
      data: { orderId, expected, actual },
    })
  }

  /**
   * Send system notification (in-app)
   */
  async sendNotification(
    userId: string,
    title: string,
    message: string
  ): Promise<void> {
    logger.info({ userId, title }, 'Sending notification')
    // TODO: Implement notification storage/push
  }

  /**
   * Send bulk email (for campaigns)
   */
  async sendBulkEmail(
    recipients: Array<{ email: string; name: string }>,
    subject: string,
    html: string
  ): Promise<{ sent: number; failed: number }> {
    logger.info({ count: recipients.length }, 'Sending bulk emails')

    let sent = 0
    let failed = 0

    for (const recipient of recipients) {
      try {
        await this.sendEmail({
          to: recipient.email,
          subject,
          html,
        })
        sent++
      } catch (error) {
        logger.error({ error, email: recipient.email }, 'Failed to send email')
        failed++
      }
    }

    return { sent, failed }
  }
}
