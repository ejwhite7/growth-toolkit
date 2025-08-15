import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { EventBus } from '../../../lib/events/event-bus'
import { AnalyticsAdapter, EventPayload } from '../../../lib/types'

// Mock the storage utility
vi.mock('../../../lib/utils/storage', () => ({
  storage: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}))

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

// Mock ID generation
vi.mock('../../../lib/utils/ids', () => ({
  generateEventId: vi.fn(() => 'event_123'),
  generateDedupId: vi.fn(() => 'dedup_123'),
}))

// Create a mock adapter
class MockAdapter implements AnalyticsAdapter {
  name = 'mock-adapter'
  version = '1.0.0'
  trackCalls: EventPayload[] = []
  identifyCalls: Array<{ userId: string; traits: Record<string, any> }> = []

  isEnabled(): boolean {
    return true
  }

  checkConsent(): boolean {
    return true
  }

  async track(event: EventPayload): Promise<void> {
    this.trackCalls.push(event)
  }

  async identify(userId: string, traits: Record<string, any>): Promise<void> {
    this.identifyCalls.push({ userId, traits })
  }
}

describe('EventBus', () => {
  let eventBus: EventBus
  let mockAdapter: MockAdapter

  beforeEach(() => {
    eventBus = new EventBus({
      enableOfflineQueue: false, // Disable for simpler testing
      flushInterval: 60000, // Disable auto-flush
    })
    mockAdapter = new MockAdapter()
    eventBus.addAdapter(mockAdapter)
  })

  describe('adapter management', () => {
    it('should add and remove adapters', () => {
      expect(eventBus.getAdapters()).toHaveLength(1)
      expect(eventBus.getAdapters()[0]).toBe(mockAdapter)

      eventBus.removeAdapter('mock-adapter')
      expect(eventBus.getAdapters()).toHaveLength(0)
    })

    it('should not add disabled adapters', () => {
      const disabledAdapter = new MockAdapter()
      disabledAdapter.isEnabled = vi.fn(() => false)

      eventBus.removeAdapter('mock-adapter') // Remove existing
      eventBus.addAdapter(disabledAdapter)
      
      expect(eventBus.getAdapters()).toHaveLength(0)
    })
  })

  describe('event tracking', () => {
    it('should track events with required fields', async () => {
      await eventBus.track({
        action: 'page_viewed',
        visitor_id: 'visitor_123',
        session_id: 'session_123',
        consent: { analytics: true, ads: false, marketing: false },
        region: 'US',
      })

      expect(mockAdapter.trackCalls).toHaveLength(1)
      
      const trackedEvent = mockAdapter.trackCalls[0]
      expect(trackedEvent.action).toBe('page_viewed')
      expect(trackedEvent.event_id).toBe('event_123')
      expect(trackedEvent.dedup_id).toBe('dedup_123')
      expect(trackedEvent.visitor_id).toBe('visitor_123')
      expect(trackedEvent.session_id).toBe('session_123')
    })

    it('should enrich events with default values', async () => {
      await eventBus.track({
        action: 'button_clicked',
      })

      expect(mockAdapter.trackCalls).toHaveLength(1)
      
      const trackedEvent = mockAdapter.trackCalls[0]
      expect(trackedEvent.occurred_at).toBeDefined()
      expect(trackedEvent.event_id).toBe('event_123')
      expect(trackedEvent.dedup_id).toBe('dedup_123')
    })

    it('should provide convenience methods', async () => {
      await eventBus.pageView({ visitor_id: 'visitor_123' })
      await eventBus.formStart({ visitor_id: 'visitor_123' })
      await eventBus.formSubmit({ visitor_id: 'visitor_123' })
      await eventBus.buttonClick({ visitor_id: 'visitor_123' })

      expect(mockAdapter.trackCalls).toHaveLength(4)
      expect(mockAdapter.trackCalls[0].action).toBe('page_viewed')
      expect(mockAdapter.trackCalls[1].action).toBe('form_started')
      expect(mockAdapter.trackCalls[2].action).toBe('form_submitted')
      expect(mockAdapter.trackCalls[3].action).toBe('button_clicked')
    })
  })

  describe('event listeners', () => {
    it('should notify event listeners', async () => {
      const listener = vi.fn()
      const removeListener = eventBus.addEventListener(listener)

      await eventBus.track({
        action: 'button_clicked' as any,
        visitor_id: 'visitor_123',
        session_id: 'session_123',
        consent: { analytics: true, ads: false, marketing: false },
        region: 'US',
      })

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'button_clicked',
          visitor_id: 'visitor_123',
        })
      )

      // Test listener removal
      removeListener()
      await eventBus.track({
        action: 'link_clicked' as any,
        visitor_id: 'visitor_123',
        session_id: 'session_123',
        consent: { analytics: true, ads: false, marketing: false },
        region: 'US',
      })

      expect(listener).toHaveBeenCalledTimes(1) // Still just once
    })
  })

  describe('identity management', () => {
    it('should call identify on all adapters', async () => {
      await eventBus.identify('user_123', { email: 'test@example.com' })

      expect(mockAdapter.identifyCalls).toHaveLength(1)
      expect(mockAdapter.identifyCalls[0]).toEqual({
        userId: 'user_123',
        traits: { email: 'test@example.com' },
      })
    })
  })

  describe('error handling', () => {
    it('should handle adapter failures gracefully', async () => {
      const failingAdapter = new MockAdapter()
      failingAdapter.name = 'failing-adapter'
      failingAdapter.track = vi.fn().mockRejectedValue(new Error('Adapter failed'))
      
      eventBus.addAdapter(failingAdapter)

      // Should not throw despite adapter failure
      await expect(
        eventBus.track({
          action: 'page_viewed' as any,
          visitor_id: 'visitor_123',
          session_id: 'session_123',
          consent: { analytics: true, ads: false, marketing: false },
          region: 'US',
        })
      ).resolves.not.toThrow()

      // Working adapter should still receive the event
      expect(mockAdapter.trackCalls).toHaveLength(1)
    })

    it('should handle invalid events', async () => {
      // Should not throw for invalid events
      await expect(
        eventBus.track({
          // Missing required fields
        } as any)
      ).resolves.not.toThrow()

      // No events should be tracked
      expect(mockAdapter.trackCalls).toHaveLength(0)
    })
  })
})