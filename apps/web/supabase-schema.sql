-- Lexis Supabase Schema
-- Run this in Supabase SQL Editor to set up all tables

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  ranking_tier TEXT NOT NULL DEFAULT 'unranked'
    CHECK (ranking_tier IN ('unranked', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master')),
  puzzles_played INTEGER NOT NULL DEFAULT 0,
  puzzles_won INTEGER NOT NULL DEFAULT 0,
  win_rate INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  average_attempts REAL NOT NULL DEFAULT 0,
  total_time_ms BIGINT NOT NULL DEFAULT 0,
  fastest_solve_ms BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(split_part(NEW.email, '@', 1), 'Player')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requester_id, receiver_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendships they received"
  ON friendships FOR UPDATE
  USING (auth.uid() = receiver_id OR auth.uid() = requester_id);

CREATE POLICY "Users can delete their own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenged_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  puzzle_word TEXT NOT NULL,
  challenger_attempts INTEGER,
  challenger_time_ms BIGINT,
  challenged_attempts INTEGER,
  challenged_time_ms BIGINT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'completed', 'expired')),
  winner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own challenges"
  ON challenges FOR SELECT
  USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

CREATE POLICY "Users can create challenges"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Users can update challenges they're part of"
  ON challenges FOR UPDATE
  USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

-- Puzzle logs table
CREATE TABLE IF NOT EXISTS puzzle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  puzzle_word TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  won BOOLEAN NOT NULL DEFAULT false,
  time_ms BIGINT NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'daily'
    CHECK (mode IN ('daily', 'infinite', 'challenge')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE puzzle_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own puzzle logs"
  ON puzzle_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own puzzle logs"
  ON puzzle_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_ranking ON profiles(puzzles_won DESC);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_receiver ON friendships(receiver_id);
CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_challenges_challenged ON challenges(challenged_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_logs_user ON puzzle_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_logs_created ON puzzle_logs(created_at DESC);

-- Username and points fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Points ledger for tracking all point transactions
CREATE TABLE IF NOT EXISTS points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_created ON points_ledger(created_at DESC);

ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own points" ON points_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert points" ON points_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Daily timed challenges
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  puzzle_word TEXT NOT NULL,
  time_limit_seconds INTEGER NOT NULL DEFAULT 60,
  bonus_points INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(date);

ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view daily challenges" ON daily_challenges FOR SELECT USING (true);
CREATE POLICY "Authenticated can create daily challenges" ON daily_challenges FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add time_limit to challenges table
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS time_limit_seconds INTEGER DEFAULT NULL;

-- =============================================================================
-- Profiles: preferences column
-- =============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- =============================================================================
-- Puzzle logs: in-progress game state and daily tracking columns
-- =============================================================================
ALTER TABLE puzzle_logs ADD COLUMN IF NOT EXISTS guesses TEXT[] DEFAULT '{}';
ALTER TABLE puzzle_logs ADD COLUMN IF NOT EXISTS puzzle_id TEXT;
ALTER TABLE puzzle_logs ADD COLUMN IF NOT EXISTS date_key TEXT;
ALTER TABLE puzzle_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'playing' CHECK (status IN ('playing', 'won', 'lost'));

-- =============================================================================
-- Puzzle logs: mode check constraint (add daily_speed and speed)
-- =============================================================================
ALTER TABLE puzzle_logs DROP CONSTRAINT IF EXISTS puzzle_logs_mode_check;
ALTER TABLE puzzle_logs ADD CONSTRAINT puzzle_logs_mode_check CHECK (mode IN ('daily', 'infinite', 'challenge', 'daily_speed', 'speed'));

-- =============================================================================
-- Puzzle logs: indexes for new columns
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_puzzle_logs_puzzle_id ON puzzle_logs(puzzle_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_logs_date_key ON puzzle_logs(date_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_puzzle_logs_user_date ON puzzle_logs(user_id, date_key) WHERE date_key IS NOT NULL AND mode = 'daily';

-- =============================================================================
-- Push subscriptions: web push notifications
-- =============================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);
