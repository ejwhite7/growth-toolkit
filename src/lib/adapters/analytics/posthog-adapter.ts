import { EventPayload } from '../../types'
import { BaseAnalyticsAdapter } from './base-analytics-adapter'

declare global {
  interface Window {
    posthog: any
  }
}

export interface PostHogConfig {
  apiKey: string
  host?: string
  enabled?: boolean
  autocapture?: boolean
  capturePageviews?: boolean
  debugMode?: boolean
}

export class PostHogAdapter extends BaseAnalyticsAdapter {
  public readonly name = 'posthog'
  public readonly version = '1.0.0'

  private apiKey: string
  private host: string
  private autocapture: boolean
  private capturePageviews: boolean
  private debugMode: boolean

  constructor(config: PostHogConfig) {
    super(config)
    this.apiKey = config.apiKey
    this.host = config.host || 'https://app.posthog.com'
    this.autocapture = config.autocapture !== false
    this.capturePageviews = config.capturePageviews !== false
    this.debugMode = config.debugMode || false
    
    if (this.isEnabled() && typeof window !== 'undefined') {
      this.initializePostHog()
    }
  }

  protected hasRequiredConfig(): boolean {
    return Boolean(this.apiKey)
  }

  public async track(event: EventPayload): Promise<void> {
    if (typeof window === 'undefined' || !window.posthog) {
      if (this.debugMode) {
        console.warn('PostHog: posthog not available')
      }
      return
    }

    const postHogEvent = this.mapEventToPostHog(event)
    
    return this.safeExecute(async () => {
      window.posthog.capture(postHogEvent.name, postHogEvent.properties)
      
      if (this.debugMode) {
        console.log('PostHog: Event tracked:', postHogEvent)
      }
    }, 'track') as Promise<void>
  }

  public async identify(userId: string, traits: Record<string, any>): Promise<void> {
    if (typeof window === 'undefined' || !window.posthog) return

    return this.safeExecute(async () => {
      window.posthog.identify(userId, traits)
      
      if (this.debugMode) {
        console.log('PostHog: User identified:', { userId, traits })
      }
    }, 'identify') as Promise<void>
  }

  public async group(groupId: string, traits: Record<string, any>): Promise<void> {
    if (typeof window === 'undefined' || !window.posthog) return

    return this.safeExecute(async () => {
      window.posthog.group('company', groupId, traits)
      
      if (this.debugMode) {
        console.log('PostHog: Group identified:', { groupId, traits })
      }
    }, 'group') as Promise<void>
  }

  public async alias(userId: string, previousId: string): Promise<void> {
    if (typeof window === 'undefined' || !window.posthog) return

    return this.safeExecute(async () => {
      window.posthog.alias(userId, previousId)
      
      if (this.debugMode) {
        console.log('PostHog: Alias created:', { userId, previousId })
      }
    }, 'alias') as Promise<void>
  }

  private initializePostHog(): void {
    // Load PostHog script
    const script = document.createElement('script')
    script.async = true
    script.src = `${this.host}/static/array.js`
    document.head.appendChild(script)

    // Initialize PostHog
    ;(function(h: any, o: any) {
      h.posthog = h.posthog || []
      const i = function(s: any, r?: any) {
        h.posthog[s] = function() {
          h.posthog.push([s, ...arguments])
        }
      }
      const t = [
        'init', 'identify', 'capture', 'group', 'alias', 
        'set', 'setPersonProperties', 'getFeatureFlags'
      ]
      t.forEach(i)
    })(window, document)

    window.posthog.init(this.apiKey, {
      api_host: this.host,
      autocapture: this.autocapture,
      capture_pageview: this.capturePageviews,
      debug: this.debugMode,
      loaded: (posthog: any) => {
        if (this.debugMode) {
          console.log('PostHog: Initialized')
        }
      }
    })
  }

  private mapEventToPostHog(event: EventPayload): { name: string; properties: Record<string, any> } {
    const properties: Record<string, any> = {
      $event_id: event.event_id,
      visitor_id: event.visitor_id,
      session_id: event.session_id,
      $current_url: typeof window !== 'undefined' ? window.location.href : undefined,
      $timestamp: event.occurred_at,
    }

    // Add experience context
    if (event.experience_id) {
      properties.experience_id = event.experience_id
      properties.experience_type = event.experience_type
    }

    // Add form context
    if (event.step) properties.form_step = event.step
    if (event.label) properties.form_label = event.label
    if (event.value !== undefined) properties.value = event.value
    if (event.variant) properties.variant = event.variant

    // Add attribution with PostHog naming conventions
    if (event.attribution_first) {
      properties.$initial_utm_source = event.attribution_first.source
      properties.$initial_utm_medium = event.attribution_first.medium
      properties.$initial_utm_campaign = event.attribution_first.campaign
      properties.$initial_utm_term = event.attribution_first.term
      properties.$initial_utm_content = event.attribution_first.content
      properties.$initial_referrer = event.attribution_first.referrer
    }

    if (event.attribution_last) {
      properties.utm_source = event.attribution_last.source
      properties.utm_medium = event.attribution_last.medium
      properties.utm_campaign = event.attribution_last.campaign
      properties.utm_term = event.attribution_last.term
      properties.utm_content = event.attribution_last.content
      properties.$referrer = event.attribution_last.referrer
    }

    // Add click IDs
    if (event.click_ids) {
      Object.entries(event.click_ids).forEach(([key, value]) => {
        if (value) properties[key] = value
      })
    }

    // Add device and geo info
    if (event.device) {
      properties.$os = event.device.os
      properties.$browser = event.device.browser
    }

    if (event.geo) {
      properties.$geoip_country_code = event.geo.country
      properties.$geoip_subdivision_1_code = event.geo.region
    }

    // Add identity and enrichment data
    if (event.identity) {
      properties.company_domain = event.identity.company_domain
      properties.company_name = event.identity.company_name
      properties.employee_count = event.identity.employee_count
      properties.industry = event.identity.industry
      properties.identity_confidence = event.identity.confidence
      properties.identity_provider = event.identity.provider
    }

    if (event.enrichment) {
      properties.job_title = event.enrichment.title
      properties.seniority = event.enrichment.seniority
      properties.department = event.enrichment.department
      properties.linkedin_url = event.enrichment.linkedin_url
      properties.company_size_bucket = event.enrichment.company_size_bucket
      properties.tech_tags = event.enrichment.tech_tags
      properties.enrichment_provider = event.enrichment.provider
    }

    // Add custom payload data
    if (event.payload) {
      Object.entries(event.payload).forEach(([key, value]) => {
        properties[key] = value
      })
    }

    return {
      name: event.action,
      properties
    }
  }
}