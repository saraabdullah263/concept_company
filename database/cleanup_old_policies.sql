-- حذف الـ Policies القديمة المتعارضة
-- شغل هذا الكود في Supabase SQL Editor قبل fix_permissions.sql

-- حذف policies القديمة من routes
DROP POLICY IF EXISTS "Enable access to all users" ON routes;
DROP POLICY IF EXISTS "routes_all_authenticated" ON routes;

-- حذف policies القديمة من route_stops
DROP POLICY IF EXISTS "Enable access to all users" ON route_stops;
DROP POLICY IF EXISTS "route_stops_all_authenticated" ON route_stops;

-- حذف policies القديمة من hospitals
DROP POLICY IF EXISTS "Enable access to all users" ON hospitals;
DROP POLICY IF EXISTS "hospitals_all_authenticated" ON hospitals;

-- حذف policies القديمة من vehicles
DROP POLICY IF EXISTS "Enable access to all users" ON vehicles;
DROP POLICY IF EXISTS "vehicles_all_authenticated" ON vehicles;

-- حذف policies القديمة من incinerators (إن وجدت)
DROP POLICY IF EXISTS "Enable access to all users" ON incinerators;
DROP POLICY IF EXISTS "incinerators_all_authenticated" ON incinerators;

-- التحقق من النتيجة
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('routes', 'route_stops', 'hospitals', 'vehicles', 'incinerators')
ORDER BY tablename, policyname;
