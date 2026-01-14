-- إعادة ترقيم جميع العقود الموجودة بترتيب تسلسلي صحيح
-- هذا السكريبت سيعيد ترقيم كل العقود من CON-0001 بناءً على تاريخ الإنشاء

-- أولاً: تحديث جميع العقود بأرقام تسلسلية جديدة
WITH numbered_contracts AS (
    SELECT 
        id,
        'CON-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0') as new_number
    FROM contracts
    ORDER BY created_at
)
UPDATE contracts
SET contract_number = numbered_contracts.new_number
FROM numbered_contracts
WHERE contracts.id = numbered_contracts.id;

-- ثانياً: تحديث الـ sequence ليبدأ من الرقم الصحيح بعد آخر عقد
SELECT setval('contract_number_seq', 
    COALESCE((SELECT MAX(CAST(SUBSTRING(contract_number FROM 5) AS INTEGER)) FROM contracts WHERE contract_number LIKE 'CON-%'), 0)
);

-- عرض النتيجة للتأكد
SELECT contracts.contract_number, hospitals.name as hospital_name, contracts.created_at 
FROM contracts 
LEFT JOIN hospitals ON contracts.hospital_id = hospitals.id
ORDER BY contracts.contract_number;
