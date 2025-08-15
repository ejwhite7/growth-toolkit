import { EventPayload, AnalyticsAdapter } from '../types'
import { generateEventId, generateDedupId } from '../utils/ids'
import { storage } from '../utils/storage'
import * as Sentry from '@sentry/nextjs'

export interface EventBusConfig {
  enableOfflineQueue: boolean
  maxQueueSize: number
  retryAttempts: number
  retryDelay: number
  batchSize: number
  flushInterval: number
}

export interface QueuedEvent {
  event: EventPayload
  attempts: number
  created_at: number
  next_retry_at?: number
}

export type EventListener = (event: EventPayload) => void | Promise<void>

export class EventBus {
  private adapters: Map<string, AnalyticsAdapter> = new Map()
  private listeners: Set<EventListener> = new Set()
  private config: EventBusConfig
  private isOnline = true
  private flushTimer: NodeJS.Timeout | null = null
  private isProcessing = false

  constructor(config: Partial<EventBusConfig> = {}) {
    this.config = {
      enableOfflineQueue: true,
      maxQueueSize: 1000,
      retryAttempts: 3,
      retryDelay: 2000,
      batchSize: 10,
      flushInterval: 5000,
      ...config,
    }

    this.setupOnlineDetection()
    this.startFlushTimer()
    this.processQueuedEvents()
  }

  // Adapter management
  addAdapter(adapter: AnalyticsAdapter): void {
    if (!adapter.isEnabled()) {
      console.warn(`Adapter ${adapter.name} is disabled, skipping registration`)
      return
    }

    this.adapters.set(adapter.name, adapter)
    console.log(`EventBus: Registered adapter ${adapter.name}`)
  }

  removeAdapter(name: string): void {
    this.adapters.delete(name)
    console.log(`EventBus: Removed adapter ${name}`)
  }

  getAdapters(): AnalyticsAdapter[] {
    return Array.from(this.adapters.values())
  }

