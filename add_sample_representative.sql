-- إضافة مندوب تجريبي
-- ملاحظة: يجب تشغيل هذا الكود في Supabase SQL Editor

-- 1. أولاً: تأكد من وجود مستخدم بدور "representative"
-- إذا لم يكن موجوداً، أضف واحد:
INSERT INTO users (email, full_name, phone, role, is_active)
VALUES 
    ('rep1@example.com', 'أحمد محمد', '01012345678', 'representative', true)
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- 2. ثانياً: أضف المستخدم إلى جدول representatives
-- استبدل 'USER_ID_HERE' بالـ ID الذي حصلت عليه من الخطوة السابقة
-- أو استخدم هذا الكود:

INSERT INTO representatives (user_id, license_number, license_expiry_date, is_available)
SELECT 
    id,
    'LIC-12345',
    '2025-12-31',
    true
FROM users 
WHERE email = 'rep1@example.com' 
  AND role = 'representative'
ON CONFLICT DO NOTHING;

-- 3. تحقق من النتيجة:
SELECT 
    r.id as representative_id,
    u.full_name,
    u.email,
    r.license_number,
    r.is_available
FROM representatives r
JOIN users u ON r.user_id = u.id
WHERE u.role = 'representative';
