-- Update hospitals table to support clients with new fields
-- Add new columns for client management

-- Add client type column
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS client_type VARCHAR(50) DEFAULT 'hospital';

COMMENT ON COLUMN hospitals.client_type IS 'نوع العميل: clinic, lab, hospital, medical_center';

-- Add detailed address fields
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS governorate VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS detailed_address TEXT;

COMMENT ON COLUMN hospitals.governorate IS 'المحافظة';
COMMENT ON COLUMN hospitals.city IS 'المدينة';
COMMENT ON COLUMN hospitals.detailed_address IS 'العنوان بالتفصيل';

-- Add location coordinates
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

COMMENT ON COLUMN hospitals.latitude IS 'خط العرض';
COMMENT ON COLUMN hospitals.longitude IS 'خط الطول';

-- Add parent organization/entity
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS parent_entity VARCHAR(200);

COMMENT ON COLUMN hospitals.parent_entity IS 'الجهة التابع لها (مثل: وزارة الصحة، القطاع الخاص)';

-- Add additional contact fields
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS contact_mobile VARCHAR(20),
ADD COLUMN IF NOT EXISTS contact_landline VARCHAR(20),
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(200);

COMMENT ON COLUMN hospitals.contact_person_name IS 'اسم مسئول التواصل';
COMMENT ON COLUMN hospitals.contact_mobile IS 'رقم الموبايل';
COMMENT ON COLUMN hospitals.contact_landline IS 'رقم أرضي';
COMMENT ON COLUMN hospitals.contact_email IS 'البريد الإلكتروني';

-- Update existing records to have default client_type
UPDATE hospitals 
SET client_type = 'hospital' 
WHERE client_type IS NULL;

-- Migrate existing contact data if available
UPDATE hospitals 
SET contact_person_name = contact_person,
    contact_mobile = contact_phone
WHERE contact_person IS NOT NULL OR contact_phone IS NOT NULL;

-- Add contract information fields
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS annual_visits_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS annual_contract_price DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN hospitals.annual_visits_count IS 'عدد الزيارات السنوية المتفق عليها';
COMMENT ON COLUMN hospitals.annual_contract_price IS 'سعر التعاقد السنوي (بالجنيه المصري)';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_hospitals_client_type ON hospitals(client_type);
CREATE INDEX IF NOT EXISTS idx_hospitals_governorate ON hospitals(governorate);
CREATE INDEX IF NOT EXISTS idx_hospitals_city ON hospitals(city);
