-- فحص نظام الترقيم التسلسلي

-- 1. فحص الأعمدة
SELECT 'Checking columns...' as status;

SELECT 
    'routes.route_number' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'routes' AND column_name = 'route_number'
    ) as exists;

SELECT 
    'route_stops.receipt_number' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'route_stops' AND column_name = 'receipt_number'
    ) as exists;

SELECT 
    'incinerator_deliveries.delivery_number' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'incinerator_deliveries' AND column_name = 'delivery_number'
    ) as exists;

-- 2. فحص الـ Sequences
SELECT 'Checking sequences...' as status;

SELECT sequence_name 
FROM information_schema.sequences 
WHERE sequence_name IN ('route_number_seq', 'receipt_number_seq', 'delivery_number_seq');

-- 3. فحص الـ Functions
SELECT 'Checking functions...' as status;

SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('generate_route_number', 'generate_receipt_number', 'generate_delivery_number');

-- 4. فحص الـ Triggers
SELECT 'Checking triggers...' as status;

SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_set_route_number', 'trigger_set_receipt_number', 'trigger_set_delivery_number');

-- 5. فحص البيانات الموجودة
SELECT 'Checking existing data...' as status;

SELECT 
    'routes' as table_name,
    COUNT(*) as total_records,
    COUNT(route_number) as with_number,
    COUNT(*) - COUNT(route_number) as without_number
FROM routes;

SELECT 
    'route_stops' as table_name,
    COUNT(*) as total_records,
    COUNT(receipt_number) as with_number,
    COUNT(*) - COUNT(receipt_number) as without_number
FROM route_stops
WHERE collection_details IS NOT NULL;

SELECT 
    'incinerator_deliveries' as table_name,
    COUNT(*) as total_records,
    COUNT(delivery_number) as with_number,
    COUNT(*) - COUNT(delivery_number) as without_number
FROM incinerator_deliveries;
