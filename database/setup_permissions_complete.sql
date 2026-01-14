-- إعداد الصلاحيات الكاملة للنظام
-- شغل هذا الكود في Supabase SQL Editor

-- ========================================
-- الخطوة 1: حذف جميع الـ Policies القديمة
-- ========================================

-- Routes
DROP POLICY IF EXISTS "Enable access to all users" ON routes;
DROP POLICY IF EXISTS "routes_all_authenticated" ON routes;
DROP POLICY IF EXISTS "Admins have full access to routes" ON routes;
DROP POLICY IF EXISTS "Logistics managers have full access to routes" ON routes;
DROP POLICY IF EXISTS "Representatives can view their own routes" ON routes;
DROP POLICY IF EXISTS "Representatives can update their own routes" ON routes;

-- Route Stops
DROP POLICY IF EXISTS "Enable access to all users" ON route_stops;
DROP POLICY IF EXISTS "route_stops_all_authenticated" ON route_stops;
DROP POLICY IF EXISTS "Representatives can view stops for their routes" ON route_stops;
DROP POLICY IF EXISTS "Representatives can update stops for their routes" ON route_stops;

-- Hospitals
DROP POLICY IF EXISTS "Enable access to all users" ON hospitals;
DROP POLICY IF EXISTS "hospitals_all_authenticated" ON hospitals;
DROP POLICY IF EXISTS "All authenticated users can view hospitals" ON hospitals;

-- Vehicles
DROP POLICY IF EXISTS "Enable access to all users" ON vehicles;
DROP POLICY IF EXISTS "vehicles_all_authenticated" ON vehicles;
DROP POLICY IF EXISTS "All authenticated users can view vehicles" ON vehicles;

-- Incinerators
DROP POLICY IF EXISTS "Enable access to all users" ON incinerators;
DROP POLICY IF EXISTS "incinerators_all_authenticated" ON incinerators;
DROP POLICY IF EXISTS "All authenticated users can view incinerators" ON incinerators;

-- ========================================
-- الخطوة 2: إنشاء Policies جديدة ومنظمة
-- ========================================

-- ============ ROUTES ============

-- 1. Admin & Managers: صلاحيات كاملة
CREATE POLICY "admin_managers_full_access_routes"
ON routes FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'logistics_manager', 'supervisor')
    )
);

-- 2. Representatives: قراءة رحلاتهم فقط
CREATE POLICY "representatives_view_own_routes"
ON routes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM representatives r
        WHERE r.id = routes.representative_id
        AND r.user_id = auth.uid()
    )
);

-- 3. Representatives: تحديث رحلاتهم فقط
CREATE POLICY "representatives_update_own_routes"
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

-- ============ ROUTE_STOPS ============

-- 1. Admin & Managers: صلاحيات كاملة
CREATE POLICY "admin_managers_full_access_route_stops"
ON route_stops FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'logistics_manager', 'supervisor')
    )
);

-- 2. Representatives: قراءة محطات رحلاتهم
CREATE POLICY "representatives_view_own_stops"
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

-- 3. Representatives: تحديث محطات رحلاتهم
CREATE POLICY "representatives_update_own_stops"
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

-- ============ HOSPITALS ============

-- الجميع يقدر يقرأ المستشفيات
CREATE POLICY "all_users_view_hospitals"
ON hospitals FOR SELECT
TO authenticated
USING (true);

-- Admin & Managers: تعديل وإضافة
CREATE POLICY "admin_managers_modify_hospitals"
ON hospitals FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'logistics_manager', 'accountant')
    )
);

-- ============ VEHICLES ============

-- الجميع يقدر يقرأ المركبات
CREATE POLICY "all_users_view_vehicles"
ON vehicles FOR SELECT
TO authenticated
USING (true);

-- Admin & Managers: تعديل وإضافة
CREATE POLICY "admin_managers_modify_vehicles"
ON vehicles FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'logistics_manager')
    )
);

-- ============ INCINERATORS ============

-- الجميع يقدر يقرأ المحارق
CREATE POLICY "all_users_view_incinerators"
ON incinerators FOR SELECT
TO authenticated
USING (true);

-- Admin & Managers: تعديل وإضافة
CREATE POLICY "admin_managers_modify_incinerators"
ON incinerators FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'logistics_manager')
    )
);

-- ========================================
-- الخطوة 3: التحقق من النتيجة
-- ========================================

SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN length(qual::text) > 50 THEN substring(qual::text, 1, 50) || '...'
        ELSE qual::text
    END as policy_rule
FROM pg_policies
WHERE tablename IN ('routes', 'route_stops', 'hospitals', 'vehicles', 'incinerators')
ORDER BY tablename, policyname;

-- ========================================
-- ملاحظات مهمة:
-- ========================================
-- 1. المندوب يشوف رحلاته فقط
-- 2. المندوب يقدر يحدث بيانات رحلاته (الوزن، الوقت، إلخ)
-- 3. الجميع يقدر يقرأ المستشفيات والمركبات والمحارق
-- 4. Admin & Managers عندهم صلاحيات كاملة على كل شيء
