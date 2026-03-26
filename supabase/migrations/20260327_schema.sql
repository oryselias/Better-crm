-- 20260327_schema.sql
-- Native Supabase Postgres Migration for Better-crm
-- Generated from Niglabs Reverse-Engineering

-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- PATIENTS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_no SERIAL UNIQUE,
    
    -- Demographics
    title VARCHAR(10) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    age_value INTEGER NOT NULL,
    age_unit VARCHAR(10) NOT NULL,
    
    -- Physical Stats
    height NUMERIC(5,2),
    weight NUMERIC(5,2),
    
    -- Contact Info
    mobile_no VARCHAR(20) NOT NULL,
    alternate_mobile_no VARCHAR(20),
    email VARCHAR(255),
    
    -- Location
    area VARCHAR(255),
    city VARCHAR(255),
    pincode VARCHAR(20),
    
    -- Referrals
    referred_by VARCHAR(255),
    outside_lab_ref VARCHAR(255),
    hospital_ref VARCHAR(255),
    
    -- Insurance
    insurance_no VARCHAR(100),
    insurance_company VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================
-- LAB REPORTS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.lab_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    
    status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
    department VARCHAR(100) NOT NULL,
    
    -- AI Extraction Fields
    raw_pdf_url TEXT,
    ai_parsed_json JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================
-- INVOICES TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    
    total_amount NUMERIC(10,2) NOT NULL,
    paid_amount NUMERIC(10,2) DEFAULT 0 NOT NULL,
    status VARCHAR(50) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================
-- ROW LEVEL SECURITY (RLS) ENABLEMENT
-- =========================================================
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Note: In a production app with auth, you would create policies here
-- allowing authenticated users (or specific clinics) to access their rows.
-- For now, we allow full access to authenticated service_roles.
CREATE POLICY "Allow service_role full access to patients" ON public.patients FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full access to lab_reports" ON public.lab_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full access to invoices" ON public.invoices FOR ALL TO service_role USING (true) WITH CHECK (true);
