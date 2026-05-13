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
      wallets: {
        Row: {
          id: string
          name: string
          invite_code: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          invite_code?: string
          created_by: string
          created_at?: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          wallet_id: string
          display_name: string
          avatar_color: string
          created_at: string
        }
        Insert: {
          id: string
          wallet_id: string
          display_name: string
          avatar_color?: string
          created_at?: string
        }
        Update: {
          display_name?: string
          avatar_color?: string
          wallet_id?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          id: string
          wallet_id: string
          name: string
          description: string | null
          code: string
          code_type: 'barcode' | 'qrcode' | 'text'
          initial_balance: number
          current_balance: number
          currency: string
          color: string
          card_number: string | null
          expiry_date: string | null
          is_archived: boolean
          archived_at: string | null
          sort_order: number
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          id?: string
          wallet_id: string
          name: string
          description?: string | null
          code: string
          code_type?: 'barcode' | 'qrcode' | 'text'
          initial_balance: number
          current_balance?: number
          currency?: string
          color?: string
          card_number?: string | null
          expiry_date?: string | null
          is_archived?: boolean
          sort_order?: number
          created_by: string
        }
        Update: {
          name?: string
          description?: string | null
          code?: string
          code_type?: 'barcode' | 'qrcode' | 'text'
          initial_balance?: number
          current_balance?: number
          currency?: string
          color?: string
          card_number?: string | null
          expiry_date?: string | null
          is_archived?: boolean
          archived_at?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          card_id: string
          user_id: string
          amount: number
          balance_after: number
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          card_id: string
          user_id: string
          amount: number
          balance_after: number
          note?: string | null
          created_at?: string
        }
        Update: {
          note?: string | null
        }
        // FK declarations mirror the constraints created in migration 001
        // (`REFERENCES cards(id)` and `REFERENCES profiles(id)`). They allow
        // Supabase's PostgREST client to embed the joined row via
        // `profile:profiles!user_id(...)` with full type safety, removing the
        // `as unknown as` cast that was needed in useTransactions.
        Relationships: [
          {
            foreignKeyName: 'transactions_card_id_fkey'
            columns: ['card_id']
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      login_events: {
        Row: {
          id: string
          user_id: string
          user_agent: string | null
          ip_address: string | null
          is_new: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_agent?: string | null
          ip_address?: string | null
          is_new?: boolean
          created_at?: string
        }
        Update: {
          is_new?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_credit: {
        Args: { p_card_id: string; p_amount: number; p_note?: string }
        Returns: {
          id: string
          card_id: string
          user_id: string
          amount: number
          balance_after: number
          note: string | null
          created_at: string
        }
      }
      join_wallet: {
        Args: { p_invite_code: string; p_display_name: string; p_avatar_color?: string }
        Returns: {
          id: string
          wallet_id: string
          display_name: string
          avatar_color: string
          created_at: string
        }
      }
      create_wallet: {
        Args: { p_wallet_name: string; p_display_name: string; p_avatar_color?: string }
        Returns: {
          id: string
          name: string
          invite_code: string
          created_by: string
          created_at: string
        }
      }
      my_wallet_id: {
        Args: Record<string, never>
        Returns: string
      }
      wallet_stats: {
        Args: Record<string, never>
        // Postgres jsonb. Shape is enforced in useStats.ts via RawWalletStats
        // — typing it as Json here keeps the supabase-js inference honest.
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
}
