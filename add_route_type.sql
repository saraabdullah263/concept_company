-- إضافة نوع الرحلة للجدول
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_type TEXT DEFAULT 'collection';

-- إضافة تفاصيل الصيانة
ALTER TABLE routes ADD COLUMN IF NOT EXISTS maintenance_details TEXT;

-- تحديث الرحلات الموجودة
UPDATE routes SET route_type = 'collection' WHERE route_type IS NULL;

-- إضافة مواعيد الزيارة للعملاء (العيادات والمراكز الطبية)
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS visit_hours_from TIME;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS visit_hours_to TIME;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS visit_days TEXT; -- مثال: 'السبت,الأحد,الاثنين'

COMMENT ON COLUMN hospitals.visit_hours_from IS 'بداية مواعيد الزيارة';
COMMENT ON COLUMN hospitals.visit_hours_to IS 'نهاية مواعيد الزيارة';
COMMENT ON COLUMN hospitals.visit_days IS 'أيام الزيارة المتاحة';
