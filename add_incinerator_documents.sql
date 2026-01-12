-- إضافة حقول المستندات والوثائق لجدول المحارق

-- السجل التجاري
ALTER TABLE incinerators 
ADD COLUMN IF NOT EXISTS commercial_register TEXT;

-- البطاقة الضريبية
ALTER TABLE incinerators 
ADD COLUMN IF NOT EXISTS tax_card TEXT;

-- رقم الرخصة
ALTER TABLE incinerators 
ADD COLUMN IF NOT EXISTS license_number TEXT;

-- تاريخ انتهاء الرخصة
ALTER TABLE incinerators 
ADD COLUMN IF NOT EXISTS license_expiry_date DATE;

-- رابط ملف الرخصة (PDF/صورة)
ALTER TABLE incinerators 
ADD COLUMN IF NOT EXISTS license_file_url TEXT;

-- اسم ملف الرخصة
ALTER TABLE incinerators 
ADD COLUMN IF NOT EXISTS license_file_name TEXT;

-- تاريخ انتهاء عقد المحرقة
ALTER TABLE incinerators 
ADD COLUMN IF NOT EXISTS contract_expiry_date DATE;

-- رابط ملف العقد (PDF/صورة)
ALTER TABLE incinerators 
ADD COLUMN IF NOT EXISTS contract_file_url TEXT;

-- اسم ملف العقد
ALTER TABLE incinerators 
ADD COLUMN IF NOT EXISTS contract_file_name TEXT;

-- ملاحظة: الملفات ستُخزن في Supabase Storage في المسار:
-- medical-waste/incinerator-documents/{incinerator_id}/
