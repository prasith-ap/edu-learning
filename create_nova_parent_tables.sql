-- =============================================
-- EduPlay Nova AI + Parent View SQL Migration
-- Run this in your Supabase SQL Editor
-- =============================================

-- Add parent_pin to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS parent_pin VARCHAR(64) DEFAULT NULL;

-- Track parent view sessions
CREATE TABLE IF NOT EXISTS public.parent_view_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  duration_seconds INTEGER DEFAULT 0
);

-- Table 1: English progress per user
CREATE TABLE IF NOT EXISTS public.user_english_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1 CHECK (current_level BETWEEN 1 AND 5),
  max_level_reached INTEGER DEFAULT 1,
  total_sessions INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  words_learned JSONB DEFAULT '[]'::jsonb,
  focus_areas JSONB DEFAULT '[]'::jsonb,
  session_streak INTEGER DEFAULT 0,
  last_session_date DATE,
  last_topic TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Table 2: Individual session records
CREATE TABLE IF NOT EXISTS public.nova_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_date TIMESTAMPTZ DEFAULT now(),
  duration_seconds INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  level_at_start INTEGER DEFAULT 1,
  level_at_end INTEGER DEFAULT 1,
  words_learned JSONB DEFAULT '[]'::jsonb,
  corrections_count INTEGER DEFAULT 0,
  topics_discussed TEXT[],
  focus_areas JSONB DEFAULT '[]'::jsonb,
  assessment_data JSONB DEFAULT '{}'::jsonb
);

-- Table 3: Vocabulary tracking
CREATE TABLE IF NOT EXISTS public.nova_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  word VARCHAR(100) NOT NULL,
  definition TEXT,
  example_sentence TEXT,
  session_id UUID REFERENCES public.nova_sessions(id),
  times_encountered INTEGER DEFAULT 1,
  learned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, word)
);

-- Auto-update updated_at on user_english_progress
-- (Only if update_updated_at_column trigger function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'update_nova_progress_updated_at'
    ) THEN
      CREATE TRIGGER update_nova_progress_updated_at
      BEFORE UPDATE ON public.user_english_progress
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END $$;

-- RLS Policies
ALTER TABLE public.parent_view_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_english_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nova_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nova_vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own pv sessions" ON public.parent_view_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own progress" ON public.user_english_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own nova sessions" ON public.nova_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own vocabulary" ON public.nova_vocabulary
  FOR ALL USING (auth.uid() = user_id);
