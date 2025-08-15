import { DeviceInfo, GeoInfo } from '../types'

export function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      ua_hash: '',
      os: 'unknown',
      browser: 'unknown',
    }
  }
  
  const userAgent = navigator.userAgent
  
  return {
    ua_hash: hashString(userAgent),
    os: getOperatingSystem(userAgent),
    browser: getBrowser(userAgent),
  }
}

export function getOperatingSystem(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('Mac OS')) return 'macOS'
  if (userAgent.includes('Linux')) return 'Linux'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('iOS')) return 'iOS'
  return 'unknown'
}

export function getBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
  if (userAgent.includes('Edg')) return 'Edge'
  if (userAgent.includes('Opera')) return 'Opera'
  return 'unknown'
}

export function hashString(str: string): string {
  let hash = 0
  if (str.length === 0) return hash.toString()
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}

// Geo info would typically come from IP geolocation service
export async function getGeoInfo(): Promise<GeoInfo> {
  // In a real implementation, this would call an IP geolocation service
  // For now, we'll return a default
  return {
    country: 'US',
    region: 'CA',
  }
}

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

export function isTablet(): boolean {
  if (typeof window === 'undefined') return false
  
  return /iPad|Android(?!.*Mobile)|Tablet/i.test(navigator.userAgent)
}

export function getScreenSize(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 }
  }
  
  return {
    width: window.screen.width,
    height: window.screen.height,
  }
}

export function getViewportSize(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 }
  }
  
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}