-- تحديث إعدادات الـ bucket وإصلاح المشاكل
-- نفذ هذا الكود في Supabase SQL Editor

-- 1. تحديث إعدادات الـ bucket
UPDATE storage.buckets
SET 
    public = true,
    file_size_limit = 10485760, -- 10MB
    allowed_mime_types = ARRAY[
        'image/jpeg', 
        'image/jpg', 
        'image/png', 
        'image/gif', 
        'image/webp', 
        'image/heic', 
        'image/heif',
        'image/bmp',
        'image/tiff',
        'application/pdf'
    ]
WHERE id = 'medical-waste';

-- 2. حذف جميع السياسات القديمة
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname LIKE '%medical-waste%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- 3. إنشاء سياسات جديدة مبسطة

-- السماح لأي مستخدم مسجل برفع الملفات
CREATE POLICY "medical_waste_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'medical-waste');

-- السماح للجميع بقراءة الملفات
CREATE POLICY "medical_waste_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'medical-waste');

-- السماح لأي مستخدم مسجل بتحديث ملفاته
CREATE POLICY "medical_waste_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'medical-waste')
WITH CHECK (bucket_id = 'medical-waste');

-- السماح لأي مستخدم مسجل بحذف ملفاته
CREATE POLICY "medical_waste_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'medical-waste');

-- 4. التحقق من الإعدادات
SELECT 
    'Bucket Settings' as info,
    id,
    name,
    public,
    file_size_limit / 1024 / 1024 as size_limit_mb,
    allowed_mime_types
FROM storage.buckets
WHERE id = 'medical-waste'

UNION ALL

SELECT 
    'Policies' as info,
    policyname as id,
    '' as name,
    null as public,
    null as size_limit_mb,
    ARRAY[cmd]::text[] as allowed_mime_types
FROM pg_policies
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%medical_waste%';
