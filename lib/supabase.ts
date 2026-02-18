import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

// Client component Supabase client
export function createSupabaseClient() {
  return createClientComponentClient()
}

// Server-side Supabase client (for API routes)
export function createSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Database types
export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string
          title: string
          company: string
          company_id: string | null
          location: string | null
          remote: boolean
          url: string
          description: string | null
          requirements: string | null
          salary_min: number | null
          salary_max: number | null
          source: string | null
          match_quality: 'perfect' | 'wider_net' | 'no_match' | null
          match_confidence: number | null
          match_reasoning: string | null
          status: 'discovered' | 'queued' | 'applied' | 'skipped'
          fingerprint: string | null
          discovered_date: string
          posted_date: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['jobs']['Row'], 'id' | 'created_at' | 'discovered_date'>
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>
      }
      applications: {
        Row: {
          id: string
          job_id: string
          cover_letter_id: string | null
          status: 'pending' | 'processing' | 'submitted' | 'failed' | 'manual_review'
          application_type: 'automated' | 'ad_hoc' | 'manual'
          application_date: string
          submission_method: string | null
          confirmation_code: string | null
          failure_reason: string | null
          error_details: string | null
          retry_count: number
          screenshot_path: string | null
          additional_questions: Record<string, unknown> | null
          user_rating: number | null
          user_notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['applications']['Row'], 'id' | 'created_at' | 'application_date'>
        Update: Partial<Database['public']['Tables']['applications']['Insert']>
      }
      cover_letters: {
        Row: {
          id: string
          job_id: string
          content: string
          template_used: string | null
          customization_notes: Record<string, unknown> | null
          file_path: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['cover_letters']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['cover_letters']['Insert']>
      }
      bot_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Record<string, unknown> | unknown
          description: string | null
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['bot_settings']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['bot_settings']['Insert']>
      }
      ai_usage_logs: {
        Row: {
          id: string
          job_id: string | null
          application_id: string | null
          operation: string
          model: string
          input_tokens: number
          output_tokens: number
          cost: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ai_usage_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['ai_usage_logs']['Insert']>
      }
      companies: {
        Row: {
          id: string
          name: string
          website: string | null
          target_priority: 'high' | 'medium' | 'low'
          application_count: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
      }
    }
  }
}

// Convenience types
export type Job = Database['public']['Tables']['jobs']['Row']
export type CoverLetter = Database['public']['Tables']['cover_letters']['Row']
export type Application = Database['public']['Tables']['applications']['Row']

export type UserProfile = {
  name: string
  email: string
  target_title: string
  years_experience: string
  background: string
  skills: string
  target_salary: number
  location: string
  remote_preference: 'remote' | 'hybrid' | 'onsite' | 'any'
  target_industries: string
}
