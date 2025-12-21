-- ضبط صلاحيات المستخدمين في النظام
-- شغل هذا الكود في Supabase SQL Editor

-- 1. تحديث الأدوار المتاحة (إذا لزم الأمر)
-- التأكد من أن جدول users يحتوي على الأدوار الصحيحة

-- 2. إعطاء صلاحيات القراءة والكتابة للمندوبين على جداول معينة

-- صلاحيات المندوب (Representative):
-- - قراءة الرحلات المخصصة له فقط
-- - تحديث بيانات التنفيذ (route_stops)
-- - قراءة المستشفيات
-- - قراءة المركبات

-- إنشاء Policy للمندوبين - قراءة الرحلات الخاصة بهم فقط
DROP POLICY IF EXISTS "Representatives can view their own routes" ON routes;
CREATE POLICY "Representatives can view their own routes"
ON routes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM representatives r
        WHERE r.id = routes.representative_id
        AND r.user_id = auth.uid()
    )
);

-- إنشاء Policy للمندوبين - تحديث حالة الرحلات الخاصة بهم
DROP POLICY IF EXISTS "Representatives can update their own routes" ON routes;
CREATE POLICY "Representatives can update their own routes"
ON routes FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM representatives r
        WHERE r.id = routes.representative_id
        AND r.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM representatives r
        WHERE r.id = routes.representative_id
        AND r.user_id = auth.uid()
    )
);

-- صلاحيات المندوبين على route_stops
DROP POLICY IF EXISTS "Representatives can view stops for their routes" ON route_stops;
CREATE POLICY "Representatives can view stops for their routes"
ON route_stops FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM routes rt
        JOIN representatives r ON r.id = rt.representative_id
        WHERE rt.id = route_stops.route_id
        AND r.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Representatives can update stops for their routes" ON route_stops;
CREATE POLICY "Representatives can update stops for their routes"
ON route_stops FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM routes rt
        JOIN representatives r ON r.id = rt.representative_id
        WHERE rt.id = route_stops.route_id
        AND r.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM routes rt
        JOIN representatives r ON r.id = rt.representative_id
        WHERE rt.id = route_stops.route_id
        AND r.user_id = auth.uid()
    )
);

-- صلاحيات قراءة المستشفيات (للجميع)
DROP POLICY IF EXISTS "All authenticated users can view hospitals" ON hospitals;
CREATE POLICY "All authenticated users can view hospitals"
ON hospitals FOR SELECT
TO authenticated
USING (true);

-- صلاحيات قراءة المركبات (للجميع)
DROP POLICY IF EXISTS "All authenticated users can view vehicles" ON vehicles;
CREATE POLICY "All authenticated users can view vehicles"
ON vehicles FOR SELECT
TO authenticated
USING (true);

-- صلاحيات قراءة المحارق (للجميع)
DROP POLICY IF EXISTS "All authenticated users can view incinerators" ON incinerators;
CREATE POLICY "All authenticated users can view incinerators"
ON incinerators FOR SELECT
TO authenticated
USING (true);

-- صلاحيات الأدمن (كل شيء)
DROP POLICY IF EXISTS "Admins have full access to routes" ON routes;
CREATE POLICY "Admins have full access to routes"
ON routes FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Logistics managers have full access to routes" ON routes;
CREATE POLICY "Logistics managers have full access to routes"
ON routes FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'logistics_manager', 'supervisor')
    )
);

-- التحقق من الصلاحيات
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('routes', 'route_stops', 'hospitals', 'vehicles')
ORDER BY tablename, policyname;
