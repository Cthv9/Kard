import type { Database } from './database'

export type Card = Database['public']['Tables']['cards']['Row']
export type CardInsert = Database['public']['Tables']['cards']['Insert']
export type CardUpdate = Database['public']['Tables']['cards']['Update']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Wallet = Database['public']['Tables']['wallets']['Row']

export interface CardWithStats extends Card {
  spent: number
  usedPercent: number
  isExpired: boolean
  isLow: boolean
}

export interface TransactionWithUser extends Transaction {
  profile: Pick<Profile, 'display_name' | 'avatar_color'>
}

export interface UserSpending {
  profile: Profile
  totalSpent: number
  transactionCount: number
}

export interface WalletStats {
  totalRemaining: number
  totalInitial: number
  activeCardCount: number
  archivedCardCount: number
  userSpending: UserSpending[]
}

export const CARD_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#ef4444', // red
] as const
