-- إصلاح جدول تسليمات المحرقة
-- Fix incinerator_deliveries table

-- 1. إنشاء الجدول لو مش موجود
CREATE TABLE IF NOT EXISTS incinerator_deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    incinerator_id UUID REFERENCES incinerators(id),
    bags_count INTEGER NOT NULL DEFAULT 0,
    weight_delivered DECIMAL(10,2) NOT NULL DEFAULT 0,
    delivery_order INTEGER DEFAULT 1,
    receiver_signature TEXT,
    photo_proof TEXT,
    notes TEXT,
    delivery_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. تفعيل RLS
ALTER TABLE incinerator_deliveries ENABLE ROW LEVEL SECURITY;

-- 3. حذف السياسات القديمة لو موجودة
DROP POLICY IF EXISTS "Allow all for authenticated users" ON incinerator_deliveries;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON incinerator_deliveries;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON incinerator_deliveries;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON incinerator_deliveries;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON incinerator_deliveries;

-- 4. إنشاء سياسات جديدة
CREATE POLICY "Enable read for authenticated users" ON incinerator_deliveries
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON incinerator_deliveries
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON incinerator_deliveries
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON incinerator_deliveries
    FOR DELETE TO authenticated USING (true);

-- 5. منح الصلاحيات
GRANT ALL ON incinerator_deliveries TO authenticated;
GRANT ALL ON incinerator_deliveries TO anon;
