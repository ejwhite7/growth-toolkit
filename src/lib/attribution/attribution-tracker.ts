import { Attribution, ClickIds } from '../types'
import { parseUrlParams, createAttribution, extractClickIds, getSourceFromReferrer, getMediumFromReferrer, STORAGE_KEYS } from '../utils/attribution'
import { crossDomainStorage } from '../utils/storage'
import { generateVisitorId, generateSessionId } from '../utils/ids'

export interface AttributionConfig {
  enableCrossDomain: boolean
  sessionTimeoutMinutes: number
  attributionWindowDays: number
  overrideFirstTouch: boolean
}

export class AttributionTracker {
  private config: AttributionConfig
  private isInitialized = false

  constructor(config: Partial<AttributionConfig> = {}) {
    this.config = {
      enableCrossDomain: true,
      sessionTimeoutMinutes: 30,
      attributionWindowDays: 30,
      overrideFirstTouch: false,
      ...config,
    }
  }

  public initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') return

    this.processCurrentVisit()
    this.setupEventListeners()
    this.isInitialized = true
  }

  public getVisitorId(): string {
    let visitorId = crossDomainStorage.getItem<string>(STORAGE_KEYS.VISITOR_ID)
    
    if (!visitorId) {
      visitorId = generateVisitorId()
      crossDomainStorage.setItem(
        STORAGE_KEYS.VISITOR_ID, 
        visitorId, 
        this.config.attributionWindowDays * 24, // Convert days to hours
        this.config.enableCrossDomain
      )
    }
    
    return visitorId
  }

  public getSessionId(): string {
    let sessionId = crossDomainStorage.getItem<string>(STORAGE_KEYS.SESSION_ID)
    
    if (!sessionId || this.isSessionExpired()) {
      sessionId = generateSessionId()
      crossDomainStorage.setItem(
        STORAGE_KEYS.SESSION_ID, 
        sessionId,
        this.config.sessionTimeoutMinutes / 60, // Convert minutes to hours
        this.config.enableCrossDomain
      )
      this.updateSessionTimestamp()
    }
    
    return sessionId
  }

  public getFirstTouchAttribution(): Attribution | null {
    return crossDomainStorage.getItem<Attribution>(STORAGE_KEYS.FIRST_TOUCH)
  }

  public getLastTouchAttribution(): Attribution | null {
    return crossDomainStorage.getItem<Attribution>(STORAGE_KEYS.LAST_TOUCH)
  }

  public getClickIds(): ClickIds | null {
    return crossDomainStorage.getItem<ClickIds>(STORAGE_KEYS.CLICK_IDS)
  }

  public processCurrentVisit(): void {
    const currentUrl = window.location.href
    const referrer = document.referrer
    
    // Parse URL parameters
    const urlParams = parseUrlParams(currentUrl)
    const clickIds = extractClickIds(currentUrl)
    
    // Store click IDs if present
    if (Object.values(clickIds).some(Boolean)) {
      crossDomainStorage.setItem(
        STORAGE_KEYS.CLICK_IDS, 
        clickIds,
        this.config.attributionWindowDays * 24,
        this.config.enableCrossDomain
      )
    }

    // Create attribution from URL params or referrer
    let attribution: Attribution
    
    if (urlParams.utm_source || urlParams.utm_medium || urlParams.utm_campaign) {
      // Use UTM parameters
      attribution = createAttribution(urlParams, referrer)
    } else if (referrer && this.isExternalReferrer(referrer)) {
      // Use referrer-based attribution
      attribution = createAttribution({
        utm_source: getSourceFromReferrer(referrer),
        utm_medium: getMediumFromReferrer(referrer),
      }, referrer)
    } else {
      // Direct traffic or internal navigation
      attribution = createAttribution({
        utm_source: 'direct',
        utm_medium: 'direct',
      })
    }

    // Set first-touch attribution (only if not exists or explicitly overriding)
    const existingFirstTouch = this.getFirstTouchAttribution()
    if (!existingFirstTouch || this.config.overrideFirstTouch) {
      crossDomainStorage.setItem(
        STORAGE_KEYS.FIRST_TOUCH, 
        attribution,
        this.config.attributionWindowDays * 24,
        this.config.enableCrossDomain
      )
    }

    // Always update last-touch attribution
    crossDomainStorage.setItem(
      STORAGE_KEYS.LAST_TOUCH, 
      attribution,
      this.config.attributionWindowDays * 24,
      this.config.enableCrossDomain
    )
  }

  public updateLastTouchAttribution(attribution: Partial<Attribution>): void {
    const currentAttribution = this.getLastTouchAttribution()
    const updatedAttribution: Attribution = {
      ...currentAttribution,
      ...attribution,
      timestamp: new Date().toISOString(),
    } as Attribution

    crossDomainStorage.setItem(
      STORAGE_KEYS.LAST_TOUCH, 
      updatedAttribution,
      this.config.attributionWindowDays * 24,
      this.config.enableCrossDomain
    )
  }

  public clearAttribution(): void {
    crossDomainStorage.removeItem(STORAGE_KEYS.FIRST_TOUCH)
    crossDomainStorage.removeItem(STORAGE_KEYS.LAST_TOUCH)
    crossDomainStorage.removeItem(STORAGE_KEYS.CLICK_IDS)
  }

  public resetSession(): void {
    crossDomainStorage.removeItem(STORAGE_KEYS.SESSION_ID)
    crossDomainStorage.removeItem('session_timestamp')
  }

  // Get attribution context for events
  public getAttributionContext(): {
    visitor_id: string
    session_id: string
    attribution_first?: Attribution
    attribution_last?: Attribution
    click_ids?: ClickIds
  } {
    return {
      visitor_id: this.getVisitorId(),
      session_id: this.getSessionId(),
      attribution_first: this.getFirstTouchAttribution() || undefined,
      attribution_last: this.getLastTouchAttribution() || undefined,
      click_ids: this.getClickIds() || undefined,
    }
  }

  // Debug information
  public getDebugInfo(): {
    visitor_id: string
    session_id: string
    first_touch: Attribution | null
    last_touch: Attribution | null
    click_ids: ClickIds | null
    session_expired: boolean
    current_url: string
    referrer: string
  } {
    return {
      visitor_id: this.getVisitorId(),
      session_id: this.getSessionId(),
      first_touch: this.getFirstTouchAttribution(),
      last_touch: this.getLastTouchAttribution(),
      click_ids: this.getClickIds(),
      session_expired: this.isSessionExpired(),
      current_url: typeof window !== 'undefined' ? window.location.href : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    }
  }

  private isExternalReferrer(referrer: string): boolean {
    if (!referrer) return false
    
    try {
      const referrerDomain = new URL(referrer).hostname
      const currentDomain = window.location.hostname
      return referrerDomain !== currentDomain
    } catch {
      return false
    }
  }

  private isSessionExpired(): boolean {
    const lastActivity = crossDomainStorage.getItem<number>('session_timestamp')
    if (!lastActivity) return true
    
    const timeoutMs = this.config.sessionTimeoutMinutes * 60 * 1000
    return Date.now() - lastActivity > timeoutMs
  }

  private updateSessionTimestamp(): void {
    crossDomainStorage.setItem(
      'session_timestamp', 
      Date.now(),
      this.config.sessionTimeoutMinutes / 60,
      this.config.enableCrossDomain
    )
  }

  private setupEventListeners(): void {
    // Update session timestamp on user activity
    const updateActivity = () => {
      this.updateSessionTimestamp()
    }

    // Listen to various user activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        updateActivity()
      }
    })

    // Handle beforeunload to clean up
    window.addEventListener('beforeunload', () => {
      this.updateSessionTimestamp()
    })
  }
}

// Singleton instance
let attributionTrackerInstance: AttributionTracker | null = null

export function getAttributionTracker(config?: Partial<AttributionConfig>): AttributionTracker {
  if (!attributionTrackerInstance) {
    attributionTrackerInstance = new AttributionTracker(config)
  }
  return attributionTrackerInstance
}

// Hook for React components
export function useAttribution() {
  const tracker = getAttributionTracker()
  
  return {
    visitorId: tracker.getVisitorId(),
    sessionId: tracker.getSessionId(),
    firstTouch: tracker.getFirstTouchAttribution(),
    lastTouch: tracker.getLastTouchAttribution(),
    clickIds: tracker.getClickIds(),
    context: tracker.getAttributionContext(),
    debugInfo: tracker.getDebugInfo(),
    updateLastTouch: tracker.updateLastTouchAttribution.bind(tracker),
    clearAttribution: tracker.clearAttribution.bind(tracker),
    resetSession: tracker.resetSession.bind(tracker),
  }
}