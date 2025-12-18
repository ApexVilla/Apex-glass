-- Migration: Multi-tenant Auth and User Companies
-- Date: 2025-12-17
-- Description: Creates user_companies structure and migration logic

-- 1. Create table user_companies
CREATE TABLE IF NOT EXISTS public.user_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'user', -- 'admin', 'user', etc. can be expanded
    is_owner BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, company_id)
);

-- 2. Enable RLS
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for user_companies
-- Users can view their own company links
DROP POLICY IF EXISTS "Users can view their own companies" ON public.user_companies;
CREATE POLICY "Users can view their own companies"
    ON public.user_companies FOR SELECT
    USING (auth.uid() = user_id);

-- 4. RPC to set active company (session switch)
-- This function updates the profile's company_id which drives the RLS for the rest of the app
CREATE OR REPLACE FUNCTION public.set_active_company(target_company_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_has_access BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    -- Check if user has access to this company
    SELECT EXISTS (
        SELECT 1 FROM public.user_companies 
        WHERE user_id = v_user_id AND company_id = target_company_id
    ) INTO v_has_access;

    -- Also allow if it's the master user check (legacy/admin override)
    -- You might want to refine this check based on your specific admin logic
    -- For now, we strictly enforce user_companies unless it's a specific superadmin email if needed
    
    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Access Denied: You do not have permission to access this company.';
    END IF;

    -- Update the profile's current company context
    UPDATE public.profiles
    SET company_id = target_company_id,
        updated_at = now()
    WHERE id = v_user_id;
    
    -- If no profile exists (edge case), create one
    IF NOT FOUND THEN
         INSERT INTO public.profiles (id, company_id)
         VALUES (v_user_id, target_company_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Migration: Populate user_companies from existing profiles/companies
-- This ensures existing users can still access their "current" company
DO $$
BEGIN
    INSERT INTO public.user_companies (user_id, company_id, role, is_owner)
    SELECT 
        p.id as user_id,
        p.company_id,
        'admin' as role, -- Giving admin by default to existing mappings for safety
        true as is_owner
    FROM public.profiles p
    WHERE p.company_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.user_companies uc 
        WHERE uc.user_id = p.id AND uc.company_id = p.company_id
    );
END $$;

-- 6. Helper to get available companies for current user
CREATE OR REPLACE FUNCTION public.get_my_companies()
RETURNS TABLE (
    company_id UUID,
    company_name TEXT,
    role TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        uc.role
    FROM public.user_companies uc
    JOIN public.companies c ON c.id = uc.company_id
    WHERE uc.user_id = auth.uid()
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
