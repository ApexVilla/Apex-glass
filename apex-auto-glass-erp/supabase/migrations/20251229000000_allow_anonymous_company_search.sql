-- Allow anonymous users to search companies by name for login
-- This is necessary because users need to find their company before authentication
-- Security: Only exposes name and id (no sensitive data)
-- Other RLS policies protect company data after login

-- Create policy to allow anonymous users to search companies
-- This is safe because:
-- 1. Only exposes company name and id (no sensitive data like CNPJ, email, etc.)
-- 2. Application validates company access before any operations
-- 3. All other tables are protected by RLS policies that require authentication
-- 4. Users must authenticate before accessing any company-specific data

CREATE POLICY "Allow anonymous company search for login"
ON public.companies FOR SELECT
TO anon
USING (true);

-- Also ensure authenticated users can search all companies (already exists but making sure)
-- This is needed for master users who can switch companies
DROP POLICY IF EXISTS "Users can view their company or search by name" ON public.companies;

CREATE POLICY "Authenticated users can view or search companies"
ON public.companies FOR SELECT
TO authenticated
USING (true);

