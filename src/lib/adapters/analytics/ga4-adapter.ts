import { EventPayload } from '../../types'
import { BaseAnalyticsAdapter } from './base-analytics-adapter'

declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

export interface GA4Config {
  measurementId: string
  enabled?: boolean
  customDimensions?: Record<string, string>
  debugMode?: boolean
}

export class GA4Adapter extends BaseAnalyticsAdapter {
  public readonly name = 'ga4'
  public readonly version = '1.0.0'

  private measurementId: string
  private customDimensions: Record<string, string>
  private debugMode: boolean

  constructor(config: GA4Config) {
    super(config)
    this.measurementId = config.measurementId
    this.customDimensions = config.customDimensions || {}
    this.debugMode = config.debugMode || false
    
    if (this.isEnabled() && typeof window !== 'undefined') {
      this.initializeGA4()
    }
  }

  protected hasRequiredConfig(): boolean {
    return Boolean(this.measurementId)
  }

  public async track(event: EventPayload): Promise<void> {
    if (typeof window === 'undefined' || !window.gtag) {
      if (this.debugMode) {
        console.warn('GA4: gtag not available')
      }
      return
    }

    const gaEvent = this.mapEventToGA4(event)
    
    return this.safeExecute(async () => {
      window.gtag('event', gaEvent.name, gaEvent.parameters)
      
      if (this.debugMode) {
        console.log('GA4: Event tracked:', gaEvent)
      }
    }, 'track') as Promise<void>
  }

  public async identify(userId: string, traits: Record<string, any>): Promise<void> {
    if (typeof window === 'undefined' || !window.gtag) return

    return this.safeExecute(async () => {
      // Set user ID
      window.gtag('config', this.measurementId, {
        user_id: userId,
        custom_map: this.customDimensions,
      })

      // Set user properties
      const userProperties: Record<string, any> = {}
      
      // Map common traits to GA4 user properties
      if (traits.email) userProperties.email = traits.email
      if (traits.first_name) userProperties.first_name = traits.first_name
      if (traits.last_name) userProperties.last_name = traits.last_name
      if (traits.company) userProperties.company = traits.company
      if (traits.title) userProperties.title = traits.title

      // Add custom dimensions
      Object.entries(this.customDimensions).forEach(([trait, dimension]) => {
        if (traits[trait]) {
          userProperties[dimension] = traits[trait]
        }
      })

      if (Object.keys(userProperties).length > 0) {
        window.gtag('set', { user_properties: userProperties })
      }

      if (this.debugMode) {
        console.log('GA4: User identified:', { userId, userProperties })
      }
    }, 'identify') as Promise<void>
  }

  private initializeGA4(): void {
    // Load Google Analytics script
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`
    document.head.appendChild(script)

    // Initialize dataLayer and gtag
    window.dataLayer = window.dataLayer || []
    window.gtag = function(...args: any[]) {
      window.dataLayer.push(args)
    }
    
    window.gtag('js', new Date())
    window.gtag('config', this.measurementId, {
      debug_mode: this.debugMode,
      send_page_view: false, // We'll handle page views manually
    })

    if (this.debugMode) {
      console.log('GA4: Initialized with measurement ID:', this.measurementId)
    }
  }

  private mapEventToGA4(event: EventPayload): { name: string; parameters: Record<string, any> } {
    const parameters: Record<string, any> = {
      event_id: event.event_id,
      visitor_id: event.visitor_id,
      session_id: event.session_id,
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
      page_title: typeof document !== 'undefined' ? document.title : undefined,
    }

    // Add experience context
    if (event.experience_id) {
      parameters.experience_id = event.experience_id
      parameters.experience_type = event.experience_type
    }

    // Add form context
    if (event.step) parameters.form_step = event.step
    if (event.label) parameters.form_label = event.label
    if (event.value !== undefined) parameters.value = event.value
    if (event.variant) parameters.variant = event.variant

    // Add attribution
    if (event.attribution_first) {
      parameters.first_source = event.attribution_first.source
      parameters.first_medium = event.attribution_first.medium
      parameters.first_campaign = event.attribution_first.campaign
    }

    if (event.attribution_last) {
      parameters.source = event.attribution_last.source
      parameters.medium = event.attribution_last.medium
      parameters.campaign = event.attribution_last.campaign
    }

    // Add click IDs
    if (event.click_ids) {
      Object.entries(event.click_ids).forEach(([key, value]) => {
        if (value) parameters[key] = value
      })
    }

    // Add custom payload data
    if (event.payload) {
      Object.entries(event.payload).forEach(([key, value]) => {
        // Ensure GA4 parameter naming conventions
        const paramKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '_')
        parameters[paramKey] = value
      })
    }

    // Map actions to GA4 event names
    const eventName = this.mapActionToGA4EventName(event.action)

    return { name: eventName, parameters }
  }

  private mapActionToGA4EventName(action: string): string {
    const mapping: Record<string, string> = {
      page_viewed: 'page_view',
      form_started: 'begin_form',
      form_submitted: 'generate_lead',
      form_abandoned: 'abandon_form',
      field_focused: 'form_field_focus',
      field_completed: 'form_field_complete',
      button_clicked: 'click',
      link_clicked: 'click',
      video_started: 'video_start',
      video_progress: 'video_progress',
      video_completed: 'video_complete',
      download_started: 'file_download',
      download_completed: 'file_download',
      quiz_started: 'begin_quiz',
      quiz_question_answered: 'quiz_progress',
      quiz_completed: 'complete_quiz',
      demo_requested: 'request_demo',
      webinar_registered: 'sign_up',
      search_performed: 'search',
      filter_applied: 'filter',
      card_clicked: 'select_content',
    }

    return mapping[action] || action
  }
}