  // Event listeners
  addEventListener(listener: EventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  removeEventListener(listener: EventListener): void {
    this.listeners.delete(listener)
  }

  // Core event tracking
  async track(eventData: Partial<EventPayload>): Promise<void> {
    try {
      const event = this.enrichEvent(eventData)
      
      // Validate event
      if (!this.validateEvent(event)) {
        throw new Error('Invalid event data')
      }

      // Check for duplicates
      if (this.isDuplicate(event)) {
        console.warn('Duplicate event detected, skipping:', event.dedup_id)
        return
      }

      // Notify listeners
      await this.notifyListeners(event)

      // Process with adapters
      if (this.isOnline) {
        await this.processEvent(event)
      } else if (this.config.enableOfflineQueue) {
        this.queueEvent(event)
      }

    } catch (error) {
      console.error('EventBus: Failed to track event:', error)
      Sentry.captureException(error, {
        extra: { eventData }
      })
    }
  }

  // Convenience methods for common events
  async pageView(data: Partial<EventPayload>): Promise<void> {
    await this.track({
      ...data,
      action: 'page_viewed',
    })
  }

  async formStart(data: Partial<EventPayload>): Promise<void> {
    await this.track({
      ...data,
      action: 'form_started',
    })
  }

  async formSubmit(data: Partial<EventPayload>): Promise<void> {
    await this.track({
      ...data,
      action: 'form_submitted',
    })
  }

  async buttonClick(data: Partial<EventPayload>): Promise<void> {
    await this.track({
      ...data,
      action: 'button_clicked',
    })
  }

  // Identity and profile methods
  async identify(userId: string, traits: Record<string, any>): Promise<void> {
    const promises = Array.from(this.adapters.values()).map(async (adapter) => {
      try {
        if (adapter.identify) {
          await adapter.identify(userId, traits)
        }
      } catch (error) {
        console.error(`Failed to identify with ${adapter.name}:`, error)
      }
    })

    await Promise.allSettled(promises)
  }

  // Private methods
  private enrichEvent(eventData: Partial<EventPayload>): EventPayload {
    const now = new Date().toISOString()
    
    const event: EventPayload = {
      event_id: generateEventId(),
      occurred_at: now,
      action: eventData.action || 'unknown',
      visitor_id: eventData.visitor_id || this.getVisitorId(),
      session_id: eventData.session_id || this.getSessionId(),
      consent: eventData.consent || this.getDefaultConsent(),
      region: eventData.region || 'US',
      dedup_id: '',
      ...eventData,
    } as EventPayload

    // Generate dedup ID based on the complete event
    event.dedup_id = generateDedupId({
      visitor_id: event.visitor_id,
      action: event.action,
      experience_id: event.experience_id,
      timestamp: event.occurred_at,
    })

    return event
  }

  private validateEvent(event: EventPayload): boolean {
    return Boolean(
      event.event_id &&
      event.action &&
      event.visitor_id &&
      event.session_id &&
      event.dedup_id
    )
  }

  private isDuplicate(event: EventPayload): boolean {
    const recentEvents = this.getRecentEventIds()
    return recentEvents.includes(event.dedup_id)
  }

  private async notifyListeners(event: EventPayload): Promise<void> {
    const promises = Array.from(this.listeners).map(async (listener) => {
      try {
        await listener(event)
      } catch (error) {
        console.error('EventBus: Listener error:', error)
      }
    })

    await Promise.allSettled(promises)
  }

  private async processEvent(event: EventPayload): Promise<void> {
    const promises = Array.from(this.adapters.values()).map(async (adapter) => {
      try {
        // Check consent before sending to adapter
        if (!adapter.checkConsent(event.consent, event.region)) {
          return
        }

        await adapter.track(event)
      } catch (error) {
        console.error(`EventBus: Adapter ${adapter.name} failed:`, error)
        
        // If adapter fails and we have offline queue enabled, queue the event
        if (this.config.enableOfflineQueue) {
          this.queueEvent(event)
        }
      }
    })

    await Promise.allSettled(promises)
    this.markEventProcessed(event.dedup_id)
  }

  private queueEvent(event: EventPayload): void {
    try {
      const queue = this.getEventQueue()
      
      // Check queue size limit
      if (queue.length >= this.config.maxQueueSize) {
        queue.shift() // Remove oldest event
      }

      const queuedEvent: QueuedEvent = {
        event,
        attempts: 0,
        created_at: Date.now(),
      }

      queue.push(queuedEvent)
      this.saveEventQueue(queue)
    } catch (error) {
      console.error('EventBus: Failed to queue event:', error)
    }
  }

  private async processQueuedEvents(): Promise<void> {
    if (this.isProcessing || !this.isOnline) return

    this.isProcessing = true

    try {
      const queue = this.getEventQueue()
      if (queue.length === 0) return

      const batch = queue.splice(0, this.config.batchSize)
      const processedIds: string[] = []

      for (const queuedEvent of batch) {
        try {
          // Check if we should retry this event
          if (queuedEvent.next_retry_at && Date.now() < queuedEvent.next_retry_at) {
            queue.unshift(queuedEvent) // Put back in queue
            continue
          }

          await this.processEvent(queuedEvent.event)
          processedIds.push(queuedEvent.event.dedup_id)
        } catch (error) {
          queuedEvent.attempts++
          
          if (queuedEvent.attempts < this.config.retryAttempts) {
            queuedEvent.next_retry_at = Date.now() + (this.config.retryDelay * queuedEvent.attempts)
            queue.push(queuedEvent) // Retry later
          } else {
            console.error('EventBus: Event failed after max retries:', queuedEvent.event.dedup_id)
          }
        }
      }

      this.saveEventQueue(queue)
    } finally {
      this.isProcessing = false
    }
  }

  private setupOnlineDetection(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('online', () => {
      this.isOnline = true
      console.log('EventBus: Back online, processing queued events')
      this.processQueuedEvents()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      console.log('EventBus: Offline, queuing events')
    })

    this.isOnline = navigator.onLine
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      this.processQueuedEvents()
    }, this.config.flushInterval)
  }

  // Storage methods
  private getEventQueue(): QueuedEvent[] {
    return storage.getItem<QueuedEvent[]>('event_queue') || []
  }

  private saveEventQueue(queue: QueuedEvent[]): void {
    storage.setItem('event_queue', queue, 24) // 24 hour TTL
  }

  private getRecentEventIds(): string[] {
    return storage.getItem<string[]>('recent_event_ids') || []
  }

  private markEventProcessed(dedupId: string): void {
    const recentIds = this.getRecentEventIds()
    recentIds.push(dedupId)
    
    // Keep only last 100 IDs
    if (recentIds.length > 100) {
      recentIds.shift()
    }
    
    storage.setItem('recent_event_ids', recentIds, 1) // 1 hour TTL
  }

  private getVisitorId(): string {
    return storage.getItem<string>('visitor_id') || 'unknown'
  }

  private getSessionId(): string {
    return storage.getItem<string>('session_id') || 'unknown'
  }

  private getDefaultConsent() {
    return {
      analytics: false,
      ads: false,
      marketing: false,
    }
  }

  // Cleanup
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    
    this.adapters.clear()
    this.listeners.clear()
  }
}

// Singleton instance
let eventBusInstance: EventBus | null = null

export function getEventBus(): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus()
  }
  return eventBusInstance
}