import { AnalyticsAdapter, ConsentState, EventPayload } from '../../types'

export abstract class BaseAnalyticsAdapter implements AnalyticsAdapter {
  public abstract readonly name: string
  public abstract readonly version: string
  
  protected config: Record<string, any>
  protected enabled: boolean = true

  constructor(config: Record<string, any> = {}) {
    this.config = config
    this.enabled = config.enabled !== false
  }

  public isEnabled(): boolean {
    return this.enabled && this.hasRequiredConfig()
  }

  public checkConsent(consent: ConsentState, region: string): boolean {
    // Default consent checking - can be overridden
    if (region === 'EU' || region === 'GDPR') {
      return consent.analytics === true
    }
    
    // For non-GDPR regions, default to opt-out
    return consent.analytics !== false
  }

  // Abstract methods that must be implemented
  public abstract track(event: EventPayload): Promise<void>
  public abstract identify(userId: string, traits: Record<string, any>): Promise<void>

  // Optional methods with default implementations
  public async group?(groupId: string, traits: Record<string, any>): Promise<void> {
    // Default implementation - can be overridden
  }

  public async alias?(userId: string, previousId: string): Promise<void> {
    // Default implementation - can be overridden
  }

  // Protected helper methods
  protected abstract hasRequiredConfig(): boolean

  protected mapEventToProvider(event: EventPayload): Record<string, any> {
    // Default mapping - can be overridden
    return {
      event: event.action,
      properties: {
        ...event.payload,
        event_id: event.event_id,
        experience_id: event.experience_id,
        experience_type: event.experience_type,
        step: event.step,
        label: event.label,
        value: event.value,
        variant: event.variant,
        visitor_id: event.visitor_id,
        session_id: event.session_id,
        profile_id: event.profile_id,
        region: event.region,
        occurred_at: event.occurred_at,
        attribution_first: event.attribution_first,
        attribution_last: event.attribution_last,
        click_ids: event.click_ids,
        device: event.device,
        geo: event.geo,
      },
      timestamp: event.occurred_at,
    }
  }

  protected async safeExecute<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T | null> {
    try {
      return await operation()
    } catch (error) {
      console.error(`${this.name} ${operationName} failed:`, error)
      return null
    }
  }
}