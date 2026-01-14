-- Add new fields to vehicles table
-- تحديث جدول المركبات بإضافة حقول جديدة

-- Add license renewal date
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS license_renewal_date DATE;

COMMENT ON COLUMN vehicles.license_renewal_date IS 'تاريخ تجديد الرخصة';

-- Add owner representative (foreign key to representatives table)
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS owner_representative_id UUID REFERENCES representatives(id) ON DELETE SET NULL;

COMMENT ON COLUMN vehicles.owner_representative_id IS 'المندوب المالك للمركبة';

-- Create index for license renewal date to easily find expiring licenses
CREATE INDEX IF NOT EXISTS idx_vehicles_license_renewal ON vehicles(license_renewal_date);

-- Create index for owner representative
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_rep ON vehicles(owner_representative_id);
