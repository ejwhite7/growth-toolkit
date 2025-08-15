import { SlackAdapter as ISlackAdapter, ConsentState } from '../../types'

export interface SlackConfig {
  webhookUrl?: string
  token?: string
  enabled?: boolean
  defaultChannel?: string
  debugMode?: boolean
}

export class SlackAdapter implements ISlackAdapter {
  public readonly name = 'slack'
  public readonly version = '1.0.0'

  private webhookUrl?: string
  private token?: string
  private enabled: boolean = true
  private defaultChannel?: string
  private debugMode: boolean = false

  constructor(config: SlackConfig) {
    this.webhookUrl = config.webhookUrl
    this.token = config.token
    this.enabled = config.enabled !== false
    this.defaultChannel = config.defaultChannel
    this.debugMode = config.debugMode || false
  }

  public isEnabled(): boolean {
    return this.enabled && (Boolean(this.webhookUrl) || Boolean(this.token))
  }

  public checkConsent(consent: ConsentState, region: string): boolean {
    // Slack alerts are operational, not requiring marketing consent
    return true
  }

  public async send(
    channel: string, 
    message: string, 
    options?: {
      thread_ts?: string
      blocks?: any[]
      attachments?: any[]
    }
  ): Promise<{ ok: boolean; ts?: string }> {
    if (!this.isEnabled()) {
      throw new Error('Slack adapter is not properly configured')
    }

    try {
      if (this.webhookUrl) {
        return await this.sendViaWebhook(channel, message, options)
      } else if (this.token) {
        return await this.sendViaAPI(channel, message, options)
      } else {
        throw new Error('No Slack webhook URL or token configured')
      }
    } catch (error) {
      if (this.debugMode) {
        console.error('Slack: Failed to send message:', error)
      }
      throw error
    }
  }

  private async sendViaWebhook(
    channel: string, 
    message: string, 
    options?: {
      thread_ts?: string
      blocks?: any[]
      attachments?: any[]
    }
  ): Promise<{ ok: boolean; ts?: string }> {
    if (!this.webhookUrl) {
      throw new Error('Webhook URL not configured')
    }

    const payload: any = {
      channel: channel.startsWith('#') ? channel : `#${channel}`,
      text: message,
      username: 'Growth Toolkit',
      icon_emoji: ':chart_with_upwards_trend:',
    }

    if (options?.thread_ts) {
      payload.thread_ts = options.thread_ts
    }

    if (options?.blocks) {
      payload.blocks = options.blocks
    }

    if (options?.attachments) {
      payload.attachments = options.attachments
    }

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Slack webhook failed: ${response.status} ${errorText}`)
    }

    if (this.debugMode) {
      console.log('Slack: Message sent via webhook:', { channel, message })
    }

    return { ok: true }
  }

  private async sendViaAPI(
    channel: string, 
    message: string, 
    options?: {
      thread_ts?: string
      blocks?: any[]
      attachments?: any[]
    }
  ): Promise<{ ok: boolean; ts?: string }> {
    if (!this.token) {
      throw new Error('API token not configured')
    }

    const payload: any = {
      channel: channel.startsWith('#') ? channel : `#${channel}`,
      text: message,
    }

    if (options?.thread_ts) {
      payload.thread_ts = options.thread_ts
    }

    if (options?.blocks) {
      payload.blocks = JSON.stringify(options.blocks)
    }

    if (options?.attachments) {
      payload.attachments = JSON.stringify(options.attachments)
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!result.ok) {
      throw new Error(`Slack API failed: ${result.error}`)
    }

    if (this.debugMode) {
      console.log('Slack: Message sent via API:', { channel, message, ts: result.ts })
    }

    return { ok: true, ts: result.ts }
  }

  // Helper method to format rich messages
  public formatRichMessage(data: {
    title: string
    message: string
    fields?: Array<{ title: string; value: string; short?: boolean }>
    color?: 'good' | 'warning' | 'danger' | string
    actions?: Array<{ type: string; text: string; url: string }>
  }): { blocks: any[]; attachments: any[] } {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: data.title,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: data.message,
        },
      },
    ]

    // Add fields as sections
    if (data.fields && data.fields.length > 0) {
      const fieldsText = data.fields
        .map(field => `*${field.title}:* ${field.value}`)
        .join('\n')
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: fieldsText,
        },
      })
    }

    // Add actions as buttons
    if (data.actions && data.actions.length > 0) {
      const actionElements = data.actions.map(action => ({
        type: 'button',
        text: {
          type: 'plain_text',
          text: action.text,
        },
        url: action.url,
      }))
      
      blocks.push({
        type: 'actions',
        elements: actionElements,
      } as any)
    }

    const attachments = []
    if (data.color) {
      attachments.push({
        color: data.color,
        blocks: [],
      })
    }

    return { blocks, attachments }
  }

  // Template interpolation helper
  public interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const keys = key.trim().split('.')
      let value = data
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k]
        } else {
          return match // Return original if key not found
        }
      }
      
      return String(value || '')
    })
  }
}