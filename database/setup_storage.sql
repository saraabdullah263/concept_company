-- Setup Supabase Storage for Medical Waste Management System

-- 1. Create Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'medical-waste', 
    'medical-waste', 
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- 2. Storage Policies for route-photos folder

-- Allow authenticated users to upload photos
CREATE POLICY "Allow authenticated users to upload route photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'medical-waste' 
    AND (storage.foldername(name))[1] = 'route-photos'
);

-- Allow authenticated users to read photos
CREATE POLICY "Allow authenticated users to read route photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'medical-waste' 
    AND (storage.foldername(name))[1] = 'route-photos'
);

-- 3. Storage Policies for signatures folder

-- Allow authenticated users to upload signatures
CREATE POLICY "Allow authenticated users to upload signatures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'medical-waste' 
    AND (storage.foldername(name))[1] = 'signatures'
);

-- Allow authenticated users to read signatures
CREATE POLICY "Allow authenticated users to read signatures"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'medical-waste' 
    AND (storage.foldername(name))[1] = 'signatures'
);

-- 4. Allow public access to all files in the bucket (since bucket is public)
CREATE POLICY "Public Access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'medical-waste');

-- Note: Run this SQL in your Supabase SQL Editor
-- Make sure to enable RLS on storage.objects if not already enabled
