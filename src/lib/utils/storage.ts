export interface StorageItem<T> {
  value: T
  expires_at?: number
  created_at: number
}

export class SafeStorage {
  private isClient = typeof window !== 'undefined'
  
  setItem<T>(key: string, value: T, ttlHours?: number): void {
    if (!this.isClient) return
    
    try {
      const item: StorageItem<T> = {
        value,
        created_at: Date.now(),
        expires_at: ttlHours ? Date.now() + (ttlHours * 60 * 60 * 1000) : undefined,
      }
      
      localStorage.setItem(key, JSON.stringify(item))
    } catch (error) {
      console.warn('Failed to set localStorage item:', error)
    }
  }
  
  getItem<T>(key: string): T | null {
    if (!this.isClient) return null
    
    try {
      const itemStr = localStorage.getItem(key)
      if (!itemStr) return null
      
      const item: StorageItem<T> = JSON.parse(itemStr)
      
      // Check if expired
      if (item.expires_at && Date.now() > item.expires_at) {
        this.removeItem(key)
        return null
      }
      
      return item.value
    } catch (error) {
      console.warn('Failed to get localStorage item:', error)
      return null
    }
  }
  
  removeItem(key: string): void {
    if (!this.isClient) return
    
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('Failed to remove localStorage item:', error)
    }
  }
  
  clear(): void {
    if (!this.isClient) return
    
    try {
      localStorage.clear()
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  }
  
  // Get all keys that match a prefix
  getKeys(prefix: string): string[] {
    if (!this.isClient) return []
    
    try {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(prefix)) {
          keys.push(key)
        }
      }
      return keys
    } catch (error) {
      console.warn('Failed to get localStorage keys:', error)
      return []
    }
  }
  
  // Clean up expired items
  cleanup(): void {
    if (!this.isClient) return
    
    try {
      const keys = this.getKeys('growth_toolkit_')
      keys.forEach(key => {
        this.getItem(key) // This will auto-remove expired items
      })
    } catch (error) {
      console.warn('Failed to cleanup localStorage:', error)
    }
  }
}

export const storage = new SafeStorage()

// Cross-domain storage using cookies as fallback
export class CrossDomainStorage {
  private storage = new SafeStorage()
  
  setItem<T>(key: string, value: T, ttlHours?: number, crossDomain = false): void {
    // Always set in localStorage
    this.storage.setItem(key, value, ttlHours)
    
    // Optionally set cookie for cross-domain access
    if (crossDomain && typeof document !== 'undefined') {
      try {
        const expires = ttlHours 
          ? new Date(Date.now() + ttlHours * 60 * 60 * 1000).toUTCString()
          : undefined
        
        const cookieValue = JSON.stringify(value)
        const cookieString = [
          `${key}=${encodeURIComponent(cookieValue)}`,
          expires ? `expires=${expires}` : '',
          'path=/',
          'SameSite=Lax'
        ].filter(Boolean).join('; ')
        
        document.cookie = cookieString
      } catch (error) {
        console.warn('Failed to set cross-domain cookie:', error)
      }
    }
  }
  
  getItem<T>(key: string): T | null {
    // Try localStorage first
    const localValue = this.storage.getItem<T>(key)
    if (localValue !== null) return localValue
    
    // Fallback to cookies
    if (typeof document !== 'undefined') {
      try {
        const cookies = document.cookie.split(';')
        const cookie = cookies.find(c => c.trim().startsWith(`${key}=`))
        
        if (cookie) {
          const value = decodeURIComponent(cookie.split('=')[1])
          return JSON.parse(value)
        }
      } catch (error) {
        console.warn('Failed to read cross-domain cookie:', error)
      }
    }
    
    return null
  }
  
  removeItem(key: string): void {
    this.storage.removeItem(key)
    
    // Remove cookie
    if (typeof document !== 'undefined') {
      try {
        document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      } catch (error) {
        console.warn('Failed to remove cross-domain cookie:', error)
      }
    }
  }
}

export const crossDomainStorage = new CrossDomainStorage()