export type ExperienceType = 
  | 'webinar_live' 
  | 'webinar_on_demand' 
  | 'demo' 
  | 'quiz' 
  | 'resource' 
  | 'index'

export type ConsentState = {
  analytics: boolean
  ads: boolean
  marketing: boolean
}

export type Attribution = {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
  referrer?: string
  timestamp: string
}

export type ClickIds = {
  gclid?: string
  fbclid?: string
  ttclid?: string
  msclkid?: string
  [key: string]: string | undefined
}

export type DeviceInfo = {
  ua_hash: string
  os: string
  browser: string
}

export type GeoInfo = {
  country: string
  region?: string
}

export type IdentityInfo = {
  company_domain?: string
  company_name?: string
  employee_count?: number
  revenue_range?: string
  industry?: string
  confidence: number
  provider: string
}

export type EnrichmentInfo = {
  title?: string
  seniority?: string
  department?: string
  linkedin_url?: string
  company_size_bucket?: string
  tech_tags?: string[]
  provider: string
}

export type AlertMeta = {
  rule_id?: string
  channel?: string
  throttled?: boolean
}

export interface BaseEvent {
  event_id: string
  occurred_at: string
  experience_id?: string
  experience_type?: ExperienceType
  action: string
  step?: string
  label?: string
  value?: number
  variant?: string
  
  visitor_id: string
  session_id: string
  profile_id?: string
  
  attribution_first?: Attribution
  attribution_last?: Attribution
  click_ids?: ClickIds
  
  device?: DeviceInfo
  geo?: GeoInfo
  
  consent: ConsentState
  region: string
  
  dedup_id: string
  
  // Extensions for specific event types
  identity?: IdentityInfo
  enrichment?: EnrichmentInfo
  alert_meta?: AlertMeta
  
  // Custom payload for additional data
  payload?: Record<string, any>
}

export type EventAction = 
  | 'page_viewed'
  | 'form_started'
  | 'form_submitted'
  | 'form_abandoned'
  | 'field_focused'
  | 'field_completed'
  | 'button_clicked'
  | 'link_clicked'
  | 'video_started'
  | 'video_progress'
  | 'video_completed'
  | 'download_started'
  | 'download_completed'
  | 'quiz_started'
  | 'quiz_question_answered'
  | 'quiz_completed'
  | 'demo_requested'
  | 'webinar_registered'
  | 'identity_resolved'
  | 'enrichment_requested'
  | 'enrichment_applied'
  | 'profile_updated'
  | 'rule_matched'
  | 'slack_alert_sent'
  | 'consent_updated'
  | 'index_viewed'
  | 'search_performed'
  | 'filter_applied'
  | 'card_clicked'

export interface EventPayload extends BaseEvent {
  action: EventAction
}