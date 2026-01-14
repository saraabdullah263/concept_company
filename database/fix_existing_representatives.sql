-- إضافة المندوبين الموجودين في جدول users إلى جدول representatives
-- شغل هذا الكود في Supabase SQL Editor

-- إضافة كل المستخدمين اللي عندهم role = 'representative' 
-- لكن مش موجودين في جدول representatives
INSERT INTO representatives (user_id, is_available)
SELECT 
    u.id,
    true
FROM users u
WHERE u.role = 'representative'
  AND u.is_active = true
  AND NOT EXISTS (
      SELECT 1 
      FROM representatives r 
      WHERE r.user_id = u.id
  );

-- تحقق من النتيجة
SELECT 
    r.id as representative_id,
    u.full_name,
    u.email,
    u.phone,
    r.is_available
FROM representatives r
JOIN users u ON r.user_id = u.id
WHERE u.role = 'representative';
