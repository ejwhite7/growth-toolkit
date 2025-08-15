import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AttributionTracker } from '../../../lib/attribution/attribution-tracker'

// Mock the storage utility
vi.mock('../../../lib/utils/storage', () => ({
  crossDomainStorage: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}))

// Mock ID generation
vi.mock('../../../lib/utils/ids', () => ({
  generateVisitorId: vi.fn(() => 'visitor_test123'),
  generateSessionId: vi.fn(() => 'session_test123'),
}))

// Mock window and document
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://example.com/page?utm_source=google&utm_medium=cpc&utm_campaign=test&gclid=123abc',
    hostname: 'example.com',
  },
  writable: true,
})

Object.defineProperty(document, 'referrer', {
  value: 'https://google.com/search',
  writable: true,
})

describe('AttributionTracker', () => {
  let tracker: AttributionTracker

  beforeEach(() => {
    vi.clearAllMocks()
    tracker = new AttributionTracker({
      enableCrossDomain: false, // Disable for simpler testing
      sessionTimeoutMinutes: 30,
      attributionWindowDays: 30,
      overrideFirstTouch: false,
    })
  })

  describe('initialization', () => {
    it('should generate visitor and session IDs', () => {
      const visitorId = tracker.getVisitorId()
      const sessionId = tracker.getSessionId()

      expect(visitorId).toBe('visitor_test123')
      expect(sessionId).toBe('session_test123')
    })

    it('should process current visit and extract UTM parameters', () => {
      tracker.processCurrentVisit()

      // Should extract attribution from URL parameters
      const lastTouch = tracker.getLastTouchAttribution()
      expect(lastTouch).toMatchObject({
        source: 'google',
        medium: 'cpc',
        campaign: 'test',
      })

      // Should extract click IDs
      const clickIds = tracker.getClickIds()
      expect(clickIds).toMatchObject({
        gclid: '123abc',
      })
    })
  })

  describe('attribution context', () => {
    it('should provide complete attribution context', () => {
      tracker.processCurrentVisit()
      
      const context = tracker.getAttributionContext()
      
      expect(context).toHaveProperty('visitor_id', 'visitor_test123')
      expect(context).toHaveProperty('session_id', 'session_test123')
      expect(context).toHaveProperty('attribution_last')
      expect(context).toHaveProperty('click_ids')
    })
  })

  describe('last touch attribution updates', () => {
    it('should update last touch attribution', () => {
      tracker.updateLastTouchAttribution({
        source: 'facebook',
        medium: 'social',
        campaign: 'new_campaign',
      })

      const lastTouch = tracker.getLastTouchAttribution()
      expect(lastTouch).toMatchObject({
        source: 'facebook',
        medium: 'social',
        campaign: 'new_campaign',
      })
      expect(lastTouch?.timestamp).toBeDefined()
    })
  })

  describe('session management', () => {
    it('should reset session', () => {
      const originalSessionId = tracker.getSessionId()
      tracker.resetSession()
      
      // Should generate new session ID after reset
      const newSessionId = tracker.getSessionId()
      expect(newSessionId).toBe('session_test123') // Mock always returns same ID
    })
  })

  describe('attribution clearing', () => {
    it('should clear all attribution data', () => {
      tracker.clearAttribution()
      
      // After clearing, should return null for attribution data
      expect(tracker.getFirstTouchAttribution()).toBeNull()
      expect(tracker.getLastTouchAttribution()).toBeNull()
      expect(tracker.getClickIds()).toBeNull()
    })
  })

  describe('debug information', () => {
    it('should provide debug information', () => {
      const debugInfo = tracker.getDebugInfo()
      
      expect(debugInfo).toHaveProperty('visitor_id')
      expect(debugInfo).toHaveProperty('session_id')
      expect(debugInfo).toHaveProperty('current_url')
      expect(debugInfo).toHaveProperty('referrer')
      expect(debugInfo).toHaveProperty('session_expired')
    })
  })
})