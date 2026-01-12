-- إضافة نظام الترقيم التسلسلي للنظام

-- ===================================
-- 1. إضافة أعمدة الأرقام التسلسلية
-- ===================================

-- إضافة رقم تسلسلي لخطوط السير (Routes)
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_number TEXT UNIQUE;

-- إضافة رقم تسلسلي لإيصالات الاستلام (في route_stops)
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS receipt_number TEXT UNIQUE;

-- إضافة رقم تسلسلي لإيصالات المحرقة (Incinerator Deliveries)
ALTER TABLE incinerator_deliveries ADD COLUMN IF NOT EXISTS delivery_number TEXT UNIQUE;

-- ===================================
-- 2. إنشاء Sequences للترقيم
-- ===================================

-- Sequence لخطوط السير (L0001, L0002, ...)
CREATE SEQUENCE IF NOT EXISTS route_number_seq START 1;

-- Sequence لإيصالات الاستلام (R0001, R0002, ...)
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

-- Sequence لإيصالات المحرقة (D0001, D0002, ...)
CREATE SEQUENCE IF NOT EXISTS delivery_number_seq START 1;

-- ===================================
-- 3. دوال لتوليد الأرقام التسلسلية
-- ===================================

-- دالة لتوليد رقم خط السير
CREATE OR REPLACE FUNCTION generate_route_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    route_num TEXT;
BEGIN
    next_num := nextval('route_number_seq');
    route_num := 'L' || LPAD(next_num::TEXT, 4, '0');
    RETURN route_num;
END;
$$ LANGUAGE plpgsql;

-- دالة لتوليد رقم إيصال الاستلام
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    receipt_num TEXT;
BEGIN
    next_num := nextval('receipt_number_seq');
    receipt_num := 'R' || LPAD(next_num::TEXT, 4, '0');
    RETURN receipt_num;
END;
$$ LANGUAGE plpgsql;

-- دالة لتوليد رقم إيصال المحرقة
CREATE OR REPLACE FUNCTION generate_delivery_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    delivery_num TEXT;
BEGIN
    next_num := nextval('delivery_number_seq');
    delivery_num := 'D' || LPAD(next_num::TEXT, 4, '0');
    RETURN delivery_num;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 4. Triggers لتوليد الأرقام تلقائياً
-- ===================================

-- Trigger لخطوط السير
CREATE OR REPLACE FUNCTION set_route_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.route_number IS NULL THEN
        NEW.route_number := generate_route_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_route_number ON routes;
CREATE TRIGGER trigger_set_route_number
    BEFORE INSERT ON routes
    FOR EACH ROW
    EXECUTE FUNCTION set_route_number();

-- Trigger لإيصالات الاستلام
CREATE OR REPLACE FUNCTION set_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
    -- فقط عند إضافة collection_details (يعني تم الاستلام)
    IF NEW.receipt_number IS NULL AND NEW.collection_details IS NOT NULL THEN
        NEW.receipt_number := generate_receipt_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_receipt_number ON route_stops;
CREATE TRIGGER trigger_set_receipt_number
    BEFORE INSERT OR UPDATE ON route_stops
    FOR EACH ROW
    EXECUTE FUNCTION set_receipt_number();

-- Trigger لإيصالات المحرقة
CREATE OR REPLACE FUNCTION set_delivery_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.delivery_number IS NULL THEN
        NEW.delivery_number := generate_delivery_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_delivery_number ON incinerator_deliveries;
CREATE TRIGGER trigger_set_delivery_number
    BEFORE INSERT ON incinerator_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION set_delivery_number();

-- ===================================
-- 5. تحديث السجلات الموجودة (اختياري)
-- ===================================

-- تحديث خطوط السير الموجودة
WITH numbered_routes AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
    FROM routes
    WHERE route_number IS NULL
)
UPDATE routes
SET route_number = 'L' || LPAD(numbered_routes.rn::TEXT, 4, '0')
FROM numbered_routes
WHERE routes.id = numbered_routes.id;

-- تحديث إيصالات الاستلام الموجودة
WITH numbered_receipts AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY collection_details->>'collection_time') as rn
    FROM route_stops
    WHERE receipt_number IS NULL AND collection_details IS NOT NULL
)
UPDATE route_stops
SET receipt_number = 'R' || LPAD(numbered_receipts.rn::TEXT, 4, '0')
FROM numbered_receipts
WHERE route_stops.id = numbered_receipts.id;

-- تحديث إيصالات المحرقة الموجودة
WITH numbered_deliveries AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
    FROM incinerator_deliveries
    WHERE delivery_number IS NULL
)
UPDATE incinerator_deliveries
SET delivery_number = 'D' || LPAD(numbered_deliveries.rn::TEXT, 4, '0')
FROM numbered_deliveries
WHERE incinerator_deliveries.id = numbered_deliveries.id;

-- ===================================
-- 6. تحديث Sequences بناءً على البيانات الموجودة
-- ===================================

-- تحديث sequence خطوط السير
SELECT setval('route_number_seq', COALESCE((SELECT MAX(SUBSTRING(route_number FROM 2)::INTEGER) FROM routes WHERE route_number IS NOT NULL), 0) + 1, false);

-- تحديث sequence إيصالات الاستلام
SELECT setval('receipt_number_seq', COALESCE((SELECT MAX(SUBSTRING(receipt_number FROM 2)::INTEGER) FROM route_stops WHERE receipt_number IS NOT NULL), 0) + 1, false);

-- تحديث sequence إيصالات المحرقة
SELECT setval('delivery_number_seq', COALESCE((SELECT MAX(SUBSTRING(delivery_number FROM 2)::INTEGER) FROM incinerator_deliveries WHERE delivery_number IS NOT NULL), 0) + 1, false);

-- ===================================
-- ملاحظات:
-- ===================================
-- - L0001: خط السير (Route/Line)
-- - R0001: إيصال الاستلام (Receipt)
-- - D0001: إيصال المحرقة (Delivery)
-- - الأرقام تبدأ من 0001 وتزيد تلقائياً
-- - الأرقام فريدة (UNIQUE) لكل نوع
-- - يتم توليدها تلقائياً عند الإنشاء
