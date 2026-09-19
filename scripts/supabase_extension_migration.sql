-- ============================================================
-- MIGRATION: CHROME EXTENSION SUPPORT & SYNC
-- Chạy script này trên Supabase SQL Editor của dự án bạn
-- ============================================================

-- 1. BẢNG saved_words (Lưu từ vựng được tô đen từ Extension)
CREATE TABLE IF NOT EXISTS public.saved_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word TEXT NOT NULL,                         -- Từ hoặc cụm từ được tô đen
    meaning_vi TEXT NOT NULL,                   -- Nghĩa tiếng Việt theo ngữ cảnh do AI dịch
    context_sentence TEXT,                      -- Câu gốc chứa từ trên trang web
    part_of_speech TEXT,                        -- Loại từ (noun, verb, idiom, phrasal_verb...)
    ipa TEXT,                                   -- Phiên âm IPA
    source_url TEXT,                            -- Link trang web nơi lưu từ
    source_title TEXT,                          -- Tiêu đề trang web
    status TEXT DEFAULT 'pending',              -- 'pending' (chưa học) | 'chunked' (đã tạo chunk)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Bật Row Level Security (RLS) cho saved_words
ALTER TABLE public.saved_words ENABLE ROW LEVEL SECURITY;

-- Xóa policy cũ nếu có để tránh lỗi duplicate
DROP POLICY IF EXISTS "Users can view own saved_words" ON public.saved_words;
DROP POLICY IF EXISTS "Users can insert own saved_words" ON public.saved_words;
DROP POLICY IF EXISTS "Users can update own saved_words" ON public.saved_words;
DROP POLICY IF EXISTS "Users can delete own saved_words" ON public.saved_words;

-- Tạo Policies
CREATE POLICY "Users can view own saved_words"
ON public.saved_words FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved_words"
ON public.saved_words FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved_words"
ON public.saved_words FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved_words"
ON public.saved_words FOR DELETE
USING (auth.uid() = user_id);

-- Index tối ưu truy vấn theo user_id và status
CREATE INDEX IF NOT EXISTS idx_saved_words_user_status ON public.saved_words(user_id, status);
CREATE INDEX IF NOT EXISTS idx_saved_words_created_at ON public.saved_words(created_at DESC);


-- 2. BẢNG user_settings (Đồng bộ an toàn API Keys & Cài đặt cá nhân)
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    api_key TEXT,                               -- Gemini API Key 1
    api_key_2 TEXT,                             -- Gemini API Key 2 (dự phòng)
    speaking_voice TEXT DEFAULT 'en-US-female',
    srs_track TEXT DEFAULT 'track_a',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bật Row Level Security (RLS) cho user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert/update own user_settings" ON public.user_settings;

CREATE POLICY "Users can view own user_settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update own user_settings"
ON public.user_settings FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
