import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a mock client if environment variables are missing
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Check if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Database Types
export interface UserProfile {
  id: string
  email: string
  display_name: string
  coin_balance: number
  selected_skin: string
  high_score: number
  created_at: string
  updated_at: string
}

export interface StoreItem {
  id: string
  name: string
  category: 'skin' | 'jersey' | 'helmet' | 'cleats' | 'gloves' | 'animation'
  price: number
  description: string
  image_url?: string
  is_premium: boolean
  is_limited_time: boolean
  limited_until?: string
  created_at: string
}

export interface UserInventory {
  id: string
  user_id: string
  item_id: string
  purchased_at: string
  is_equipped: boolean
}

export interface Achievement {
  id: string
  name: string
  description: string
  condition_type: 'yards_run' | 'coins_collected' | 'items_purchased' | 'defenders_dodged'
  condition_value: number
  reward_coins: number
  reward_item_id?: string
  icon: string
  created_at: string
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  progress: number
  completed: boolean
  completed_at?: string
}

export interface DailyChallenge {
  id: string
  name: string
  description: string
  challenge_type: 'collect_coins' | 'run_yards' | 'dodge_tackles' | 'use_stamina'
  target_value: number
  reward_coins: number
  reward_item_id?: string
  date: string
  created_at: string
}

export interface UserDailyProgress {
  id: string
  user_id: string
  challenge_id: string
  progress: number
  completed: boolean
  date: string
}

export interface Leaderboard {
  id: string
  user_id: string
  score: number
  coins_collected: number
  game_date: string
  created_at: string
}

export interface CoinTransaction {
  id: string
  user_id: string
  amount: number
  transaction_type: 'earned' | 'spent' | 'purchased' | 'reward'
  description: string
  created_at: string
}

export interface GameSave {
  id: string
  user_id: string
  equipped_items: Record<string, string> // category -> item_id
  settings: Record<string, any>
  updated_at: string
}