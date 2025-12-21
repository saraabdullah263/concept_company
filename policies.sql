-- Enable RLS (Should be already enabled, but good to ensure)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE incinerators ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- 1. USERS: Allow read if authenticated. Allow insert/update if Admin or Self.
CREATE POLICY "Allow read access for authenticated users" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert/update for own profile" ON users FOR ALL TO authenticated USING (auth.uid() = id);
CREATE POLICY "Allow all access for admins" ON users FOR ALL TO authenticated USING (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
-- Allow inserting the FIRST user (Setup) - tricky with RLS, usually done via Service Role or unrestricted insert if table empty?
-- For now, let's allow "INSERT" for authenticated users to create users (as logic is handled in app).
CREATE POLICY "Allow insert for authenticated" ON users FOR INSERT TO authenticated WITH CHECK (true);


-- 2. ALL OTHER TABLES: Allow FULL ACCESS for Authenticated Users 
-- (Since this is an internal ERP/Dashboard, we assume logged-in users are trusted staff for now)
-- We can refine this later (e.g. Drivers only see their routes).

CREATE POLICY "Enable access to all users" ON vehicles FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable access to all users" ON representatives FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable access to all users" ON hospitals FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable access to all users" ON contracts FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable access to all users" ON incinerators FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable access to all users" ON routes FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable access to all users" ON route_stops FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable access to all users" ON route_tracking_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable access to all users" ON invoices FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable access to all users" ON invoice_routes FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable access to all users" ON expenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable access to all users" ON incinerator_transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable access to all users" ON notifications FOR ALL TO authenticated USING (true);
