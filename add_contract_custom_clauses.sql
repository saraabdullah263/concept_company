-- إضافة حقول جديدة لجدول العقود
-- Add custom clauses and additional fields to contracts table

-- إضافة حقل البنود المخصصة
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS custom_clauses JSONB;

-- إضافة حقول إضافية للعقد
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_fees NUMERIC DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_duration TEXT DEFAULT 'سنة واحدة';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS min_weight NUMERIC DEFAULT 15;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS min_price NUMERIC;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_activity TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS commercial_register TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS tax_number TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS manager_name TEXT;

-- تعليق على الحقول
COMMENT ON COLUMN contracts.custom_clauses IS 'بنود مخصصة إضافية للعقد بصيغة JSON';
COMMENT ON COLUMN contracts.contract_fees IS 'رسوم التعاقد السنوية';
COMMENT ON COLUMN contracts.contract_duration IS 'مدة العقد';
COMMENT ON COLUMN contracts.min_weight IS 'الحد الأدنى لوزن النقلة بالكيلو';
COMMENT ON COLUMN contracts.min_price IS 'الحد الأدنى لسعر النقلة';
