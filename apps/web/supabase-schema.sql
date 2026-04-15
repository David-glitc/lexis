-- =============================================================================
-- LEXIS — Complete Supabase Schema
-- Run this ENTIRE script in Supabase SQL Editor → New Query → paste → Run
-- Safe to re-run (uses IF NOT EXISTS / IF EXISTS throughout)
-- =============================================================================

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  ranking_tier TEXT NOT NULL DEFAULT 'unranked'
    CHECK (ranking_tier IN ('unranked','bronze','silver','gold','platinum','diamond','master')),
  total_points INTEGER NOT NULL DEFAULT 0,
  puzzles_played INTEGER NOT NULL DEFAULT 0,
  puzzles_won INTEGER NOT NULL DEFAULT 0,
  win_rate INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  average_attempts REAL NOT NULL DEFAULT 0,
  total_time_ms BIGINT NOT NULL DEFAULT 0,
  fastest_solve_ms BIGINT NOT NULL DEFAULT 0,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Public profiles are viewable by everyone') THEN
    CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_ranking ON profiles(puzzles_won DESC);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(split_part(NEW.email, '@', 1), 'Player')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. PUZZLE LOGS
CREATE TABLE IF NOT EXISTS puzzle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  puzzle_id TEXT,
  puzzle_word TEXT NOT NULL DEFAULT '',
  attempts INTEGER NOT NULL DEFAULT 0,
  won BOOLEAN NOT NULL DEFAULT false,
  guesses TEXT[] DEFAULT '{}',
  time_ms BIGINT NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'daily'
    CHECK (mode IN ('daily','infinite','challenge','daily_speed','speed')),
  date_key TEXT,
  status TEXT DEFAULT 'playing'
    CHECK (status IN ('playing','won','lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE puzzle_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='puzzle_logs' AND policyname='Users can view own puzzle logs') THEN
    CREATE POLICY "Users can view own puzzle logs" ON puzzle_logs FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='puzzle_logs' AND policyname='Users can insert own puzzle logs') THEN
    CREATE POLICY "Users can insert own puzzle logs" ON puzzle_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='puzzle_logs' AND policyname='Users can update own puzzle logs') THEN
    CREATE POLICY "Users can update own puzzle logs" ON puzzle_logs FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_puzzle_logs_user ON puzzle_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_logs_created ON puzzle_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_puzzle_logs_puzzle_id ON puzzle_logs(puzzle_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_logs_date_key ON puzzle_logs(date_key);

-- Unique constraint for daily upsert (NULL date_keys won't conflict in PostgreSQL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'puzzle_logs_user_datekey_unique'
  ) THEN
    ALTER TABLE puzzle_logs ADD CONSTRAINT puzzle_logs_user_datekey_unique UNIQUE (user_id, date_key);
  END IF;
END $$;

-- 3. FRIENDSHIPS
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requester_id, receiver_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friendships' AND policyname='Users can view their own friendships') THEN
    CREATE POLICY "Users can view their own friendships" ON friendships FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friendships' AND policyname='Users can send friend requests') THEN
    CREATE POLICY "Users can send friend requests" ON friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friendships' AND policyname='Users can update friendships') THEN
    CREATE POLICY "Users can update friendships" ON friendships FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = requester_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friendships' AND policyname='Users can delete own friendships') THEN
    CREATE POLICY "Users can delete own friendships" ON friendships FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_receiver ON friendships(receiver_id);

-- 4. CHALLENGES
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenged_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seed TEXT,
  puzzle_id TEXT,
  puzzle_word TEXT NOT NULL,
  challenger_attempts INTEGER,
  challenger_time_ms BIGINT,
  challenged_attempts INTEGER,
  challenged_time_ms BIGINT,
  time_limit_seconds INTEGER DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','completed','expired')),
  winner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

ALTER TABLE challenges ADD COLUMN IF NOT EXISTS seed TEXT;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS puzzle_id TEXT;

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='challenges' AND policyname='Users can view their own challenges') THEN
    CREATE POLICY "Users can view their own challenges" ON challenges FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='challenges' AND policyname='Users can create challenges') THEN
    CREATE POLICY "Users can create challenges" ON challenges FOR INSERT WITH CHECK (auth.uid() = challenger_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='challenges' AND policyname='Users can update challenges') THEN
    CREATE POLICY "Users can update challenges" ON challenges FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_challenges_challenged ON challenges(challenged_id);

-- 5. POINTS LEDGER
CREATE TABLE IF NOT EXISTS points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='points_ledger' AND policyname='Users can view own points') THEN
    CREATE POLICY "Users can view own points" ON points_ledger FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='points_ledger' AND policyname='Users can insert points') THEN
    CREATE POLICY "Users can insert points" ON points_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_created ON points_ledger(created_at DESC);

