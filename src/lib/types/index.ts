// Re-export all types for easy importing
export * from './events'
export * from './adapters'
export * from './experiences'
export * from '../../types/database'

// Common utility types
export type Awaitable<T> = T | Promise<T>

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface FilterParams {
  search?: string
  tags?: string[]
  type?: string
  status?: string
  date_from?: string
  date_to?: string
}

export interface SortParams {
  field: string
  direction: 'asc' | 'desc'
}