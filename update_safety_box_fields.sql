-- تحديث حقول السيفتي بوكس
-- Update Safety Box fields

-- إضافة حقل وزن السيفتي بوكس في route_stops
-- (collection_details هو JSONB فلا نحتاج تعديل الجدول)

-- تحديث حقول incinerator_deliveries
ALTER TABLE incinerator_deliveries ADD COLUMN IF NOT EXISTS safety_box_weight NUMERIC DEFAULT 0;

-- تحديث التعليقات
COMMENT ON COLUMN incinerator_deliveries.safety_box_count IS 'عدد صناديق السيفتي بوكس المسلمة';
COMMENT ON COLUMN incinerator_deliveries.safety_box_weight IS 'وزن صناديق السيفتي بوكس بالكيلو';

-- حذف حقل safety_box_bags إذا كان موجوداً (اختياري)
-- ALTER TABLE incinerator_deliveries DROP COLUMN IF EXISTS safety_box_bags;
