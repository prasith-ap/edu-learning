-- ============================================================
-- EduPlay: Create missing tables for quiz history and badges
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. quiz_results table
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module        TEXT NOT NULL,
  score         INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 10,
  percentage    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own quiz results" ON public.quiz_results;
CREATE POLICY "Users can manage own quiz results"
  ON public.quiz_results FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. user_badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  icon        TEXT DEFAULT '🏅',
  earned_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own badges" ON public.user_badges;
CREATE POLICY "Users can manage own badges"
  ON public.user_badges FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Done!
SELECT 'Tables created successfully!' AS status;
