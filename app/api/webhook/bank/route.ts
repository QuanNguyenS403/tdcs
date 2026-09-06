/**
 * POST /api/webhook/bank
 * Bank transaction webhook from Casso
 * 
 * Webhook signature verification using HMAC
 */

import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { orderRepository, userRepository } from '@/lib/container'
import { PaymentService } from '@/lib/services/payment.service'
import { eventBus } from '@/lib/events/event-bus'
import { jsonError, jsonResponse, successResponse } from '@/lib/api/response'
import logger from '@/lib/logger'

interface CassoWebhookPayload {
  data: Array<{
    id: string
    amount: number
    senderName: string
    description: string
    transactionDate: string
  }>
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  const expected = Buffer.from(hash, 'utf8')
  const received = Buffer.from(signature, 'utf8')

  return expected.length === received.length && crypto.timingSafeEqual(expected, received)
}

export async function POST(req: NextRequest) {
  try {
    logger.info('Bank webhook received')

    // Verify signature
    const signature = req.headers.get('x-signature') || ''
    const webhookSecret = process.env.CASSO_WEBHOOK_SECRET || ''

    const body = await req.text()

    if (!verifyWebhookSignature(body, signature, webhookSecret)) {
      logger.error('Invalid webhook signature')
      return jsonError('INVALID_SIGNATURE', 'Signature verification failed', 401)
    }

    const payload = JSON.parse(body) as CassoWebhookPayload

    // Process each transaction
    const paymentService = new PaymentService(orderRepository, userRepository, eventBus)

    const results = []
    for (const transaction of payload.data) {
      try {
        const result = await paymentService.processWebhookTransaction({
          transactionId: transaction.id,
          amount: transaction.amount,
          senderName: transaction.senderName,
          description: transaction.description,
          transactionDate: new Date(transaction.transactionDate),
        })

        results.push(result)
        logger.info({ txnId: transaction.id, status: result.status }, 'Transaction processed')
      } catch (error) {
        logger.error({ error, txnId: transaction.id }, 'Failed to process transaction')
      }
    }

    return jsonResponse(
      successResponse({ processed: results.length, results }),
      200
    )
  } catch (error) {
    logger.error({ error }, 'Webhook processing error')
    return jsonError('WEBHOOK_ERROR', 'Failed to process webhook', 500)
  }
}
