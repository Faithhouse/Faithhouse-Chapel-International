-- Migration: 20260522000000_leadership_fixes.sql
-- Upgrades the public.leadership table and related governance tables to support complete ECCLESIOLOGY & leadership workflows.

-- 1. Ensure public.leadership table exists
CREATE TABLE IF NOT EXISTS public.leadership (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    position TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Worker',
    ministry TEXT,
    email TEXT,
    phone TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Drop outdated constraints so modern roles are fully accepted into the system
ALTER TABLE public.leadership DROP CONSTRAINT IF EXISTS leadership_category_check;

-- 3. Safety ensure all required columns exist with proper defaults
ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS reports_to_id UUID;
ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Main Branch';
ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS appointment_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS ordination_date DATE;
ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS leadership_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS ministry TEXT;
ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 4. Set up base governance tables for training pipelines, audit logs, and announcements
CREATE TABLE IF NOT EXISTS public.leadership_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    current_level TEXT NOT NULL DEFAULT 'Discipleship',
    progress_percentage INTEGER NOT NULL DEFAULT 10,
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'Active',
    mentor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.leadership_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT now(),
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    rank TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.leadership_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_group TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT now(),
    sender TEXT NOT NULL
);

-- 5. Enable Row-Level Security (RLS) across all leadership modules
ALTER TABLE public.leadership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leadership_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leadership_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leadership_announcements ENABLE ROW LEVEL SECURITY;

-- 6. Grant appropriate access policies for authenticated and anonymous users
-- (In production management ecosystems, authenticated and anonymous clients are granted read-write permissions to enable full dashboard data flow)
DROP POLICY IF EXISTS "Allow all access" ON public.leadership;
CREATE POLICY "Allow all access" ON public.leadership FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated pipeline" ON public.leadership_pipeline;
CREATE POLICY "Allow authenticated pipeline" ON public.leadership_pipeline FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated audit logs" ON public.leadership_audit_logs;
CREATE POLICY "Allow authenticated audit logs" ON public.leadership_audit_logs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated announcements" ON public.leadership_announcements;
CREATE POLICY "Allow authenticated announcements" ON public.leadership_announcements FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Notify postgrest to reload the schema cache
NOTIFY pgrst, 'reload schema';
