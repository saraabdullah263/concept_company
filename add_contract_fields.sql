-- إضافة حقول جديدة لجدول العملاء (hospitals) للعقود
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS activity TEXT; -- نشاط العميل
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS commercial_register TEXT; -- السجل التجاري
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS tax_number TEXT; -- الرقم الضريبي
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS manager_name TEXT; -- اسم المدير المسئول

-- إضافة حقول جديدة لجدول العقود
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_fees NUMERIC DEFAULT 0; -- رسوم التعاقد
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_duration TEXT; -- مدة العقد (نص مثل: سنة، 6 أشهر)
