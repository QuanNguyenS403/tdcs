/**
 * Lightweight in-process Event Bus
 * Implements pub/sub pattern for domain events
 * 
 * Features:
 * - Typed event handlers
 * - AllSettled: one handler failure doesn't block others
 * - Async event processing
 */

import logger from '@/lib/logger'

export type EventHandler<T = any> = (payload: T) => Promise<void> | void

interface EventListener<T = any> {
  handler: EventHandler<T>
  once?: boolean
}

export class EventBus {
  private handlers = new Map<string, EventListener<any>[]>()

  /**
   * Subscribe to an event
   */
  on<T = any>(event: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(event) ?? []
    this.handlers.set(event, [...existing, { handler }])

    logger.debug({ event, handlerCount: this.handlers.get(event)?.length }, 'Event listener registered')
  }

  /**
   * Subscribe to an event once
   */
  once<T = any>(event: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(event) ?? []
    this.handlers.set(event, [...existing, { handler, once: true }])
  }

  /**
   * Unsubscribe from an event
   */
  off<T = any>(event: string, handler: EventHandler<T>): void {
    const listeners = this.handlers.get(event) ?? []
    const filtered = listeners.filter(l => l.handler !== handler)
    
    if (filtered.length === 0) {
      this.handlers.delete(event)
    } else {
      this.handlers.set(event, filtered)
    }
  }

  /**
   * Emit an event and execute all handlers
   * Uses Promise.allSettled to ensure one failure doesn't block others
   */
  async emit<T = any>(event: string, payload?: T): Promise<void> {
    const listeners = this.handlers.get(event) ?? []
    
    if (listeners.length === 0) {
      logger.debug({ event }, 'No listeners for event')
      return
    }

    logger.debug({ event, listenerCount: listeners.length }, 'Emitting event')

    // Execute all handlers in parallel with allSettled
    const results = await Promise.allSettled(
      listeners.map(l => Promise.resolve(l.handler(payload)))
    )

    // Process results and handle errors
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(
          { event, handlerIndex: index, error: result.reason },
          'Event handler failed'
        )
      }
    })

    // Remove one-time listeners
    const filteredListeners = listeners.filter(l => !l.once)
    if (filteredListeners.length === 0) {
      this.handlers.delete(event)
    } else {
      this.handlers.set(event, filteredListeners)
    }
  }

  /**
   * Wait for an event to be emitted
   * Returns a promise that resolves when the event is emitted
   */
  async waitFor<T = any>(event: string, timeout?: number): Promise<T | undefined> {
    return new Promise((resolve) => {
      const handler = (payload: T) => resolve(payload)
      this.once(event, handler)

      if (timeout) {
        setTimeout(() => {
          this.off(event, handler)
          resolve(undefined)
        }, timeout)
      }
    })
  }

  /**
   * Clear all listeners (mainly for testing)
   */
  clear(): void {
    this.handlers.clear()
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    return this.handlers.get(event)?.length ?? 0
  }

  /**
   * Get all registered events
   */
  eventNames(): string[] {
    return Array.from(this.handlers.keys())
  }
}

// Singleton event bus instance
export const eventBus = new EventBus()

export default eventBus
