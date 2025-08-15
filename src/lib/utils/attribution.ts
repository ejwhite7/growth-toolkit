import { Attribution, ClickIds } from '../types'

export interface UtmParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

export function parseUrlParams(url: string): UtmParams & ClickIds {
  const urlObj = new URL(url)
  const params = urlObj.searchParams
  
  return {
    // UTM parameters
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_term: params.get('utm_term') || undefined,
    utm_content: params.get('utm_content') || undefined,
    
    // Click IDs
    gclid: params.get('gclid') || undefined,
    fbclid: params.get('fbclid') || undefined,
    ttclid: params.get('ttclid') || undefined,
    msclkid: params.get('msclkid') || undefined,
  }
}

export function createAttribution(
  utmParams: UtmParams,
  referrer?: string
): Attribution {
  return {
    source: utmParams.utm_source,
    medium: utmParams.utm_medium,
    campaign: utmParams.utm_campaign,
    term: utmParams.utm_term,
    content: utmParams.utm_content,
    referrer,
    timestamp: new Date().toISOString(),
  }
}

export function extractClickIds(url: string): ClickIds {
  const parsed = parseUrlParams(url)
  return {
    gclid: parsed.gclid,
    fbclid: parsed.fbclid,
    ttclid: parsed.ttclid,
    msclkid: parsed.msclkid,
  }
}

export function getSourceFromReferrer(referrer: string): string {
  if (!referrer) return 'direct'
  
  try {
    const domain = new URL(referrer).hostname.toLowerCase()
    
    // Social media sources
    if (domain.includes('facebook.com') || domain.includes('fb.com')) return 'facebook'
    if (domain.includes('twitter.com') || domain.includes('x.com')) return 'twitter'
    if (domain.includes('linkedin.com')) return 'linkedin'
    if (domain.includes('youtube.com')) return 'youtube'
    if (domain.includes('instagram.com')) return 'instagram'
    if (domain.includes('tiktok.com')) return 'tiktok'
    
    // Search engines
    if (domain.includes('google.com')) return 'google'
    if (domain.includes('bing.com')) return 'bing'
    if (domain.includes('yahoo.com')) return 'yahoo'
    if (domain.includes('duckduckgo.com')) return 'duckduckgo'
    
    // Default to domain
    return domain.replace('www.', '')
  } catch {
    return 'unknown'
  }
}

export function getMediumFromReferrer(referrer: string): string {
  if (!referrer) return 'direct'
  
  const source = getSourceFromReferrer(referrer)
  
  // Search engines
  if (['google', 'bing', 'yahoo', 'duckduckgo'].includes(source)) {
    return 'organic'
  }
  
  // Social media
  if (['facebook', 'twitter', 'linkedin', 'youtube', 'instagram', 'tiktok'].includes(source)) {
    return 'social'
  }
  
  return 'referral'
}

export const STORAGE_KEYS = {
  FIRST_TOUCH: 'growth_toolkit_first_touch',
  LAST_TOUCH: 'growth_toolkit_last_touch',
  CLICK_IDS: 'growth_toolkit_click_ids',
  VISITOR_ID: 'growth_toolkit_visitor_id',
  SESSION_ID: 'growth_toolkit_session_id',
} as const