-- إنشاء وإعداد Storage Bucket للنفايات الطبية
-- نفذ هذا الكود في Supabase SQL Editor

-- 1. إنشاء الـ bucket (إذا لم يكن موجوداً)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'medical-waste',
    'medical-waste',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

-- 2. حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Allow authenticated users to upload incinerator documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read incinerator documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update incinerator documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete incinerator documents" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated upload to medical-waste" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from medical-waste" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update in medical-waste" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from medical-waste" ON storage.objects;

-- 3. إنشاء السياسات الجديدة

-- السماح للمستخدمين المصرح لهم برفع الملفات
CREATE POLICY "Allow authenticated upload to medical-waste"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'medical-waste');

-- السماح للجميع بقراءة الملفات (لأن الـ bucket public)
CREATE POLICY "Allow public read from medical-waste"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'medical-waste');

-- السماح للمستخدمين المصرح لهم بتحديث الملفات
CREATE POLICY "Allow authenticated update in medical-waste"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'medical-waste');

-- السماح للمستخدمين المصرح لهم بحذف الملفات
CREATE POLICY "Allow authenticated delete from medical-waste"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'medical-waste');

-- 4. التحقق من الإعداد
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE id = 'medical-waste';
