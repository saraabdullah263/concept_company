-- إضافة حقل تاريخ انتهاء رخصة المندوب
-- شغّل هذا الملف في Supabase SQL Editor

ALTER TABLE representatives 
ADD COLUMN IF NOT EXISTS license_expiry_date DATE;

-- تعليق توضيحي
COMMENT ON COLUMN representatives.license_expiry_date IS 'تاريخ انتهاء رخصة القيادة للمندوب';
