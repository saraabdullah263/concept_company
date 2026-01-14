-- إضافة حقول الرخصة لجدول العقود
-- هذه الحقول ستحفظ نسخة من بيانات رخصة العميل وقت إنشاء العقد

ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS license_number TEXT;

ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS license_expiry_date DATE;
