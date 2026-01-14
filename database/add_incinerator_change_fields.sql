-- إضافة حقول تغيير المحرقة لجدول تسليمات المحرقة
-- Add incinerator change tracking fields

-- المحرقة الأصلية (قبل التغيير)
ALTER TABLE incinerator_deliveries ADD COLUMN IF NOT EXISTS original_incinerator_id UUID REFERENCES incinerators(id);

-- هل تم تغيير المحرقة؟
ALTER TABLE incinerator_deliveries ADD COLUMN IF NOT EXISTS incinerator_changed BOOLEAN DEFAULT false;

-- سبب تغيير المحرقة
ALTER TABLE incinerator_deliveries ADD COLUMN IF NOT EXISTS change_reason TEXT;

-- صناديق الأمانة
ALTER TABLE incinerator_deliveries ADD COLUMN IF NOT EXISTS safety_box_bags INTEGER DEFAULT 0;
ALTER TABLE incinerator_deliveries ADD COLUMN IF NOT EXISTS safety_box_count INTEGER DEFAULT 0;

-- تعليقات
COMMENT ON COLUMN incinerator_deliveries.original_incinerator_id IS 'المحرقة الأصلية المحددة من الأدمن قبل التغيير';
COMMENT ON COLUMN incinerator_deliveries.incinerator_changed IS 'هل قام المندوب بتغيير المحرقة';
COMMENT ON COLUMN incinerator_deliveries.change_reason IS 'سبب تغيير المحرقة من قبل المندوب';
COMMENT ON COLUMN incinerator_deliveries.safety_box_bags IS 'عدد أكياس صناديق الأمانة المسلمة';
COMMENT ON COLUMN incinerator_deliveries.safety_box_count IS 'عدد صناديق الأمانة المسلمة';
