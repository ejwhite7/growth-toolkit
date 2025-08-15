import { ExperienceType } from './events'

export interface BaseExperience {
  id: string
  type: ExperienceType
  slug: string
  title: string
  description?: string
  tags: string[]
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface WebinarExperience extends BaseExperience {
  type: 'webinar_live' | 'webinar_on_demand'
  metadata: {
    start_time?: string
    duration_minutes?: number
    presenter_name?: string
    presenter_title?: string
    presenter_company?: string
    registration_url?: string
    join_url?: string
    recording_url?: string
    thumbnail_url?: string
    capacity?: number
    registered_count?: number
    status: 'upcoming' | 'live' | 'ended' | 'recorded'
  }
}

export interface DemoExperience extends BaseExperience {
  type: 'demo'
  metadata: {
    duration_minutes?: number
    demo_url?: string
    thumbnail_url?: string
    calendar_link?: string
    requirements?: string[]
    features_highlighted?: string[]
    industry_focus?: string[]
  }
}

export interface QuizExperience extends BaseExperience {
  type: 'quiz'
  metadata: {
    total_questions: number
    estimated_minutes: number
    passing_score?: number
    result_types?: string[]
    questions: QuizQuestion[]
  }
}

export interface ResourceExperience extends BaseExperience {
  type: 'resource'
  metadata: {
    resource_type: 'ebook' | 'whitepaper' | 'case_study' | 'template' | 'checklist' | 'guide'
    file_url?: string
    file_size?: string
    page_count?: number
    download_count?: number
    thumbnail_url?: string
    preview_url?: string
    gated: boolean
  }
}

export interface IndexExperience extends BaseExperience {
  type: 'index'
  metadata: {
    items_count: number
    last_updated: string
    featured_items?: string[]
    categories?: string[]
  }
}

export type Experience = 
  | WebinarExperience 
  | DemoExperience 
  | QuizExperience 
  | ResourceExperience 
  | IndexExperience

export interface QuizQuestion {
  id: string
  type: 'multiple_choice' | 'single_choice' | 'text' | 'rating'
  question: string
  options?: string[]
  required: boolean
  points?: number
  explanation?: string
}

export interface QuizResult {
  score: number
  total_points: number
  percentage: number
  result_type?: string
  recommendations?: string[]
  next_steps?: string[]
}

export interface ProgressiveProfileField {
  name: string
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  validation?: {
    pattern?: string
    min_length?: number
    max_length?: number
  }
  ttl_hours?: number // Time to live for this field value
  priority: number // Higher priority fields shown first when space is limited
}

export interface ExperienceForm {
  id: string
  experience_id: string
  title: string
  description?: string
  fields: ProgressiveProfileField[]
  submit_text: string
  success_message: string
  redirect_url?: string
}