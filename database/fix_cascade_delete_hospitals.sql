-- إصلاح حذف العملاء مع كل البيانات المرتبطة (Cascade Delete)
-- تنفيذ هذا الملف في Supabase SQL Editor

-- 1. route_tracking_logs (مرتبط بـ route_stops)
ALTER TABLE route_tracking_logs DROP CONSTRAINT IF EXISTS route_tracking_logs_route_stop_id_fkey;
ALTER TABLE route_tracking_logs ADD CONSTRAINT route_tracking_logs_route_stop_id_fkey 
    FOREIGN KEY (route_stop_id) REFERENCES route_stops(id) ON DELETE CASCADE;

ALTER TABLE route_tracking_logs DROP CONSTRAINT IF EXISTS route_tracking_logs_route_id_fkey;
ALTER TABLE route_tracking_logs ADD CONSTRAINT route_tracking_logs_route_id_fkey 
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE;

-- 2. route_stops
ALTER TABLE route_stops DROP CONSTRAINT IF EXISTS route_stops_hospital_id_fkey;
ALTER TABLE route_stops ADD CONSTRAINT route_stops_hospital_id_fkey 
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE;

ALTER TABLE route_stops DROP CONSTRAINT IF EXISTS route_stops_route_id_fkey;
ALTER TABLE route_stops ADD CONSTRAINT route_stops_route_id_fkey 
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE;

-- 3. routes (مرتبط بـ vehicles)
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_vehicle_id_fkey;
ALTER TABLE routes ADD CONSTRAINT routes_vehicle_id_fkey 
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;

ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_representative_id_fkey;
ALTER TABLE routes ADD CONSTRAINT routes_representative_id_fkey 
    FOREIGN KEY (representative_id) REFERENCES representatives(id) ON DELETE SET NULL;

ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_incinerator_id_fkey;
ALTER TABLE routes ADD CONSTRAINT routes_incinerator_id_fkey 
    FOREIGN KEY (incinerator_id) REFERENCES incinerators(id) ON DELETE SET NULL;

-- 4. contracts
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_hospital_id_fkey;
ALTER TABLE contracts ADD CONSTRAINT contracts_hospital_id_fkey 
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE;

-- 5. invoices
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_hospital_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_hospital_id_fkey 
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_contract_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_contract_id_fkey 
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

-- 6. invoice_routes
ALTER TABLE invoice_routes DROP CONSTRAINT IF EXISTS invoice_routes_invoice_id_fkey;
ALTER TABLE invoice_routes ADD CONSTRAINT invoice_routes_invoice_id_fkey 
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;

ALTER TABLE invoice_routes DROP CONSTRAINT IF EXISTS invoice_routes_route_id_fkey;
ALTER TABLE invoice_routes ADD CONSTRAINT invoice_routes_route_id_fkey 
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE;

-- 7. vehicles (owner_representative)
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_owner_representative_id_fkey;
ALTER TABLE vehicles ADD CONSTRAINT vehicles_owner_representative_id_fkey 
    FOREIGN KEY (owner_representative_id) REFERENCES representatives(id) ON DELETE SET NULL;
