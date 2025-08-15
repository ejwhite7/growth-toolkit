export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      experiences: {
        Row: {
          id: string
          type: 'webinar_live' | 'webinar_on_demand' | 'demo' | 'quiz' | 'resource' | 'index'
          slug: string
          title: string
          description?: string
          tags: string[]
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: 'webinar_live' | 'webinar_on_demand' | 'demo' | 'quiz' | 'resource' | 'index'
          slug: string
          title: string
          description?: string
          tags?: string[]
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: 'webinar_live' | 'webinar_on_demand' | 'demo' | 'quiz' | 'resource' | 'index'
          slug?: string
          title?: string
          description?: string
          tags?: string[]
          metadata?: Json
          updated_at?: string
        }
      }
      visitors: {
        Row: {
          id: string
          first_seen_at: string
          last_seen_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          first_seen_at?: string
          last_seen_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          last_seen_at?: string
          metadata?: Json
        }
      }
      sessions: {
        Row: {
          id: string
          visitor_id: string
          started_at: string
          ended_at?: string
          region: string
          metadata: Json
        }
        Insert: {
          id?: string
          visitor_id: string
          started_at?: string
          ended_at?: string
          region: string
          metadata?: Json
        }
        Update: {
          id?: string
          ended_at?: string
          metadata?: Json
        }
      }
      profiles: {
        Row: {
          id: string
          visitor_id: string
          email?: string
          first_name?: string
          last_name?: string
          company?: string
          title?: string
          phone?: string
          metadata: Json
          updated_at: string
        }
        Insert: {
          id?: string
          visitor_id: string
          email?: string
          first_name?: string
          last_name?: string
          company?: string
          title?: string
          phone?: string
          metadata?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          company?: string
          title?: string
          phone?: string
          metadata?: Json
          updated_at?: string
        }
      }
      attributions: {
        Row: {
          id: string
          visitor_id: string
          kind: 'first' | 'last'
          source?: string
          medium?: string
          campaign?: string
          term?: string
          content?: string
          referrer?: string
          click_ids: Json
          timestamp: string
        }
        Insert: {
          id?: string
          visitor_id: string
          kind: 'first' | 'last'
          source?: string
          medium?: string
          campaign?: string
          term?: string
          content?: string
          referrer?: string
          click_ids?: Json
          timestamp?: string
        }
        Update: {
          id?: string
          source?: string
          medium?: string
          campaign?: string
          term?: string
          content?: string
          referrer?: string
          click_ids?: Json
        }
      }
      events: {
        Row: {
          id: string
          occurred_at: string
          experience_id?: string
          session_id: string
          visitor_id: string
          profile_id?: string
          action: string
          step?: string
          label?: string
          value?: number
          variant?: string
          payload: Json
          consent: Json
          region: string
          dedup_id: string
        }
        Insert: {
          id?: string
          occurred_at?: string
          experience_id?: string
          session_id: string
          visitor_id: string
          profile_id?: string
          action: string
          step?: string
          label?: string
          value?: number
          variant?: string
          payload?: Json
          consent?: Json
          region: string
          dedup_id: string
        }
        Update: {
          id?: string
          payload?: Json
          consent?: Json
        }
      }
      submissions: {
        Row: {
          id: string
          experience_id: string
          profile_id: string
          payload: Json
          occurred_at: string
        }
        Insert: {
          id?: string
          experience_id: string
          profile_id: string
          payload?: Json
          occurred_at?: string
        }
        Update: {
          id?: string
          payload?: Json
        }
      }
      identities: {
        Row: {
          id: string
          visitor_id: string
          provider: string
          payload: Json
          confidence: number
          resolved_at: string
        }
        Insert: {
          id?: string
          visitor_id: string
          provider: string
          payload?: Json
          confidence: number
          resolved_at?: string
        }
        Update: {
          id?: string
          payload?: Json
          confidence?: number
        }
      }
      enrichments: {
        Row: {
          id: string
          profile_id: string
          provider: string
          payload: Json
          applied_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          provider: string
          payload?: Json
          applied_at?: string
        }
        Update: {
          id?: string
          payload?: Json
        }
      }
      slack_alerts: {
        Row: {
          id: string
          rule_id: string
          event_id: string
          channel: string
          sent_at: string
          throttled: boolean
        }
        Insert: {
          id?: string
          rule_id: string
          event_id: string
          channel: string
          sent_at?: string
          throttled?: boolean
        }
        Update: {
          id?: string
          throttled?: boolean
        }
      }
      rules: {
        Row: {
          id: string
          name: string
          active: boolean
          conditions: Json
          channel: string
          template: string
          throttle_window_seconds: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          active?: boolean
          conditions: Json
          channel: string
          template: string
          throttle_window_seconds?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          active?: boolean
          conditions?: Json
          channel?: string
          template?: string
          throttle_window_seconds?: number
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}