-- إصلاح تسليمات المحرقة القديمة - حساب التكلفة
-- Fix old incinerator deliveries - calculate total_cost

-- إضافة الأعمدة لو مش موجودة
ALTER TABLE incinerator_deliveries ADD COLUMN IF NOT EXISTS cost_per_kg DECIMAL(10,2) DEFAULT 0;
ALTER TABLE incinerator_deliveries ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2) DEFAULT 0;

-- تحديث التسليمات القديمة اللي مفيهاش تكلفة
UPDATE incinerator_deliveries d
SET 
    cost_per_kg = COALESCE(i.cost_per_kg, 0),
    total_cost = COALESCE(d.weight_delivered * i.cost_per_kg, 0)
FROM incinerators i
WHERE d.incinerator_id = i.id
AND (d.total_cost IS NULL OR d.total_cost = 0);

-- تعليقات
COMMENT ON COLUMN incinerator_deliveries.cost_per_kg IS 'سعر الكيلو وقت التسليم';
COMMENT ON COLUMN incinerator_deliveries.total_cost IS 'إجمالي التكلفة = الوزن × سعر الكيلو';

-- عرض النتيجة
SELECT 
    d.id,
    i.name as incinerator_name,
    d.weight_delivered,
    d.cost_per_kg,
    d.total_cost,
    d.created_at
FROM incinerator_deliveries d
JOIN incinerators i ON d.incinerator_id = i.id
ORDER BY d.created_at DESC
LIMIT 20;
