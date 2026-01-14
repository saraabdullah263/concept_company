-- Setup Storage Policies for Company Logo

-- 1. Allow admins to upload company logo
CREATE POLICY "Allow admins to upload company logo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'medical-waste' 
    AND (storage.foldername(name))[1] = 'company-logo'
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- 2. Allow admins to update company logo
CREATE POLICY "Allow admins to update company logo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'medical-waste' 
    AND (storage.foldername(name))[1] = 'company-logo'
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- 3. Allow admins to delete company logo
CREATE POLICY "Allow admins to delete company logo"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'medical-waste' 
    AND (storage.foldername(name))[1] = 'company-logo'
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- 4. Allow all authenticated users to read company logo
CREATE POLICY "Allow authenticated users to read company logo"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'medical-waste' 
    AND (storage.foldername(name))[1] = 'company-logo'
);

-- 5. Allow public access to company logo (since bucket is public)
-- This is already covered by the "Public Access" policy in setup_storage.sql
-- But we can add a specific one for clarity:
CREATE POLICY "Public Access to Company Logo"
ON storage.objects
FOR SELECT
TO public
USING (
    bucket_id = 'medical-waste' 
    AND (storage.foldername(name))[1] = 'company-logo'
);

-- Note: Run this SQL in your Supabase SQL Editor
-- Make sure the 'medical-waste' bucket exists and RLS is enabled on storage.objects
