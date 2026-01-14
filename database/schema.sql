-- Database Schema for Medical Waste Management System
-- System: PostgreSQL (Supabase)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS (المستخدمون)
CREATE TYPE user_role AS ENUM ('admin', 'logistics_manager', 'accountant', 'representative', 'supervisor');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'representative',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. VEHICLES (المركبات) - New based on plan
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plate_number TEXT UNIQUE NOT NULL,
    model TEXT,
    capacity_kg NUMERIC,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. REPRESENTATIVES (المندوبين)
CREATE TABLE representatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    license_number TEXT,
    license_expiry_date DATE,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HOSPITALS (المستشفيات)
CREATE TABLE hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    location JSONB, -- {lat, lng} - Added based on plan
    contact_person TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CONTRACTS (العقود)
CREATE TYPE contract_status AS ENUM ('active', 'expired', 'renewed', 'cancelled');

CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    contract_number TEXT UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price_per_kg NUMERIC NOT NULL,
    alert_before_days INTEGER DEFAULT 90,
    status contract_status DEFAULT 'active',
    notes TEXT,
    attachments JSONB, -- Array of URLs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INCINERATORS (المحارق)
CREATE TABLE incinerators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location TEXT, -- Can be expanded to JSONB later if needed
    capacity_per_day NUMERIC,
    cost_per_kg NUMERIC,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ROUTES (خطوط السير)
CREATE TYPE route_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_name TEXT,
    representative_id UUID REFERENCES representatives(id),
    vehicle_id UUID REFERENCES vehicles(id), -- Added based on plan
    incinerator_id UUID REFERENCES incinerators(id),
    route_date DATE NOT NULL,
    status route_status DEFAULT 'pending',
    
    -- Estimations
    estimated_start_time TIME,
    estimated_duration_minutes INTEGER,
    
    -- Actual Execution
    start_time TIMESTAMPTZ,
    start_location JSONB, -- {lat, lng}
    end_time TIMESTAMPTZ,
    end_location JSONB, -- {lat, lng}
    
    -- Weights
    total_weight_collected NUMERIC DEFAULT 0,
    final_weight_at_incinerator NUMERIC,
    
    -- Completion
    supervisor_id UUID REFERENCES users(id),
    closed_at TIMESTAMPTZ,
    
    -- Issues
    is_delayed BOOLEAN DEFAULT false,
    delay_reason TEXT,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ROUTE_STOPS (محطات خط السير)
CREATE TYPE stop_status AS ENUM ('pending', 'arrived', 'collected', 'skipped');

CREATE TABLE route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES hospitals(id),
    stop_order INTEGER NOT NULL,
    status stop_status DEFAULT 'pending',
    
    -- Estimations
    estimated_arrival_time TIME,
    estimated_duration_minutes INTEGER,
    
    -- Actual Execution
    arrival_time TIMESTAMPTZ,
    arrival_location JSONB,
    departure_time TIMESTAMPTZ,
    departure_location JSONB,
    
    -- Collection Data
    weight_collected NUMERIC,
    weight_entry_time TIMESTAMPTZ,
    weight_entry_location JSONB,
    
    -- Verification
    hospital_signature JSONB, -- URL or signature data
    signature_time TIMESTAMPTZ,
    signature_location JSONB,
    photo_proof TEXT, -- URL
    photo_upload_time TIMESTAMPTZ,
    photo_upload_location JSONB,
    
    -- Issues
    is_delayed BOOLEAN DEFAULT false,
    delay_minutes INTEGER,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ROUTE_TRACKING_LOGS (سجل التتبع)
CREATE TYPE tracking_event_type AS ENUM (
    'route_started', 'arrived_hospital', 'departed_hospital', 
    'weight_entered', 'photo_uploaded', 'signature_taken', 
    'arrived_incinerator', 'route_completed'
);

CREATE TABLE route_tracking_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    route_stop_id UUID REFERENCES route_stops(id),
    event_type tracking_event_type NOT NULL,
    event_time TIMESTAMPTZ DEFAULT NOW(),
    location JSONB NOT NULL, -- {lat, lng, accuracy}
    data JSONB, -- Additional metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. INVOICES (الفواتير)
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    hospital_id UUID REFERENCES hospitals(id),
    contract_id UUID REFERENCES contracts(id),
    
    invoice_date DATE DEFAULT CURRENT_DATE,
    from_date DATE,
    to_date DATE,
    
    total_weight NUMERIC,
    price_per_kg NUMERIC,
    subtotal NUMERIC,
    tax NUMERIC,
    total_amount NUMERIC,
    
    status invoice_status DEFAULT 'draft',
    due_date DATE,
    paid_date DATE,
    payment_method TEXT,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. INVOICE_ROUTES (New table for linking)
CREATE TABLE invoice_routes (
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    route_id UUID REFERENCES routes(id), -- Not cascading delete to preserve history, or careful handling
    PRIMARY KEY (invoice_id, route_id)
);

-- 12. EXPENSES (المصاريف)
CREATE TYPE expense_type AS ENUM ('salaries', 'utilities', 'other');

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_type expense_type NOT NULL,
    description TEXT,
    amount NUMERIC NOT NULL,
    expense_date DATE DEFAULT CURRENT_DATE,
    category TEXT,
    reference_id UUID,
    approved_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. INCINERATOR_TRANSACTIONS (معاملات المحرقة)
CREATE TABLE incinerator_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID REFERENCES routes(id),
    incinerator_id UUID REFERENCES incinerators(id),
    weight NUMERIC NOT NULL,
    cost_per_kg NUMERIC NOT NULL,
    total_cost NUMERIC NOT NULL,
    transaction_date DATE DEFAULT CURRENT_DATE,
    receipt_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. NOTIFICATIONS (الإشعارات)
CREATE TYPE notification_type AS ENUM ('contract_expiry', 'route_assigned', 'route_completed', 'invoice_overdue', 'delay_alert');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    is_read BOOLEAN DEFAULT false,
    related_id UUID,
    related_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. USER_ACTIVITY_LOGS (سجل النشاط)
CREATE TABLE user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    description TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enabling RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE incinerators ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_tracking_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incinerator_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Note: Policies need to be defined based on specific access control rules.
-- Example: Representatives can only read their own routes.
