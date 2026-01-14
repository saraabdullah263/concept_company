-- إضافة عمود contract_number إذا لم يكن موجوداً
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS contract_number TEXT;

-- إنشاء sequence للعقود
CREATE SEQUENCE IF NOT EXISTS contract_number_seq START 1;

-- إنشاء دالة لتوليد رقم العقد
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.contract_number IS NULL THEN
        NEW.contract_number := 'CON-' || LPAD(nextval('contract_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للعقود الجديدة
DROP TRIGGER IF EXISTS set_contract_number ON contracts;
CREATE TRIGGER set_contract_number
    BEFORE INSERT ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION generate_contract_number();

-- تحديث العقود الموجودة بأرقام تسلسلية
WITH numbered_contracts AS (
    SELECT 
        id,
        'CON-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0') as new_number
    FROM contracts
    WHERE contract_number IS NULL OR contract_number = '' OR contract_number NOT LIKE 'CON-%'
)
UPDATE contracts
SET contract_number = numbered_contracts.new_number
FROM numbered_contracts
WHERE contracts.id = numbered_contracts.id;

-- تحديث sequence ليبدأ من الرقم الصحيح
SELECT setval('contract_number_seq', 
    COALESCE((SELECT MAX(CAST(SUBSTRING(contract_number FROM 5) AS INTEGER)) FROM contracts WHERE contract_number LIKE 'CON-%'), 0)
);
