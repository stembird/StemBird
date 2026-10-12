export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_response_cache: {
        Row: {
          created_at: string
          expires_at: string
          hit_count: number | null
          id: string
          input_hash: string
          input_text: string
          model_used: string
          response_data: Json
        }
        Insert: {
          created_at?: string
          expires_at?: string
          hit_count?: number | null
          id?: string
          input_hash: string
          input_text: string
          model_used: string
          response_data: Json
        }
        Update: {
          created_at?: string
          expires_at?: string
          hit_count?: number | null
          id?: string
          input_hash?: string
          input_text?: string
          model_used?: string
          response_data?: Json
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          billing_interval: string | null
          compare_at_price_kes: number | null
          created_at: string
          description: string
          duration_days: number | null
          id: string
          is_active: boolean
          kind: string
          metadata: Json
          name: string
          price_kes: number
          sku: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          billing_interval?: string | null
          compare_at_price_kes?: number | null
          created_at?: string
          description?: string
          duration_days?: number | null
          id?: string
          is_active?: boolean
          kind: string
          metadata?: Json
          name: string
          price_kes: number
          sku: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          billing_interval?: string | null
          compare_at_price_kes?: number | null
          created_at?: string
          description?: string
          duration_days?: number | null
          id?: string
          is_active?: boolean
          kind?: string
          metadata?: Json
          name?: string
          price_kes?: number
          sku?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          applicable_skus: string[]
          applies_to: string
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount_kes: number | null
          min_amount_kes: number | null
          starts_at: string | null
          usage_limit: number | null
          used_count: number
          updated_at: string
        }
        Insert: {
          applicable_skus?: string[]
          applies_to?: string
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_kes?: number | null
          min_amount_kes?: number | null
          starts_at?: string | null
          usage_limit?: number | null
          used_count?: number
          updated_at?: string
        }
        Update: {
          applicable_skus?: string[]
          applies_to?: string
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_kes?: number | null
          min_amount_kes?: number | null
          starts_at?: string | null
          usage_limit?: number | null
          used_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          applicable_skus: string[]
          applies_to: string
          badge_text: string | null
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          name: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          applicable_skus?: string[]
          applies_to?: string
          badge_text?: string | null
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          applicable_skus?: string[]
          applies_to?: string
          badge_text?: string | null
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          amount_kes: number | null
          coupon_id: string
          created_at: string
          id: string
          payment_id: string | null
          product_sku: string | null
          user_id: string | null
        }
        Insert: {
          amount_kes?: number | null
          coupon_id: string
          created_at?: string
          id?: string
          payment_id?: string | null
          product_sku?: string | null
          user_id?: string | null
        }
        Update: {
          amount_kes?: number | null
          coupon_id?: string
          created_at?: string
          id?: string
          payment_id?: string | null
          product_sku?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      application_notes: {
        Row: {
          application_id: string
          created_at: string | null
          id: string
          is_archived: boolean | null
          is_pinned: boolean | null
          is_reminder: boolean | null
          note_text: string
          note_type: string | null
          reminder_date: string | null
          reminder_sent: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          is_reminder?: boolean | null
          note_text: string
          note_type?: string | null
          reminder_date?: string | null
          reminder_sent?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          is_reminder?: boolean | null
          note_text?: string
          note_type?: string | null
          reminder_date?: string | null
          reminder_sent?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_ratings: {
        Row: {
          application_id: string
          communication_score: number | null
          created_at: string | null
          culture_fit_score: number | null
          experience_score: number | null
          id: string
          overall_score: number | null
          rated_by: string
          rating_notes: string | null
          recommendation: string | null
          technical_score: number | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          communication_score?: number | null
          created_at?: string | null
          culture_fit_score?: number | null
          experience_score?: number | null
          id?: string
          overall_score?: number | null
          rated_by: string
          rating_notes?: string | null
          recommendation?: string | null
          technical_score?: number | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          communication_score?: number | null
          created_at?: string | null
          culture_fit_score?: number | null
          experience_score?: number | null
          id?: string
          overall_score?: number | null
          rated_by?: string
          rating_notes?: string | null
          recommendation?: string | null
          technical_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_ratings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_sources: {
        Row: {
          application_id: string
          created_at: string | null
          id: string
          referrer: string | null
          source_name: string | null
          source_type: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          application_id: string
          created_at?: string | null
          id?: string
          referrer?: string | null
          source_name?: string | null
          source_type?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          id?: string
          referrer?: string | null
          source_name?: string | null
          source_type?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_sources_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_application_sources_application"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_timeline: {
        Row: {
          application_id: string
          created_at: string | null
          created_by: string | null
          created_by_role: string | null
          event_description: string | null
          event_title: string
          event_type: string
          id: string
          metadata: Json | null
          new_status: string | null
          old_status: string | null
        }
        Insert: {
          application_id: string
          created_at?: string | null
          created_by?: string | null
          created_by_role?: string | null
          event_description?: string | null
          event_title: string
          event_type: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          created_by?: string | null
          created_by_role?: string | null
          event_description?: string | null
          event_title?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_timeline_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_authors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          social_links: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id?: string
          social_links?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          social_links?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          approved: boolean | null
          author_email: string
          author_name: string
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
        }
        Insert: {
          approved?: boolean | null
          author_email: string
          author_name: string
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
        }
        Update: {
          approved?: boolean | null
          author_email?: string
          author_name?: string
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean | null
          name: string | null
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      blog_post_likes: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown
          post_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: unknown
          post_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown
          post_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_versions: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          post_id: string
          title: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          post_id: string
          title: string
          version: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          post_id?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_versions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_views: {
        Row: {
          id: string
          ip_address: unknown
          post_id: string
          user_agent: string | null
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          ip_address?: unknown
          post_id: string
          user_agent?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          ip_address?: unknown
          post_id?: string
          user_agent?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured: boolean | null
          featured_image: string | null
          id: string
          like_count: number | null
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          parent_id: string | null
          published_at: string | null
          reading_time: number | null
          scheduled_at: string | null
          slug: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          version: number | null
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured?: boolean | null
          featured_image?: string | null
          id?: string
          like_count?: number | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          parent_id?: string | null
          published_at?: string | null
          reading_time?: number | null
          scheduled_at?: string | null
          slug: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          version?: number | null
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured?: boolean | null
          featured_image?: string | null
          id?: string
          like_count?: number | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          parent_id?: string | null
          published_at?: string | null
          reading_time?: number | null
          scheduled_at?: string | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          version?: number | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      bulk_action_logs: {
        Row: {
          action_data: Json | null
          action_type: string
          affected_count: number
          application_ids: string[]
          created_at: string | null
          error_details: Json | null
          failure_count: number | null
          id: string
          performed_by: string
          success_count: number | null
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          affected_count: number
          application_ids: string[]
          created_at?: string | null
          error_details?: Json | null
          failure_count?: number | null
          id?: string
          performed_by: string
          success_count?: number | null
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          affected_count?: number
          application_ids?: string[]
          created_at?: string | null
          error_details?: Json | null
          failure_count?: number | null
          id?: string
          performed_by?: string
          success_count?: number | null
        }
        Relationships: []
      }
      bulk_job_actions: {
        Row: {
          action_type: string
          completed_at: string | null
          created_at: string | null
          id: string
          job_ids: string[]
          parameters: Json | null
          results: Json | null
          status: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_ids: string[]
          parameters?: Json | null
          results?: Json | null
          status?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_ids?: string[]
          parameters?: Json | null
          results?: Json | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      candidate_assessment_results: {
        Row: {
          answers: Json | null
          assessment_id: string
          certificate_url: string | null
          completed_at: string | null
          expires_at: string | null
          id: string
          is_public: boolean | null
          passed: boolean
          score: number
          time_taken_minutes: number | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          assessment_id: string
          certificate_url?: string | null
          completed_at?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          passed: boolean
          score: number
          time_taken_minutes?: number | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          assessment_id?: string
          certificate_url?: string | null
          completed_at?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          passed?: boolean
          score?: number
          time_taken_minutes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_assessment_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "skill_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_career_goals: {
        Row: {
          career_path_id: string | null
          completed_steps: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          progress_percentage: number | null
          target_role: string
          target_timeline_months: number | null
          updated_at: string | null
          user_current_role: string
          user_id: string
        }
        Insert: {
          career_path_id?: string | null
          completed_steps?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          progress_percentage?: number | null
          target_role: string
          target_timeline_months?: number | null
          updated_at?: string | null
          user_current_role: string
          user_id: string
        }
        Update: {
          career_path_id?: string | null
          completed_steps?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          progress_percentage?: number | null
          target_role?: string
          target_timeline_months?: number | null
          updated_at?: string | null
          user_current_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_career_goals_career_path_id_fkey"
            columns: ["career_path_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_cover_letters: {
        Row: {
          content: string
          content_json: Json | null
          created_at: string | null
          file_url: string | null
          generated_content: string | null
          id: string
          job_id: string | null
          template_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          content_json?: Json | null
          created_at?: string | null
          file_url?: string | null
          generated_content?: string | null
          id?: string
          job_id?: string | null
          template_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          content_json?: Json | null
          created_at?: string | null
          file_url?: string | null
          generated_content?: string | null
          id?: string
          job_id?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_cover_letters_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_analytics_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "candidate_cover_letters_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_cover_letters_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "cover_letter_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_cvs: {
        Row: {
          content: Json
          created_at: string | null
          file_url: string | null
          id: string
          is_primary: boolean | null
          last_generated_at: string | null
          parent_cv_id: string | null
          share_token: string | null
          is_public: boolean
          shared_at: string | null
          target_job_id: string | null
          target_jd_text: string | null
          template_id: string | null
          title: string
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_primary?: boolean | null
          last_generated_at?: string | null
          parent_cv_id?: string | null
          share_token?: string | null
          is_public?: boolean
          shared_at?: string | null
          target_job_id?: string | null
          target_jd_text?: string | null
          template_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_primary?: boolean | null
          last_generated_at?: string | null
          parent_cv_id?: string | null
          share_token?: string | null
          is_public?: boolean
          shared_at?: string | null
          target_job_id?: string | null
          target_jd_text?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_cvs_parent_cv_id_fkey"
            columns: ["parent_cv_id"]
            isOneToOne: false
            referencedRelation: "candidate_cvs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_cvs_target_job_id_fkey"
            columns: ["target_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_cvs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "cv_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_documents: {
        Row: {
          candidate_id: string
          document_name: string
          document_type: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          updated_at: string | null
          uploaded_at: string | null
        }
        Insert: {
          candidate_id: string
          document_name: string
          document_type: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Update: {
          candidate_id?: string
          document_name?: string
          document_type?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_education: {
        Row: {
          achievements: string[] | null
          candidate_id: string
          created_at: string | null
          degree_type: string
          description: string | null
          end_date: string | null
          field_of_study: string
          grade: string | null
          id: string
          institution_name: string
          is_current: boolean | null
          location: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          achievements?: string[] | null
          candidate_id: string
          created_at?: string | null
          degree_type: string
          description?: string | null
          end_date?: string | null
          field_of_study: string
          grade?: string | null
          id?: string
          institution_name: string
          is_current?: boolean | null
          location?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          achievements?: string[] | null
          candidate_id?: string
          created_at?: string | null
          degree_type?: string
          description?: string | null
          end_date?: string | null
          field_of_study?: string
          grade?: string | null
          id?: string
          institution_name?: string
          is_current?: boolean | null
          location?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_education_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_preferences: {
        Row: {
          application_updates: boolean | null
          available_to_start: string | null
          created_at: string | null
          id: string
          job_alert_frequency: string | null
          max_salary: number | null
          min_salary: number | null
          preferred_employment_types: string[] | null
          preferred_industries: string[] | null
          preferred_job_functions: string[] | null
          preferred_locations: string[] | null
          preferred_work_schedule: string[] | null
          recommendation_emails: boolean | null
          salary_currency: string | null
          salary_negotiable: boolean | null
          updated_at: string | null
          user_id: string
          willing_to_relocate: boolean | null
        }
        Insert: {
          application_updates?: boolean | null
          available_to_start?: string | null
          created_at?: string | null
          id?: string
          job_alert_frequency?: string | null
          max_salary?: number | null
          min_salary?: number | null
          preferred_employment_types?: string[] | null
          preferred_industries?: string[] | null
          preferred_job_functions?: string[] | null
          preferred_locations?: string[] | null
          preferred_work_schedule?: string[] | null
          recommendation_emails?: boolean | null
          salary_currency?: string | null
          salary_negotiable?: boolean | null
          updated_at?: string | null
          user_id: string
          willing_to_relocate?: boolean | null
        }
        Update: {
          application_updates?: boolean | null
          available_to_start?: string | null
          created_at?: string | null
          id?: string
          job_alert_frequency?: string | null
          max_salary?: number | null
          min_salary?: number | null
          preferred_employment_types?: string[] | null
          preferred_industries?: string[] | null
          preferred_job_functions?: string[] | null
          preferred_locations?: string[] | null
          preferred_work_schedule?: string[] | null
          recommendation_emails?: boolean | null
          salary_currency?: string | null
          salary_negotiable?: boolean | null
          updated_at?: string | null
          user_id?: string
          willing_to_relocate?: boolean | null
        }
        Relationships: []
      }
      candidate_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          current_title: string | null
          date_of_birth: string | null
          disability_status: string | null
          expected_salary_currency: string | null
          expected_salary_max: number | null
          expected_salary_min: number | null
          full_name: string
          gender: string | null
          github_url: string | null
          highest_education_level: string | null
          id: string
          industry: string | null
          job_alerts_enabled: boolean | null
          job_preferences: Json | null
          languages: Json | null
          linkedin_url: string | null
          location: string | null
          marital_status: string | null
          nationality: string | null
          notice_period: string | null
          phone: string | null
          portfolio_url: string | null
          profile_completeness_score: number | null
          profile_visibility: string | null
          updated_at: string | null
          user_id: string
          work_authorization: string | null
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          current_title?: string | null
          date_of_birth?: string | null
          disability_status?: string | null
          expected_salary_currency?: string | null
          expected_salary_max?: number | null
          expected_salary_min?: number | null
          full_name: string
          gender?: string | null
          github_url?: string | null
          highest_education_level?: string | null
          id?: string
          industry?: string | null
          job_alerts_enabled?: boolean | null
          job_preferences?: Json | null
          languages?: Json | null
          linkedin_url?: string | null
          location?: string | null
          marital_status?: string | null
          nationality?: string | null
          notice_period?: string | null
          phone?: string | null
          portfolio_url?: string | null
          profile_completeness_score?: number | null
          profile_visibility?: string | null
          updated_at?: string | null
          user_id: string
          work_authorization?: string | null
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          current_title?: string | null
          date_of_birth?: string | null
          disability_status?: string | null
          expected_salary_currency?: string | null
          expected_salary_max?: number | null
          expected_salary_min?: number | null
          full_name?: string
          gender?: string | null
          github_url?: string | null
          highest_education_level?: string | null
          id?: string
          industry?: string | null
          job_alerts_enabled?: boolean | null
          job_preferences?: Json | null
          languages?: Json | null
          linkedin_url?: string | null
          location?: string | null
          marital_status?: string | null
          nationality?: string | null
          notice_period?: string | null
          phone?: string | null
          portfolio_url?: string | null
          profile_completeness_score?: number | null
          profile_visibility?: string | null
          updated_at?: string | null
          user_id?: string
          work_authorization?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profiles_user_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_salary_expectations: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          is_negotiable: boolean | null
          job_title: string
          max_salary: number
          min_salary: number
          preferred_benefits: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          is_negotiable?: boolean | null
          job_title: string
          max_salary: number
          min_salary: number
          preferred_benefits?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          is_negotiable?: boolean | null
          job_title?: string
          max_salary?: number
          min_salary?: number
          preferred_benefits?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      candidate_skills: {
        Row: {
          candidate_id: string
          created_at: string | null
          endorsed_count: number | null
          id: string
          is_verified: boolean | null
          proficiency_level: string | null
          skill_category: string | null
          skill_name: string
          updated_at: string | null
          years_of_experience: number | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          endorsed_count?: number | null
          id?: string
          is_verified?: boolean | null
          proficiency_level?: string | null
          skill_category?: string | null
          skill_name: string
          updated_at?: string | null
          years_of_experience?: number | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          endorsed_count?: number | null
          id?: string
          is_verified?: boolean | null
          proficiency_level?: string | null
          skill_category?: string | null
          skill_name?: string
          updated_at?: string | null
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_skills_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_work_experience: {
        Row: {
          achievements: string[] | null
          candidate_id: string
          company_name: string
          created_at: string | null
          description: string | null
          employment_type: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          job_title: string
          location: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          achievements?: string[] | null
          candidate_id: string
          company_name: string
          created_at?: string | null
          description?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          job_title: string
          location?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          achievements?: string[] | null
          candidate_id?: string
          company_name?: string
          created_at?: string | null
          description?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          job_title?: string
          location?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_work_experience_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      career_paths: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty: string
          from_role: string
          id: string
          recommended_certifications: Json | null
          required_skills: Json | null
          salary_increase_percentage: number | null
          steps: Json | null
          success_rate: number | null
          to_role: string
          typical_duration_months: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty: string
          from_role: string
          id?: string
          recommended_certifications?: Json | null
          required_skills?: Json | null
          salary_increase_percentage?: number | null
          steps?: Json | null
          success_rate?: number | null
          to_role: string
          typical_duration_months?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty?: string
          from_role?: string
          id?: string
          recommended_certifications?: Json | null
          required_skills?: Json | null
          salary_increase_percentage?: number | null
          steps?: Json | null
          success_rate?: number | null
          to_role?: string
          typical_duration_months?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          industry: string | null
          location: string | null
          logo: string | null
          name: string
          size: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          logo?: string | null
          name: string
          size?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          logo?: string | null
          name?: string
          size?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      company_team_members: {
        Row: {
          can_make_offers: boolean | null
          can_manage_applications: boolean | null
          can_manage_team: boolean | null
          can_post_jobs: boolean | null
          can_schedule_interviews: boolean | null
          company_id: string
          created_at: string | null
          id: string
          invitation_accepted_at: string | null
          invited_by: string | null
          role: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_make_offers?: boolean | null
          can_manage_applications?: boolean | null
          can_manage_team?: boolean | null
          can_post_jobs?: boolean | null
          can_schedule_interviews?: boolean | null
          company_id: string
          created_at?: string | null
          id?: string
          invitation_accepted_at?: string | null
          invited_by?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_make_offers?: boolean | null
          can_manage_applications?: boolean | null
          can_manage_team?: boolean | null
          can_post_jobs?: boolean | null
          can_schedule_interviews?: boolean | null
          company_id?: string
          created_at?: string | null
          id?: string
          invitation_accepted_at?: string | null
          invited_by?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      counties: {
        Row: {
          created_at: string
          id: number
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cover_letter_templates: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          name: string
          placeholders: Json | null
          price_kes: number | null
          template_text: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name: string
          placeholders?: Json | null
          price_kes?: number | null
          template_text: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name?: string
          placeholders?: Json | null
          price_kes?: number | null
          template_text?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      cv_templates: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          name: string
          price_kes: number | null
          template_data: Json
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name: string
          price_kes?: number | null
          template_data: Json
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name?: string
          price_kes?: number | null
          template_data?: Json
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      education_levels: {
        Row: {
          created_at: string
          id: number
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_automation_log: {
        Row: {
          email: string
          id: string
          metadata: Json | null
          rule_id: string
          sent_at: string | null
          user_id: string | null
        }
        Insert: {
          email: string
          id?: string
          metadata?: Json | null
          rule_id: string
          sent_at?: string | null
          user_id?: string | null
        }
        Update: {
          email?: string
          id?: string
          metadata?: Json | null
          rule_id?: string
          sent_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_automation_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "email_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      email_automation_rules: {
        Row: {
          config: Json
          created_at: string | null
          enabled: boolean
          id: string
          last_run_at: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          ab_opens_a: number | null
          ab_opens_b: number | null
          ab_test_sample_size: number | null
          ab_winner_subject: string | null
          bounce_count: number | null
          campaign_type: string
          click_count: number | null
          created_at: string | null
          created_by: string | null
          failed_count: number | null
          html_body: string
          id: string
          open_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string
          subject_b: string | null
          target_audience: Json | null
          text_body: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ab_opens_a?: number | null
          ab_opens_b?: number | null
          ab_test_sample_size?: number | null
          ab_winner_subject?: string | null
          bounce_count?: number | null
          campaign_type?: string
          click_count?: number | null
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          html_body: string
          id?: string
          open_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject: string
          subject_b?: string | null
          target_audience?: Json | null
          text_body?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ab_opens_a?: number | null
          ab_opens_b?: number | null
          ab_test_sample_size?: number | null
          ab_winner_subject?: string | null
          bounce_count?: number | null
          campaign_type?: string
          click_count?: number | null
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          html_body?: string
          id?: string
          open_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string
          subject_b?: string | null
          target_audience?: Json | null
          text_body?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          provider: string | null
          provider_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider?: string | null
          provider_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider?: string | null
          provider_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_subscribers: {
        Row: {
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          source: string | null
          status: string
          unsubscribe_token: string
          unsubscribed_at: string | null
          updated_at: string | null
        }
        Insert: {
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          source?: string | null
          status?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          source?: string | null
          status?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      employer_application_notes: {
        Row: {
          application_id: string
          created_at: string | null
          created_by: string
          id: string
          is_pinned: boolean | null
          is_private: boolean | null
          mentioned_users: string[] | null
          note_text: string
          note_type: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          created_at?: string | null
          created_by: string
          id?: string
          is_pinned?: boolean | null
          is_private?: boolean | null
          mentioned_users?: string[] | null
          note_text: string
          note_type?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_pinned?: boolean | null
          is_private?: boolean | null
          mentioned_users?: string[] | null
          note_text?: string
          note_type?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employer_application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_levels: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      industries: {
        Row: {
          created_at: string
          id: number
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      interview_schedules: {
        Row: {
          application_id: string
          created_at: string | null
          duration_minutes: number | null
          feedback_submitted: boolean | null
          id: string
          interview_description: string | null
          interview_feedback: string | null
          interview_rating: number | null
          interview_title: string
          interview_type: string | null
          interviewer_ids: string[] | null
          location: string | null
          meeting_link: string | null
          meeting_password: string | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          scheduled_at: string
          scheduled_by: string | null
          status: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          created_at?: string | null
          duration_minutes?: number | null
          feedback_submitted?: boolean | null
          id?: string
          interview_description?: string | null
          interview_feedback?: string | null
          interview_rating?: number | null
          interview_title: string
          interview_type?: string | null
          interviewer_ids?: string[] | null
          location?: string | null
          meeting_link?: string | null
          meeting_password?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          scheduled_at: string
          scheduled_by?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          duration_minutes?: number | null
          feedback_submitted?: boolean | null
          id?: string
          interview_description?: string | null
          interview_feedback?: string | null
          interview_rating?: number | null
          interview_title?: string
          interview_type?: string | null
          interviewer_ids?: string[] | null
          location?: string | null
          meeting_link?: string | null
          meeting_password?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          scheduled_at?: string
          scheduled_by?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_schedules_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_alerts_log: {
        Row: {
          alert_type: string
          created_at: string | null
          delivery_status: string | null
          email_opened: boolean | null
          email_opened_at: string | null
          id: string
          jobs_count: number | null
          jobs_data: Json | null
          saved_search_id: string | null
          sent_at: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          delivery_status?: string | null
          email_opened?: boolean | null
          email_opened_at?: string | null
          id?: string
          jobs_count?: number | null
          jobs_data?: Json | null
          saved_search_id?: string | null
          sent_at?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          delivery_status?: string | null
          email_opened?: boolean | null
          email_opened_at?: string | null
          id?: string
          jobs_count?: number | null
          jobs_data?: Json | null
          saved_search_id?: string | null
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_alerts_log_saved_search_id_fkey"
            columns: ["saved_search_id"]
            isOneToOne: false
            referencedRelation: "saved_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          application_method: string | null
          candidate_profile_id: string | null
          cover_letter: string | null
          created_at: string
          cv_file_name: string | null
          cv_file_size: number | null
          cv_file_url: string | null
          candidate_cv_id: string | null
          candidate_cover_letter_id: string | null
          email: string | null
          employer_viewed_at: string | null
          expected_salary_max: number | null
          expected_salary_min: number | null
          full_name: string | null
          id: string
          job_id: string
          last_viewed_at: string | null
          notes: string | null
          phone: string | null
          salary_negotiable: boolean | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string | null
          user_id: string
          viewed_by_employer: boolean | null
          withdrawal_reason: string | null
          withdrawn: boolean | null
          withdrawn_at: string | null
          years_experience: number | null
        }
        Insert: {
          application_method?: string | null
          candidate_profile_id?: string | null
          candidate_cv_id?: string | null
          candidate_cover_letter_id?: string | null
          cover_letter?: string | null
          created_at?: string
          cv_file_name?: string | null
          cv_file_size?: number | null
          cv_file_url?: string | null
          email?: string | null
          employer_viewed_at?: string | null
          expected_salary_max?: number | null
          expected_salary_min?: number | null
          full_name?: string | null
          id?: string
          job_id: string
          last_viewed_at?: string | null
          notes?: string | null
          phone?: string | null
          salary_negotiable?: boolean | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string | null
          user_id: string
          viewed_by_employer?: boolean | null
          withdrawal_reason?: string | null
          withdrawn?: boolean | null
          withdrawn_at?: string | null
          years_experience?: number | null
        }
        Update: {
          application_method?: string | null
          candidate_profile_id?: string | null
          candidate_cv_id?: string | null
          candidate_cover_letter_id?: string | null
          cover_letter?: string | null
          created_at?: string
          cv_file_name?: string | null
          cv_file_size?: number | null
          cv_file_url?: string | null
          email?: string | null
          employer_viewed_at?: string | null
          expected_salary_max?: number | null
          expected_salary_min?: number | null
          full_name?: string | null
          id?: string
          job_id?: string
          last_viewed_at?: string | null
          notes?: string | null
          phone?: string | null
          salary_negotiable?: boolean | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string | null
          user_id?: string
          viewed_by_employer?: boolean | null
          withdrawal_reason?: string | null
          withdrawn?: boolean | null
          withdrawn_at?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_analytics_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_comparisons: {
        Row: {
          created_at: string | null
          id: string
          job_ids: string[]
          name: string
          notes: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_ids: string[]
          name: string
          notes?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_ids?: string[]
          name?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      job_functions: {
        Row: {
          created_at: string
          id: number
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      job_history: {
        Row: {
          action: string
          changed_by: string | null
          changes: Json | null
          created_at: string | null
          id: string
          job_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          changes?: Json | null
          created_at?: string | null
          id?: string
          job_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          changes?: Json | null
          created_at?: string | null
          id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_analytics_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_parsing_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          job_text: string
          job_text_hash: string
          max_retries: number | null
          result: Json | null
          retry_count: number | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_text: string
          job_text_hash: string
          max_retries?: number | null
          result?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_text?: string
          job_text_hash?: string
          max_retries?: number | null
          result?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_recommendations: {
        Row: {
          applied: boolean | null
          applied_at: string | null
          dismissed: boolean | null
          dismissed_at: string | null
          experience_match_score: number | null
          expires_at: string | null
          id: string
          job_id: string
          location_match_score: number | null
          match_details: Json | null
          match_score: number
          recommended_at: string | null
          salary_match_score: number | null
          skills_match_score: number | null
          user_id: string
          viewed: boolean | null
          viewed_at: string | null
        }
        Insert: {
          applied?: boolean | null
          applied_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          experience_match_score?: number | null
          expires_at?: string | null
          id?: string
          job_id: string
          location_match_score?: number | null
          match_details?: Json | null
          match_score: number
          recommended_at?: string | null
          salary_match_score?: number | null
          skills_match_score?: number | null
          user_id: string
          viewed?: boolean | null
          viewed_at?: string | null
        }
        Update: {
          applied?: boolean | null
          applied_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          experience_match_score?: number | null
          expires_at?: string | null
          id?: string
          job_id?: string
          location_match_score?: number | null
          match_details?: Json | null
          match_score?: number
          recommended_at?: string | null
          salary_match_score?: number | null
          skills_match_score?: number | null
          user_id?: string
          viewed?: boolean | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_recommendations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_analytics_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_recommendations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_reports: {
        Row: {
          created_at: string
          id: string
          job_data: Json
          job_id: string
          message: string | null
          reported_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_data: Json
          job_id: string
          message?: string | null
          reported_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_data?: Json
          job_id?: string
          message?: string | null
          reported_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_analytics_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_templates: {
        Row: {
          benefits: string | null
          category: string | null
          created_at: string | null
          custom_fields: Json | null
          description: string | null
          experience_level: string | null
          id: string
          job_type: string | null
          location: string | null
          remote_type: string | null
          requirements: string | null
          responsibilities: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          tags: string[] | null
          template_name: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          benefits?: string | null
          category?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          description?: string | null
          experience_level?: string | null
          id?: string
          job_type?: string | null
          location?: string | null
          remote_type?: string | null
          requirements?: string | null
          responsibilities?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          tags?: string[] | null
          template_name: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          benefits?: string | null
          category?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          description?: string | null
          experience_level?: string | null
          id?: string
          job_type?: string | null
          location?: string | null
          remote_type?: string | null
          requirements?: string | null
          responsibilities?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          tags?: string[] | null
          template_name?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      job_views: {
        Row: {
          id: string
          ip_address: unknown
          job_id: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          id?: string
          ip_address?: unknown
          job_id: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          id?: string
          ip_address?: unknown
          job_id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_job_views_job"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_analytics_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "fk_job_views_job"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_views_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_analytics_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_views_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          additional_info: string | null
          additional_locations: Json | null
          application_deadline: string | null
          application_url: string | null
          applications_count: number | null
          apply_email: string | null
          apply_link: string | null
          area_of_study: string | null
          auto_renew: boolean | null
          company: string
          company_id: string | null
          county_id: number | null
          created_at: string
          date_posted: string | null
          description: string
          direct_apply: boolean | null
          education_level_id: number | null
          education_requirements: string | null
          employment_type: Database["public"]["Enums"]["employment_type"] | null
          employment_types:
            | Database["public"]["Enums"]["employment_type"][]
            | null
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          experience_level_ref_id: number | null
          expires_at: string | null
          featured_until: string | null
          field_of_study: string | null
          google_indexed: boolean | null
          hiring_organization_logo: string | null
          hiring_organization_name: string | null
          hiring_organization_url: string | null
          id: string
          identifier: string | null
          industries: string[] | null
          industry: string | null
          industry_id: number | null
          industry_ids: number[] | null
          is_featured: boolean | null
          is_promoted: boolean | null
          job_function: string | null
          job_function_id: number | null
          job_function_ids: number[] | null
          job_functions: string[] | null
          job_location_city: string | null
          job_location_country: string | null
          job_location_county: string | null
          job_location_type:
            | Database["public"]["Enums"]["job_location_type"]
            | null
          job_location_types:
            | Database["public"]["Enums"]["job_location_type"][]
            | null
          job_slug: string | null
          language_requirements: string | null
          last_renewed_at: string | null
          location: string
          location_town: string | null
          minimum_experience: number | null
          og_image_url: string | null
          posted_by: Database["public"]["Enums"]["posted_by"] | null
          posted_date: string | null
          promotion_end_date: string | null
          promotion_start_date: string | null
          promotion_tier: string | null
          qualifications: string | null
          renewal_count: number | null
          renewal_duration_days: number | null
          required_qualifications: Json | null
          responsibilities: string | null
          salary: string | null
          salary_currency: string | null
          salary_is_estimated: boolean
          salary_max: number | null
          salary_min: number | null
          salary_period: Database["public"]["Enums"]["salary_period"] | null
          salary_type: Database["public"]["Enums"]["salary_type"] | null
          salary_visibility:
            | Database["public"]["Enums"]["salary_visibility"]
            | null
          slug: string | null
          source: Database["public"]["Enums"]["job_source"] | null
          specialization: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          tags: Json | null
          title: string
          updated_at: string
          user_id: string | null
          valid_through: string | null
          views_count: number | null
          work_schedule: string | null
          listing_kind: string
          scholarship_level: string | null
          scholarship_coverage: string | null
          scholarship_duration: string | null
          scholarship_nationality: string | null
          scholarship_age_limit: string | null
          scholarship_bonding: string | null
          scholarship_host_institution: string | null
          scholarship_awards_count: number | null
          scholarship_programme_start: string | null
        }
        Insert: {
          additional_info?: string | null
          additional_locations?: Json | null
          application_deadline?: string | null
          application_url?: string | null
          applications_count?: number | null
          apply_email?: string | null
          apply_link?: string | null
          area_of_study?: string | null
          auto_renew?: boolean | null
          company: string
          company_id?: string | null
          county_id?: number | null
          created_at?: string
          date_posted?: string | null
          description: string
          direct_apply?: boolean | null
          education_level_id?: number | null
          education_requirements?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          employment_types?:
            | Database["public"]["Enums"]["employment_type"][]
            | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          experience_level_ref_id?: number | null
          expires_at?: string | null
          featured_until?: string | null
          field_of_study?: string | null
          google_indexed?: boolean | null
          hiring_organization_logo?: string | null
          hiring_organization_name?: string | null
          hiring_organization_url?: string | null
          id?: string
          identifier?: string | null
          industries?: string[] | null
          industry?: string | null
          industry_id?: number | null
          industry_ids?: number[] | null
          is_featured?: boolean | null
          is_promoted?: boolean | null
          job_function?: string | null
          job_function_id?: number | null
          job_function_ids?: number[] | null
          job_functions?: string[] | null
          job_location_city?: string | null
          job_location_country?: string | null
          job_location_county?: string | null
          job_location_type?:
            | Database["public"]["Enums"]["job_location_type"]
            | null
          job_location_types?:
            | Database["public"]["Enums"]["job_location_type"][]
            | null
          job_slug?: string | null
          language_requirements?: string | null
          last_renewed_at?: string | null
          location: string
          location_town?: string | null
          minimum_experience?: number | null
          og_image_url?: string | null
          posted_by?: Database["public"]["Enums"]["posted_by"] | null
          posted_date?: string | null
          promotion_end_date?: string | null
          promotion_start_date?: string | null
          promotion_tier?: string | null
          qualifications?: string | null
          renewal_count?: number | null
          renewal_duration_days?: number | null
          required_qualifications?: Json | null
          responsibilities?: string | null
          salary?: string | null
          salary_currency?: string | null
          salary_is_estimated?: boolean
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: Database["public"]["Enums"]["salary_period"] | null
          salary_type?: Database["public"]["Enums"]["salary_type"] | null
          salary_visibility?:
            | Database["public"]["Enums"]["salary_visibility"]
            | null
          slug?: string | null
          source?: Database["public"]["Enums"]["job_source"] | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          tags?: Json | null
          title: string
          updated_at?: string
          user_id?: string | null
          valid_through?: string | null
          views_count?: number | null
          work_schedule?: string | null
          listing_kind?: string
          scholarship_level?: string | null
          scholarship_coverage?: string | null
          scholarship_duration?: string | null
          scholarship_nationality?: string | null
          scholarship_age_limit?: string | null
          scholarship_bonding?: string | null
          scholarship_host_institution?: string | null
          scholarship_awards_count?: number | null
          scholarship_programme_start?: string | null
        }
        Update: {
          additional_info?: string | null
          additional_locations?: Json | null
          application_deadline?: string | null
          application_url?: string | null
          applications_count?: number | null
          apply_email?: string | null
          apply_link?: string | null
          area_of_study?: string | null
          auto_renew?: boolean | null
          company?: string
          company_id?: string | null
          county_id?: number | null
          created_at?: string
          date_posted?: string | null
          description?: string
          direct_apply?: boolean | null
          education_level_id?: number | null
          education_requirements?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          employment_types?:
            | Database["public"]["Enums"]["employment_type"][]
            | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          experience_level_ref_id?: number | null
          expires_at?: string | null
          featured_until?: string | null
          field_of_study?: string | null
          google_indexed?: boolean | null
          hiring_organization_logo?: string | null
          hiring_organization_name?: string | null
          hiring_organization_url?: string | null
          id?: string
          identifier?: string | null
          industries?: string[] | null
          industry?: string | null
          industry_id?: number | null
          industry_ids?: number[] | null
          is_featured?: boolean | null
          is_promoted?: boolean | null
          job_function?: string | null
          job_function_id?: number | null
          job_function_ids?: number[] | null
          job_functions?: string[] | null
          job_location_city?: string | null
          job_location_country?: string | null
          job_location_county?: string | null
          job_location_type?:
            | Database["public"]["Enums"]["job_location_type"]
            | null
          job_location_types?:
            | Database["public"]["Enums"]["job_location_type"][]
            | null
          job_slug?: string | null
          language_requirements?: string | null
          last_renewed_at?: string | null
          location?: string
          location_town?: string | null
          minimum_experience?: number | null
          og_image_url?: string | null
          posted_by?: Database["public"]["Enums"]["posted_by"] | null
          posted_date?: string | null
          promotion_end_date?: string | null
          promotion_start_date?: string | null
          promotion_tier?: string | null
          qualifications?: string | null
          renewal_count?: number | null
          renewal_duration_days?: number | null
          required_qualifications?: Json | null
          responsibilities?: string | null
          salary?: string | null
          salary_currency?: string | null
          salary_is_estimated?: boolean
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: Database["public"]["Enums"]["salary_period"] | null
          salary_type?: Database["public"]["Enums"]["salary_type"] | null
          salary_visibility?:
            | Database["public"]["Enums"]["salary_visibility"]
            | null
          slug?: string | null
          source?: Database["public"]["Enums"]["job_source"] | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          tags?: Json | null
          title?: string
          updated_at?: string
          user_id?: string | null
          valid_through?: string | null
          views_count?: number | null
          work_schedule?: string | null
          listing_kind?: string
          scholarship_level?: string | null
          scholarship_coverage?: string | null
          scholarship_duration?: string | null
          scholarship_nationality?: string | null
          scholarship_age_limit?: string | null
          scholarship_bonding?: string | null
          scholarship_host_institution?: string | null
          scholarship_awards_count?: number | null
          scholarship_programme_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_education_level_id_fkey"
            columns: ["education_level_id"]
            isOneToOne: false
            referencedRelation: "education_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_experience_level_ref_id_fkey"
            columns: ["experience_level_ref_id"]
            isOneToOne: false
            referencedRelation: "experience_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_job_function_id_fkey"
            columns: ["job_function_id"]
            isOneToOne: false
            referencedRelation: "job_functions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          message_type: string | null
          receiver_id: string
          sender_id: string
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          message_type?: string | null
          receiver_id: string
          sender_id: string
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          message_type?: string | null
          receiver_id?: string
          sender_id?: string
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          emailed: boolean | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          emailed?: boolean | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          emailed?: boolean | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      og_image_generation_queue: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          job_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          job_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          job_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "og_image_generation_queue_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "job_analytics_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "og_image_generation_queue_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      page_content: {
        Row: {
          content_type: string
          content_value: string
          created_at: string | null
          id: string
          metadata: Json | null
          page_slug: string
          section_key: string
          seo_canonical_url: string | null
          seo_follow: boolean | null
          seo_h1_title: string | null
          seo_index: boolean | null
          seo_meta_description: string | null
          seo_title: string | null
          seo_url_slug: string | null
          updated_at: string | null
        }
        Insert: {
          content_type?: string
          content_value: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          page_slug: string
          section_key: string
          seo_canonical_url?: string | null
          seo_follow?: boolean | null
          seo_h1_title?: string | null
          seo_index?: boolean | null
          seo_meta_description?: string | null
          seo_title?: string | null
          seo_url_slug?: string | null
          updated_at?: string | null
        }
        Update: {
          content_type?: string
          content_value?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          page_slug?: string
          section_key?: string
          seo_canonical_url?: string | null
          seo_follow?: boolean | null
          seo_h1_title?: string | null
          seo_index?: boolean | null
          seo_meta_description?: string | null
          seo_title?: string | null
          seo_url_slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          provider: string
          transaction_reference: string
          merchant_request_id: string | null
          checkout_request_id: string | null
          mpesa_receipt_number: string | null
          amount: number
          phone_number: string
          status: string
          description: string | null
          user_id: string | null
          job_id: string | null
          result_code: number | null
          result_desc: string | null
          raw_callback: Json | null
          metadata: Json | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider?: string
          transaction_reference: string
          merchant_request_id?: string | null
          checkout_request_id?: string | null
          mpesa_receipt_number?: string | null
          amount: number
          phone_number: string
          status?: string
          description?: string | null
          user_id?: string | null
          job_id?: string | null
          result_code?: number | null
          result_desc?: string | null
          raw_callback?: Json | null
          metadata?: Json | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider?: string
          transaction_reference?: string
          merchant_request_id?: string | null
          checkout_request_id?: string | null
          mpesa_receipt_number?: string | null
          amount?: number
          phone_number?: string
          status?: string
          description?: string | null
          user_id?: string | null
          job_id?: string | null
          result_code?: number | null
          result_desc?: string | null
          raw_callback?: Json | null
          metadata?: Json | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_data: {
        Row: {
          company_size: string | null
          country: string
          created_at: string | null
          currency: string | null
          data_source: string | null
          experience_level: string
          id: string
          industry: string | null
          job_title: string
          last_updated: string | null
          location: string
          max_salary: number
          median_salary: number
          min_salary: number
          remote_type: string | null
          sample_size: number | null
        }
        Insert: {
          company_size?: string | null
          country: string
          created_at?: string | null
          currency?: string | null
          data_source?: string | null
          experience_level: string
          id?: string
          industry?: string | null
          job_title: string
          last_updated?: string | null
          location: string
          max_salary: number
          median_salary: number
          min_salary: number
          remote_type?: string | null
          sample_size?: number | null
        }
        Update: {
          company_size?: string | null
          country?: string
          created_at?: string | null
          currency?: string | null
          data_source?: string | null
          experience_level?: string
          id?: string
          industry?: string | null
          job_title?: string
          last_updated?: string | null
          location?: string
          max_salary?: number
          median_salary?: number
          min_salary?: number
          remote_type?: string | null
          sample_size?: number | null
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_analytics_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          alert_enabled: boolean | null
          alert_frequency: string | null
          created_at: string | null
          employment_type: string | null
          experience_level: string | null
          id: string
          industry: string | null
          job_function: string | null
          keywords: string | null
          last_alert_sent_at: string | null
          location: string | null
          salary_max: number | null
          salary_min: number | null
          search_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_enabled?: boolean | null
          alert_frequency?: string | null
          created_at?: string | null
          employment_type?: string | null
          experience_level?: string | null
          id?: string
          industry?: string | null
          job_function?: string | null
          keywords?: string | null
          last_alert_sent_at?: string | null
          location?: string | null
          salary_max?: number | null
          salary_min?: number | null
          search_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_enabled?: boolean | null
          alert_frequency?: string | null
          created_at?: string | null
          employment_type?: string | null
          experience_level?: string | null
          id?: string
          industry?: string | null
          job_function?: string | null
          keywords?: string | null
          last_alert_sent_at?: string | null
          location?: string | null
          salary_max?: number | null
          salary_min?: number | null
          search_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scrape_queue: {
        Row: {
          attempts: number | null
          error_message: string | null
          id: string
          job_url: string
          partial_data: Json | null
          processed_at: string | null
          queued_at: string | null
          source_id: string
          status: string | null
        }
        Insert: {
          attempts?: number | null
          error_message?: string | null
          id?: string
          job_url: string
          partial_data?: Json | null
          processed_at?: string | null
          queued_at?: string | null
          source_id: string
          status?: string | null
        }
        Update: {
          attempts?: number | null
          error_message?: string | null
          id?: string
          job_url?: string
          partial_data?: Json | null
          processed_at?: string | null
          queued_at?: string | null
          source_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrape_queue_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "scraper_sources"
            referencedColumns: ["source_id"]
          },
        ]
      }
      scraped_job_sources: {
        Row: {
          content_hash: string
          id: string
          job_id: string | null
          job_url: string
          raw_data: Json | null
          scraped_at: string | null
          source_id: string
          status: string | null
        }
        Insert: {
          content_hash: string
          id?: string
          job_id?: string | null
          job_url: string
          raw_data?: Json | null
          scraped_at?: string | null
          source_id: string
          status?: string | null
        }
        Update: {
          content_hash?: string
          id?: string
          job_id?: string | null
          job_url?: string
          raw_data?: Json | null
          scraped_at?: string | null
          source_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scraped_job_sources_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_analytics_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "scraped_job_sources_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      scraper_sources: {
        Row: {
          base_url: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_discovered_at: string | null
          name: string
          selectors: Json
          source_id: string
        }
        Insert: {
          base_url: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_discovered_at?: string | null
          name: string
          selectors: Json
          source_id: string
        }
        Update: {
          base_url?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_discovered_at?: string | null
          name?: string
          selectors?: Json
          source_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          favicon_url: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          site_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          site_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          site_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      skill_assessments: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          difficulty_level: string
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          passing_score: number | null
          questions: Json
          skill_name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          difficulty_level: string
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          passing_score?: number | null
          questions: Json
          skill_name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          difficulty_level?: string
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          passing_score?: number | null
          questions?: Json
          skill_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      towns: {
        Row: {
          county_id: number
          created_at: string
          id: number
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          county_id: number
          created_at?: string
          id?: number
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          county_id?: number
          created_at?: string
          id?: number
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_towns_county"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          job_alert_emails: boolean | null
          marketing_emails: boolean | null
          role: string | null
          transactional_emails: boolean | null
          updated_at: string | null
          weekly_digest: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          job_alert_emails?: boolean | null
          marketing_emails?: boolean | null
          role?: string | null
          transactional_emails?: boolean | null
          updated_at?: string | null
          weekly_digest?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          job_alert_emails?: boolean | null
          marketing_emails?: boolean | null
          role?: string | null
          transactional_emails?: boolean | null
          updated_at?: string | null
          weekly_digest?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      conversation_summaries: {
        Row: {
          conversation_id: string | null
          last_message: string | null
          last_message_time: string | null
          other_party_avatar: string | null
          other_party_id: string | null
          other_party_name: string | null
          total_messages: number | null
          unread_count: number | null
        }
        Relationships: []
      }
      job_analytics_summary: {
        Row: {
          conversion_rate: number | null
          employer_id: string | null
          first_application_at: string | null
          hired_count: number | null
          interview_count: number | null
          job_id: string | null
          last_application_at: string | null
          offered_count: number | null
          posted_at: string | null
          rejected_count: number | null
          shortlisted_count: number | null
          status: Database["public"]["Enums"]["job_status"] | null
          title: string | null
          total_applications: number | null
          total_views: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_application_timeline_event: {
        Args: {
          p_application_id: string
          p_created_by?: string
          p_created_by_role?: string
          p_event_description?: string
          p_event_title: string
          p_event_type: string
          p_metadata?: Json
          p_new_status?: string
          p_old_status?: string
        }
        Returns: string
      }
      admin_get_all_users: {
        Args: never
        Returns: {
          application_count: number
          avatar_url: string
          current_title: string
          email: string
          full_name: string
          joined_at: string
          location: string
          phone: string
          profile_completeness_score: number
          profile_visibility: string
          role: string
          user_id: string
        }[]
      }
      auto_renew_expired_jobs: { Args: never; Returns: number }
      bulk_update_application_status: {
        Args: {
          p_application_ids: string[]
          p_new_status: string
          p_performed_by: string
        }
        Returns: {
          failure_count: number
          success_count: number
        }[]
      }
      calculate_reading_time: { Args: { content: string }; Returns: number }
      clean_expired_cache: { Args: never; Returns: number }
      cleanup_expired_recommendations: { Args: never; Returns: undefined }
      count_broadcast_recipients: {
        Args: {
          p_applied_to_job_id?: string
          p_company_id?: string
          p_location?: string
          p_role?: string
        }
        Returns: number
      }
      create_notification: {
        Args: {
          notification_data?: Json
          notification_message: string
          notification_title: string
          notification_type: string
          user_uuid: string
        }
        Returns: string
      }
      delete_old_notifications: { Args: never; Returns: number }
      duplicate_job: {
        Args: { new_title?: string; source_job_id: string }
        Returns: string
      }
      execute_bulk_job_action: {
        Args: { action_id_param: string }
        Returns: Json
      }
      expire_old_jobs: { Args: never; Returns: number }
      feature_job: {
        Args: { duration_days?: number; job_id_param: string }
        Returns: undefined
      }
      get_admin_dashboard: {
        Args: never
        Returns: {
          created_at: string
          id: string
          payload: Json
          title: string
        }[]
      }
      get_application_average_rating: {
        Args: { p_application_id: string }
        Returns: {
          avg_communication: number
          avg_culture_fit: number
          avg_experience: number
          avg_overall: number
          avg_technical: number
          total_ratings: number
        }[]
      }
      get_cached_response: { Args: { input_text: string }; Returns: Json }
      get_current_user_roles: {
        Args: never
        Returns: {
          role: string
        }[]
      }
      get_email_stats: { Args: never; Returns: Json }
      get_is_admin: { Args: { p_user_id?: string }; Returns: boolean }
      get_job_application_count: { Args: { job_uuid: string }; Returns: number }
      get_salary_insights: {
        Args: {
          p_experience_level?: string
          p_job_title: string
          p_location?: string
        }
        Returns: {
          currency: string
          max_salary: number
          median_salary: number
          min_salary: number
          percentile_25: number
          percentile_75: number
          sample_size: number
        }[]
      }
      get_subscriber_count: { Args: never; Returns: number }
      get_unread_notification_count: { Args: never; Returns: number }
      get_unread_notifications_count: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_user_applied: {
        Args: { job_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      mark_all_notifications_as_read: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_notification_as_read: {
        Args: { notification_uuid: string }
        Returns: undefined
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      mark_recommendation_viewed: {
        Args: { p_job_id: string; p_user_id: string }
        Returns: undefined
      }
      promote_job: {
        Args: { duration_days?: number; job_id_param: string; tier?: string }
        Returns: undefined
      }
      refresh_job_analytics: { Args: never; Returns: undefined }
      renew_job: { Args: { job_id_param: string }; Returns: undefined }
      save_to_cache: {
        Args: { input_text: string; model_used?: string; response_data: Json }
        Returns: string
      }
      suggest_career_paths: {
        Args: { p_user_id: string }
        Returns: {
          difficulty: string
          duration_months: number
          from_role: string
          match_score: number
          path_id: string
          salary_increase_percentage: number
          to_role: string
        }[]
      }
      withdraw_application: {
        Args: { p_application_id: string; p_reason?: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "employer" | "candidate" | "admin"
      application_status:
        | "pending"
        | "reviewing"
        | "shortlisted"
        | "interviewed"
        | "offered"
        | "rejected"
        | "withdrawn"
        | "accepted"
      currency_code: "KES" | "USD"
      employment_type:
        | "FULL_TIME"
        | "PART_TIME"
        | "CONTRACTOR"
        | "INTERN"
        | "TEMPORARY"
        | "VOLUNTEER"
        | "PER_DIEM"
      experience_level: "Entry" | "Mid" | "Senior" | "Managerial" | "Internship"
      job_location_type: "ON_SITE" | "REMOTE" | "HYBRID"
      job_source: "Employer" | "Admin" | "Scraper"
      job_status: "active" | "expired" | "draft" | "pending"
      notification_type:
        | "application_received"
        | "application_status_changed"
        | "new_message"
        | "job_posted"
        | "job_expiring"
        | "profile_viewed"
      posted_by: "admin" | "employer"
      salary_period: "YEAR" | "MONTH" | "WEEK" | "DAY" | "HOUR"
      salary_type: "Monthly" | "Weekly" | "Hourly" | "Annually"
      salary_visibility: "Show" | "Hide"
      visa_sponsorship: "Yes" | "No" | "Not Applicable"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["employer", "candidate", "admin"],
      application_status: [
        "pending",
        "reviewing",
        "shortlisted",
        "interviewed",
        "offered",
        "rejected",
        "withdrawn",
        "accepted",
      ],
      currency_code: ["KES", "USD"],
      employment_type: [
        "FULL_TIME",
        "PART_TIME",
        "CONTRACTOR",
        "INTERN",
        "TEMPORARY",
        "VOLUNTEER",
        "PER_DIEM",
      ],
      experience_level: ["Entry", "Mid", "Senior", "Managerial", "Internship"],
      job_location_type: ["ON_SITE", "REMOTE", "HYBRID"],
      job_source: ["Employer", "Admin", "Scraper"],
      job_status: ["active", "expired", "draft", "pending"],
      notification_type: [
        "application_received",
        "application_status_changed",
        "new_message",
        "job_posted",
        "job_expiring",
        "profile_viewed",
      ],
      posted_by: ["admin", "employer"],
      salary_period: ["YEAR", "MONTH", "WEEK", "DAY", "HOUR"],
      salary_type: ["Monthly", "Weekly", "Hourly", "Annually"],
      salary_visibility: ["Show", "Hide"],
      visa_sponsorship: ["Yes", "No", "Not Applicable"],
    },
  },
} as const
