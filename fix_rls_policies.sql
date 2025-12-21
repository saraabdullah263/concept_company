-- Fix RLS Policies for Medical Waste Management System
-- This fixes the 400 errors when accessing data

-- ============================================
-- 1. ROUTES TABLE POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all authenticated users to read routes" ON routes;
DROP POLICY IF EXISTS "Allow logistics managers to create routes" ON routes;
DROP POLICY IF EXISTS "Allow logistics managers to update routes" ON routes;
DROP POLICY IF EXISTS "Allow logistics managers to delete routes" ON routes;

-- Create new policies
CREATE POLICY "Allow authenticated users to read routes"
ON routes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins and logistics managers to insert routes"
ON routes FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'logistics_manager')
    )
);

CREATE POLICY "Allow admins and logistics managers to update routes"
ON routes FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'logistics_manager', 'supervisor')
    )
);

CREATE POLICY "Allow admins to delete routes"
ON routes FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- ============================================
-- 2. ROUTE_STOPS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow all authenticated users to read route_stops" ON route_stops;
DROP POLICY IF EXISTS "Allow logistics managers to manage route_stops" ON route_stops;

CREATE POLICY "Allow authenticated users to read route_stops"
ON route_stops FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins and logistics managers to insert route_stops"
ON route_stops FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'logistics_manager')
    )
);

CREATE POLICY "Allow representatives to update their route_stops"
ON route_stops FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM routes r
        JOIN representatives rep ON rep.id = r.representative_id
        WHERE r.id = route_stops.route_id
        AND rep.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'logistics_manager', 'supervisor')
    )
);

CREATE POLICY "Allow admins to delete route_stops"
ON route_stops FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- ============================================
-- 3. INVOICES TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow all authenticated users to read invoices" ON invoices;
DROP POLICY IF EXISTS "Allow accountants to manage invoices" ON invoices;

CREATE POLICY "Allow authenticated users to read invoices"
ON invoices FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins and accountants to insert invoices"
ON invoices FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'accountant')
    )
);

CREATE POLICY "Allow admins and accountants to update invoices"
ON invoices FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'accountant')
    )
);

CREATE POLICY "Allow admins to delete invoices"
ON invoices FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- ============================================
-- 4. HOSPITALS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow all authenticated users to read hospitals" ON hospitals;
DROP POLICY IF EXISTS "Allow admins to manage hospitals" ON hospitals;

CREATE POLICY "Allow authenticated users to read hospitals"
ON hospitals FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins and logistics managers to insert hospitals"
ON hospitals FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'logistics_manager', 'accountant')
    )
);

CREATE POLICY "Allow admins and logistics managers to update hospitals"
ON hospitals FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'logistics_manager', 'accountant')
    )
);

CREATE POLICY "Allow admins to delete hospitals"
ON hospitals FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- ============================================
-- 5. CONTRACTS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow all authenticated users to read contracts" ON contracts;

CREATE POLICY "Allow authenticated users to read contracts"
ON contracts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins and accountants to insert contracts"
ON contracts FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'accountant', 'logistics_manager')
    )
);

CREATE POLICY "Allow admins and accountants to update contracts"
ON contracts FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'accountant', 'logistics_manager')
    )
);

CREATE POLICY "Allow admins to delete contracts"
ON contracts FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- ============================================
-- 6. VEHICLES TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow all authenticated users to read vehicles" ON vehicles;

CREATE POLICY "Allow authenticated users to read vehicles"
ON vehicles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins and logistics managers to manage vehicles"
ON vehicles FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'logistics_manager')
    )
);

-- ============================================
-- 7. INCINERATORS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow all authenticated users to read incinerators" ON incinerators;

CREATE POLICY "Allow authenticated users to read incinerators"
ON incinerators FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins and logistics managers to manage incinerators"
ON incinerators FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'logistics_manager')
    )
);

-- ============================================
-- 8. REPRESENTATIVES TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow all authenticated users to read representatives" ON representatives;

CREATE POLICY "Allow authenticated users to read representatives"
ON representatives FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins to manage representatives"
ON representatives FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- ============================================
-- 9. ROUTE_TRACKING_LOGS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow all authenticated users to read route_tracking_logs" ON route_tracking_logs;

CREATE POLICY "Allow authenticated users to read route_tracking_logs"
ON route_tracking_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow representatives to insert tracking logs"
ON route_tracking_logs FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM routes r
        JOIN representatives rep ON rep.id = r.representative_id
        WHERE r.id = route_tracking_logs.route_id
        AND rep.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'logistics_manager')
    )
);

-- ============================================
-- 10. EXPENSES TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow accountants to read expenses" ON expenses;

CREATE POLICY "Allow admins and accountants to read expenses"
ON expenses FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'accountant')
    )
);

CREATE POLICY "Allow admins and accountants to manage expenses"
ON expenses FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'accountant')
    )
);

-- ============================================
-- 11. INCINERATOR_TRANSACTIONS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow accountants to read incinerator_transactions" ON incinerator_transactions;

CREATE POLICY "Allow admins and accountants to read incinerator_transactions"
ON incinerator_transactions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'accountant')
    )
);

CREATE POLICY "Allow admins and accountants to manage incinerator_transactions"
ON incinerator_transactions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'accountant')
    )
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check if policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