-- 6. DAILY CHALLENGES
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  puzzle_word TEXT NOT NULL,
  time_limit_seconds INTEGER NOT NULL DEFAULT 60,
  bonus_points INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_challenges' AND policyname='Anyone can view daily challenges') THEN
    CREATE POLICY "Anyone can view daily challenges" ON daily_challenges FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_challenges' AND policyname='Auth users can create daily challenges') THEN
    CREATE POLICY "Auth users can create daily challenges" ON daily_challenges FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(date);

-- 7. PUSH SUBSCRIPTIONS
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='push_subscriptions' AND policyname='Users can manage own subscriptions') THEN
    CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 8. DAILY PUZZLES (AUTHORITATIVE UTC-SEED MAP)
CREATE TABLE IF NOT EXISTS daily_puzzles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_utc DATE NOT NULL UNIQUE,
  seed TEXT NOT NULL UNIQUE,
  solution TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE daily_puzzles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_puzzles' AND policyname='Anyone can view daily puzzle seeds') THEN
    CREATE POLICY "Anyone can view daily puzzle seeds" ON daily_puzzles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_puzzles' AND policyname='Auth users can create daily puzzle seeds') THEN
    CREATE POLICY "Auth users can create daily puzzle seeds" ON daily_puzzles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_daily_puzzles_date_utc ON daily_puzzles(date_utc);

-- 9. PUZZLE SESSIONS (AUTHORITATIVE GAMEPLAY)
CREATE TABLE IF NOT EXISTS puzzle_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('daily','infinite','challenge','daily_speed','speed')),
  seed TEXT NOT NULL,
  puzzle_id TEXT NOT NULL,
  solution TEXT NOT NULL,
  challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
  date_key TEXT,
  guesses TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing','won','lost','expired')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 6,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  score_awarded INTEGER NOT NULL DEFAULT 0,
  token_signature TEXT NOT NULL DEFAULT ''
);

ALTER TABLE puzzle_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='puzzle_sessions' AND policyname='Users can view own puzzle sessions') THEN
    CREATE POLICY "Users can view own puzzle sessions" ON puzzle_sessions FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='puzzle_sessions' AND policyname='Users can create own puzzle sessions') THEN
    CREATE POLICY "Users can create own puzzle sessions" ON puzzle_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='puzzle_sessions' AND policyname='Users can update own puzzle sessions') THEN
    CREATE POLICY "Users can update own puzzle sessions" ON puzzle_sessions FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_puzzle_sessions_user_started ON puzzle_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_puzzle_sessions_mode_datekey ON puzzle_sessions(mode, date_key);
CREATE INDEX IF NOT EXISTS idx_puzzle_sessions_challenge ON puzzle_sessions(challenge_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='puzzle_sessions_daily_unique') THEN
    ALTER TABLE puzzle_sessions ADD CONSTRAINT puzzle_sessions_daily_unique UNIQUE (user_id, mode, date_key);
  END IF;
END $$;

-- 10. PLAYER RATING
CREATE TABLE IF NOT EXISTS player_ratings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  elo INTEGER NOT NULL DEFAULT 1200,
  tier TEXT NOT NULL DEFAULT 'bronze',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='player_ratings' AND policyname='Anyone can view player ratings') THEN
    CREATE POLICY "Anyone can view player ratings" ON player_ratings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='player_ratings' AND policyname='Users can upsert own player rating') THEN
    CREATE POLICY "Users can upsert own player rating" ON player_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='player_ratings' AND policyname='Users can update own player rating') THEN
    CREATE POLICY "Users can update own player rating" ON player_ratings FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 11. ANTI-CHEAT EVENTS
CREATE TABLE IF NOT EXISTS anti_cheat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id UUID REFERENCES puzzle_sessions(id) ON DELETE SET NULL,
  challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
  reason_code TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE anti_cheat_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='anti_cheat_events' AND policyname='Users can view own anti-cheat events') THEN
    CREATE POLICY "Users can view own anti-cheat events" ON anti_cheat_events FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='anti_cheat_events' AND policyname='Auth users can insert anti-cheat events') THEN
    CREATE POLICY "Auth users can insert anti-cheat events" ON anti_cheat_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_anti_cheat_user ON anti_cheat_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_reason ON anti_cheat_events(reason_code, created_at DESC);

-- 12. USER PRESENCE (REAL-TIME FOUNDATION)
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('offline','online','idle','playing')),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_presence' AND policyname='Anyone can view user presence') THEN
    CREATE POLICY "Anyone can view user presence" ON user_presence FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_presence' AND policyname='Users can upsert own user presence') THEN
    CREATE POLICY "Users can upsert own user presence" ON user_presence FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_presence' AND policyname='Users can update own user presence') THEN
    CREATE POLICY "Users can update own user presence" ON user_presence FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- =============================================================================
-- DONE — All tables, policies, indexes, and triggers are now set up.
-- =============================================================================
