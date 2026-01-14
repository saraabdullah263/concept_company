-- إضافة حقول الرخصة لجدول العملاء (hospitals)

-- إضافة رقم الرخصة
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS license_number TEXT;

-- إضافة تاريخ انتهاء الرخصة
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS license_expiry_date DATE;

-- إضافة رابط ملف الرخصة (سيتم تخزينه في Supabase Storage)
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS license_file_url TEXT;

-- إضافة اسم الملف الأصلي
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS license_file_name TEXT;

-- إنشاء bucket للرخص في Storage (نفذ هذا من لوحة Supabase Storage)
-- اسم الـ bucket: client-licenses
-- السياسات:
-- 1. السماح للمسؤولين برفع الملفات (INSERT)
-- 2. السماح للجميع بقراءة الملفات (SELECT)
-- 3. السماح للمسؤولين بحذف الملفات (DELETE)
