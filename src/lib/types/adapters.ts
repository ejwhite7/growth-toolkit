import { ConsentState, EventPayload, IdentityInfo, EnrichmentInfo } from './events'

export interface BaseAdapter {
  name: string
  version: string
  isEnabled(): boolean
  checkConsent(consent: ConsentState, region: string): boolean
}

export interface AnalyticsAdapter extends BaseAdapter {
  track(event: EventPayload): Promise<void>
  identify(userId: string, traits: Record<string, any>): Promise<void>
  group?(groupId: string, traits: Record<string, any>): Promise<void>
  alias?(userId: string, previousId: string): Promise<void>
}

export interface DeAnonymizationAdapter extends BaseAdapter {
  resolve(context: {
    ip?: string
    userAgent?: string
    url?: string
    referrer?: string
  }): Promise<IdentityInfo | null>
}

export interface EnrichmentAdapter extends BaseAdapter {
  enrich(profile: {
    email?: string
    domain?: string
    first_name?: string
    last_name?: string
    company?: string
  }): Promise<EnrichmentInfo | null>
}

export interface SlackAdapter extends BaseAdapter {
  send(
    channel: string, 
    message: string, 
    options?: {
      thread_ts?: string
      blocks?: any[]
      attachments?: any[]
    }
  ): Promise<{ ok: boolean; ts?: string }>
}

export interface PersistenceAdapter extends BaseAdapter {
  // Core entities
  upsertVisitor(visitor: { id: string; metadata?: any }): Promise<void>
  upsertSession(session: { 
    id: string; 
    visitor_id: string; 
    region: string; 
    metadata?: any 
  }): Promise<void>
  upsertProfile(profile: {
    id?: string
    visitor_id: string
    email?: string
    first_name?: string
    last_name?: string
    company?: string
    title?: string
    phone?: string
    metadata?: any
  }): Promise<string> // Returns profile ID
  
  // Events and submissions
  recordEvent(event: EventPayload): Promise<void>
  recordSubmission(submission: {
    experience_id: string
    profile_id: string
    payload: any
  }): Promise<void>
  
  // Identity and enrichment
  saveIdentity(identity: {
    visitor_id: string
    provider: string
    payload: any
    confidence: number
  }): Promise<void>
  saveEnrichment(enrichment: {
    profile_id: string
    provider: string
    payload: any
  }): Promise<void>
  
  // Alerts
  saveAlert(alert: {
    rule_id: string
    event_id: string
    channel: string
    throttled?: boolean
  }): Promise<void>
  
  // Attribution
  saveAttribution(attribution: {
    visitor_id: string
    kind: 'first' | 'last'
    source?: string
    medium?: string
    campaign?: string
    term?: string
    content?: string
    referrer?: string
    click_ids?: any
  }): Promise<void>
}

export interface ConsentProvider extends BaseAdapter {
  getState(): Promise<{
    analytics: boolean
    ads: boolean
    marketing: boolean
    region: string
  }>
  
  updateConsent(updates: Partial<ConsentState>): Promise<void>
  
  onConsentChange(callback: (state: ConsentState & { region: string }) => void): () => void
}

export type AdapterType = 
  | 'analytics'
  | 'identity' 
  | 'enrichment'
  | 'alerts'
  | 'persistence'
  | 'consent'

export interface AdapterConfig {
  type: AdapterType
  name: string
  enabled: boolean
  config: Record<string, any>
}