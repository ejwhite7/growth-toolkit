import { PersistenceAdapter, EventPayload, ConsentState } from '../../types'
import { createClient } from '../../supabase/server'
import { Database } from '../../../types/database'

type Tables = Database['public']['Tables']

export class SupabasePersistenceAdapter implements PersistenceAdapter {
  public readonly name = 'supabase'
  public readonly version = '1.0.0'

  private enabled: boolean = true

  constructor(config: Record<string, any> = {}) {
    this.enabled = config.enabled !== false
  }

  public isEnabled(): boolean {
    return this.enabled
  }

  public checkConsent(consent: ConsentState, region: string): boolean {
    // Always allow persistence for core functionality
    return true
  }

  public async upsertVisitor(visitor: { id: string; metadata?: any }): Promise<void> {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('visitors')
      .upsert({
        id: visitor.id,
        metadata: visitor.metadata || {},
        last_seen_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })

    if (error) {
      throw new Error(`Failed to upsert visitor: ${error.message}`)
    }
  }

  public async upsertSession(session: { 
    id: string; 
    visitor_id: string; 
    region: string; 
    metadata?: any 
  }): Promise<void> {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('sessions')
      .upsert({
        id: session.id,
        visitor_id: session.visitor_id,
        region: session.region,
        metadata: session.metadata || {},
        started_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })

    if (error) {
      throw new Error(`Failed to upsert session: ${error.message}`)
    }
  }

  public async upsertProfile(profile: {
    id?: string
    visitor_id: string
    email?: string
    first_name?: string
    last_name?: string
    company?: string
    title?: string
    phone?: string
    metadata?: any
  }): Promise<string> {
    const supabase = await createClient()
    
    const profileData: Tables['profiles']['Insert'] = {
      visitor_id: profile.visitor_id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      company: profile.company,
      title: profile.title,
      phone: profile.phone,
      metadata: profile.metadata || {},
      updated_at: new Date().toISOString(),
    }

    if (profile.id) {
      profileData.id = profile.id
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(profileData, {
        onConflict: 'visitor_id'
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to upsert profile: ${error.message}`)
    }

    return data.id
  }

  public async recordEvent(event: EventPayload): Promise<void> {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('events')
      .insert({
        id: event.event_id,
        occurred_at: event.occurred_at,
        experience_id: event.experience_id || null,
        session_id: event.session_id,
        visitor_id: event.visitor_id,
        profile_id: event.profile_id || null,
        action: event.action,
        step: event.step || null,
        label: event.label || null,
        value: event.value || null,
        variant: event.variant || null,
        payload: {
          ...event.payload,
          attribution_first: event.attribution_first,
          attribution_last: event.attribution_last,
          click_ids: event.click_ids,
          device: event.device,
          geo: event.geo,
          identity: event.identity,
          enrichment: event.enrichment,
          alert_meta: event.alert_meta,
        },
        consent: event.consent,
        region: event.region,
        dedup_id: event.dedup_id,
      })

    if (error) {
      throw new Error(`Failed to record event: ${error.message}`)
    }
  }

  public async recordSubmission(submission: {
    experience_id: string
    profile_id: string
    payload: any
  }): Promise<void> {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('submissions')
      .insert({
        experience_id: submission.experience_id,
        profile_id: submission.profile_id,
        payload: submission.payload,
        occurred_at: new Date().toISOString(),
      })

    if (error) {
      throw new Error(`Failed to record submission: ${error.message}`)
    }
  }

  public async saveIdentity(identity: {
    visitor_id: string
    provider: string
    payload: any
    confidence: number
  }): Promise<void> {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('identities')
      .insert({
        visitor_id: identity.visitor_id,
        provider: identity.provider,
        payload: identity.payload,
        confidence: identity.confidence,
        resolved_at: new Date().toISOString(),
      })

    if (error) {
      throw new Error(`Failed to save identity: ${error.message}`)
    }
  }

  public async saveEnrichment(enrichment: {
    profile_id: string
    provider: string
    payload: any
  }): Promise<void> {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('enrichments')
      .insert({
        profile_id: enrichment.profile_id,
        provider: enrichment.provider,
        payload: enrichment.payload,
        applied_at: new Date().toISOString(),
      })

    if (error) {
      throw new Error(`Failed to save enrichment: ${error.message}`)
    }
  }

  public async saveAlert(alert: {
    rule_id: string
    event_id: string
    channel: string
    throttled?: boolean
  }): Promise<void> {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('slack_alerts')
      .insert({
        rule_id: alert.rule_id,
        event_id: alert.event_id,
        channel: alert.channel,
        throttled: alert.throttled || false,
        sent_at: new Date().toISOString(),
      })

    if (error) {
      throw new Error(`Failed to save alert: ${error.message}`)
    }
  }

  public async saveAttribution(attribution: {
    visitor_id: string
    kind: 'first' | 'last'
    source?: string
    medium?: string
    campaign?: string
    term?: string
    content?: string
    referrer?: string
    click_ids?: any
  }): Promise<void> {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('attributions')
      .upsert({
        visitor_id: attribution.visitor_id,
        kind: attribution.kind,
        source: attribution.source || null,
        medium: attribution.medium || null,
        campaign: attribution.campaign || null,
        term: attribution.term || null,
        content: attribution.content || null,
        referrer: attribution.referrer || null,
        click_ids: attribution.click_ids || {},
        timestamp: new Date().toISOString(),
      }, {
        onConflict: 'visitor_id,kind'
      })

    if (error) {
      throw new Error(`Failed to save attribution: ${error.message}`)
    }
  }

  // Helper methods for querying data
  public async getProfile(visitorId: string): Promise<Tables['profiles']['Row'] | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('visitor_id', visitorId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(`Failed to get profile: ${error.message}`)
    }

    return data
  }

  public async getAttribution(visitorId: string, kind: 'first' | 'last'): Promise<Tables['attributions']['Row'] | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('attributions')
      .select('*')
      .eq('visitor_id', visitorId)
      .eq('kind', kind)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get attribution: ${error.message}`)
    }

    return data
  }

  public async getExperience(slug: string): Promise<Tables['experiences']['Row'] | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('experiences')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get experience: ${error.message}`)
    }

    return data
  }
}