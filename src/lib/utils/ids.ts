import { ulid } from 'ulid'

export function generateId(): string {
  return ulid()
}

export function generateVisitorId(): string {
  return `visitor_${ulid()}`
}

export function generateSessionId(): string {
  return `session_${ulid()}`
}

export function generateProfileId(): string {
  return `profile_${ulid()}`
}

export function generateEventId(): string {
  return `event_${ulid()}`
}

export function generateExperienceId(): string {
  return `experience_${ulid()}`
}

export function generateDedupId(data: {
  visitor_id: string
  action: string
  experience_id?: string
  timestamp?: string
}): string {
  const key = [
    data.visitor_id,
    data.action,
    data.experience_id || 'no_experience',
    data.timestamp || Date.now().toString()
  ].join('|')
  
  return btoa(key).replace(/[/+=]/g, '').toLowerCase()
}