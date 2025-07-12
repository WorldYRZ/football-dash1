-- Enable RLS for all tables
SET row_security = on;

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  coin_balance INTEGER DEFAULT 0 CHECK (coin_balance >= 0),
  selected_skin TEXT DEFAULT 'default',
  high_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store items table
CREATE TABLE IF NOT EXISTS store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('skin', 'jersey', 'helmet', 'cleats', 'gloves', 'animation')),
  price INTEGER NOT NULL CHECK (price >= 0),
  description TEXT,
  image_url TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  is_limited_time BOOLEAN DEFAULT FALSE,
  limited_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User inventory table
CREATE TABLE IF NOT EXISTS user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES store_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  is_equipped BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, item_id)
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('yards_run', 'coins_collected', 'items_purchased', 'defenders_dodged')),
  condition_value INTEGER NOT NULL,
  reward_coins INTEGER DEFAULT 0,
  reward_item_id UUID REFERENCES store_items(id),
  icon TEXT DEFAULT '🏆',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, achievement_id)
);

-- Daily challenges table
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('collect_coins', 'run_yards', 'dodge_tackles', 'use_stamina')),
  target_value INTEGER NOT NULL,
  reward_coins INTEGER DEFAULT 0,
  reward_item_id UUID REFERENCES store_items(id),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User daily progress table
CREATE TABLE IF NOT EXISTS user_daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  date DATE NOT NULL,
  UNIQUE(user_id, challenge_id, date)
);

-- Leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  coins_collected INTEGER DEFAULT 0,
  game_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coin transactions table
CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'purchased', 'reward')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game save data table
CREATE TABLE IF NOT EXISTS game_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  equipped_items JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS Policies

-- User profiles: Users can only see and modify their own profile
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Store items: Public read access
ALTER TABLE store_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view store items" ON store_items FOR SELECT TO authenticated USING (true);

-- User inventory: Users can only see their own inventory
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own inventory" ON user_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert to own inventory" ON user_inventory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inventory" ON user_inventory FOR UPDATE USING (auth.uid() = user_id);

-- Achievements: Public read access
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view achievements" ON achievements FOR SELECT TO authenticated USING (true);

-- User achievements: Users can only see their own achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own achievements" ON user_achievements FOR UPDATE USING (auth.uid() = user_id);

-- Daily challenges: Public read access
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view daily challenges" ON daily_challenges FOR SELECT TO authenticated USING (true);

-- User daily progress: Users can only see their own progress
ALTER TABLE user_daily_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own daily progress" ON user_daily_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily progress" ON user_daily_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily progress" ON user_daily_progress FOR UPDATE USING (auth.uid() = user_id);

-- Leaderboard: Public read access for all, users can only insert their own scores
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view leaderboard" ON leaderboard FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own scores" ON leaderboard FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Coin transactions: Users can only see their own transactions
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON coin_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Game saves: Users can only see and modify their own save data
ALTER TABLE game_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own save data" ON game_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own save data" ON game_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own save data" ON game_saves FOR UPDATE USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_progress_user_date ON user_daily_progress(user_id, date);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_game_saves_updated_at ON game_saves;
CREATE TRIGGER update_game_saves_updated_at
    BEFORE UPDATE ON game_saves
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();