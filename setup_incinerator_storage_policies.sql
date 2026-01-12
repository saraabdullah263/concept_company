-- إعداد Storage Policies لملفات المحارق
-- نفذ هذا الكود في Supabase SQL Editor

-- السماح للمستخدمين المصرح لهم برفع ملفات المحارق
CREATE POLICY "Allow authenticated users to upload incinerator documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'medical-waste' 
    AND (storage.foldername(name))[1] = 'incinerator-documents'
);

-- السماح للجميع بقراءة ملفات المحارق
CREATE POLICY "Allow public to read incinerator documents"
ON storage.objects FOR SELECT
TO public
USING (
    bucket_id = 'medical-waste' 
    AND (storage.foldername(name))[1] = 'incinerator-documents'
);

-- السماح للمستخدمين المصرح لهم بتحديث ملفات المحارق
CREATE POLICY "Allow authenticated users to update incinerator documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'medical-waste' 
    AND (storage.foldername(name))[1] = 'incinerator-documents'
);

-- السماح للمستخدمين المصرح لهم بحذف ملفات المحارق
CREATE POLICY "Allow authenticated users to delete incinerator documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'medical-waste' 
    AND (storage.foldername(name))[1] = 'incinerator-documents'
);
