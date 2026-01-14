-- إضافة حقول الأسعار الجديدة لجدول العملاء
-- Add new pricing fields to hospitals table

-- سعر الزيارة الواحدة
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS single_visit_price DECIMAL(10,2);

-- سعر التعاقد الشهري
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS monthly_contract_price DECIMAL(10,2);

-- إضافة تعليقات للأعمدة
COMMENT ON COLUMN hospitals.single_visit_price IS 'سعر الزيارة الواحدة بالجنيه المصري';
COMMENT ON COLUMN hospitals.monthly_contract_price IS 'سعر التعاقد الشهري بالجنيه المصري';
