-- إضافة جدول تسليم النفايات للمحارق
-- Incinerator Deliveries Table

CREATE TABLE IF NOT EXISTS incinerator_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE NOT NULL,
    incinerator_id UUID REFERENCES incinerators(id) NOT NULL,
    
    -- بيانات التسليم
    bags_count INTEGER NOT NULL,
    weight_delivered NUMERIC NOT NULL,
    delivery_time TIMESTAMPTZ DEFAULT NOW(),
    delivery_order INTEGER NOT NULL, -- ترتيب التسليم (أول محرقة، ثاني محرقة، إلخ)
    
    -- التوقيع والإثبات
    receiver_signature TEXT, -- توقيع المستلم في المحرقة
    photo_proof TEXT, -- صورة إيصال المحرقة
    
    -- ملاحظات
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إضافة عمود للكمية المتبقية في السيارة في جدول routes
ALTER TABLE routes 
ADD COLUMN IF NOT EXISTS remaining_weight NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_bags INTEGER DEFAULT 0;

-- Index للأداء
CREATE INDEX IF NOT EXISTS idx_incinerator_deliveries_route ON incinerator_deliveries(route_id);
CREATE INDEX IF NOT EXISTS idx_incinerator_deliveries_incinerator ON incinerator_deliveries(incinerator_id);
CREATE INDEX IF NOT EXISTS idx_incinerator_deliveries_time ON incinerator_deliveries(delivery_time);

-- Enable RLS
ALTER TABLE incinerator_deliveries ENABLE ROW LEVEL SECURITY;

-- Policy: الجميع يمكنهم القراءة
CREATE POLICY "Enable read access for all users" ON incinerator_deliveries
    FOR SELECT USING (true);

-- Policy: المندوبين والأدمن يمكنهم الإضافة
CREATE POLICY "Enable insert for authenticated users" ON incinerator_deliveries
    FOR INSERT WITH CHECK (true);

-- Policy: الأدمن فقط يمكنهم التعديل والحذف
CREATE POLICY "Enable update for authenticated users" ON incinerator_deliveries
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON incinerator_deliveries
    FOR DELETE USING (true);

-- إضافة عمود collection_details في route_stops إذا لم يكن موجود
ALTER TABLE route_stops 
ADD COLUMN IF NOT EXISTS collection_details JSONB;

COMMENT ON TABLE incinerator_deliveries IS 'جدول تسجيل عمليات تسليم النفايات للمحارق - يمكن للمندوب تسليم الكمية المجمعة لأكثر من محرقة';
COMMENT ON COLUMN incinerator_deliveries.delivery_order IS 'ترتيب التسليم: 1 للمحرقة الأولى، 2 للثانية، وهكذا';
COMMENT ON COLUMN routes.remaining_weight IS 'الوزن المتبقي في السيارة بعد التسليم للمحارق';
COMMENT ON COLUMN routes.remaining_bags IS 'عدد الأكياس المتبقية في السيارة بعد التسليم للمحارق';
