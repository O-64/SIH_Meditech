-- ============================================================
-- SAHAAY / NAVONMESH - COMPLETE SUPABASE DATABASE SCHEMA
-- Copy and paste this directly into Supabase SQL Editor and click RUN
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS (Victims)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    age INTEGER,
    city TEXT,
    area TEXT,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. DAILY CHECKINS
CREATE TABLE IF NOT EXISTS public.daily_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    mood_score INTEGER,
    mood_label TEXT,
    raw_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date 
    ON public.daily_checkins(user_id, checkin_date DESC);

-- 3. CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    checkin_id UUID REFERENCES public.daily_checkins(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'morning',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_checkin 
    ON public.conversations(user_id, checkin_id, created_at ASC);

-- 4. USER EVENTS
CREATE TABLE IF NOT EXISTS public.user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    checkin_id UUID REFERENCES public.daily_checkins(id) ON DELETE CASCADE,
    event_title TEXT NOT NULL,
    event_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_events_user 
    ON public.user_events(user_id);

-- 5. SCHEDULED MESSAGES
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped', 'expired')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status_due 
    ON public.scheduled_messages(status, scheduled_for);

-- 6. CASE QUESTIONNAIRES (SAHAYA Initial Case Assessment)
CREATE TABLE IF NOT EXISTS public.case_questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    incident_type TEXT NOT NULL,
    incident_timing TEXT NOT NULL,
    case_status TEXT NOT NULL,
    support_needed TEXT NOT NULL,
    initial_feeling TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_questionnaires_user 
    ON public.case_questionnaires(user_id);

-- 7. COUNSELLORS (Doctors, Clinics & MHPSS Specialists requesting Government Approval)
CREATE TABLE IF NOT EXISTS public.counsellors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT 'password123',
    license_number TEXT NOT NULL,
    clinic_name TEXT NOT NULL,
    specialization TEXT NOT NULL DEFAULT 'Clinical Psychiatrist',
    qualification TEXT DEFAULT 'MD Psychiatry / M.Phil Clinical Psychology',
    certificate_url TEXT,
    phone TEXT,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    experience_years INTEGER DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Link Victims to Allocated Counsellor
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS counsellor_id UUID REFERENCES public.counsellors(id) ON DELETE SET NULL;
ALTER TABLE public.counsellors ADD COLUMN IF NOT EXISTS certificate_url TEXT;
ALTER TABLE public.counsellors ADD COLUMN IF NOT EXISTS qualification TEXT;

CREATE INDEX IF NOT EXISTS idx_counsellors_status 
    ON public.counsellors(status);

CREATE INDEX IF NOT EXISTS idx_counsellors_email 
    ON public.counsellors(email);

CREATE INDEX IF NOT EXISTS idx_users_counsellor 
    ON public.users(counsellor_id);

-- 8. ADMINS (Government Ministry of Health & Family Welfare / MoSJE)
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL DEFAULT 'Ministry of Health & Family Welfare / MoSJE',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- INITIAL SEED DATA (For Immediate Testing & Demo)
-- ============================================================

INSERT INTO public.counsellors (name, email, password, license_number, clinic_name, specialization, phone, district, state, experience_years, status)
VALUES 
('Dr. Rohini Kulkarni, MD', 'dr.kulkarni@sanjeevaniclinic.org', 'password123', 'MCI-MH-49201', 'Sanjeevani Trauma & Recovery Clinic', 'Clinical Psychiatrist', '+91 98231 44551', 'Pune', 'Maharashtra', 14, 'approved'),
('Dr. Arvind N. Verma', 'dr.verma@state-mhpss.gov.in', 'password123', 'RCI-UP-88219', 'State MHPSS Legal Assistance Center', 'Forensic Psychologist', '+91 94152 77812', 'Lucknow', 'Uttar Pradesh', 11, 'pending'),
('Dr. Meenakshi Sundaram', 'dr.meenakshi@relief.care', 'password123', 'MCI-TN-31902', 'Arogya Community Care & Trauma Foundation', 'Trauma & Rehabilitation Specialist', '+91 97890 33412', 'Madurai', 'Tamil Nadu', 8, 'pending')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.admins (name, email, department)
VALUES 
('Dr. A. Sharma (Director)', 'admin.health@gov.in', 'Ministry of Health & Family Welfare / MoSJE')
ON CONFLICT (email) DO NOTHING;
