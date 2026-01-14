-- ============================================
-- QUERIES FOR DATABASE VERIFICATION
-- ============================================
-- استعلامات للتحقق من حالة قاعدة البيانات وعرض البيانات
-- نفذ كل استعلام في SQL Editor في Supabase والصق النتيجة بعده

-- ============================================
-- 1. التحقق من الجداول الموجودة
-- ============================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

/*
النتيجة:
-----------
(أضف النتيجة هنا)
[
  {
    "table_name": "contracts"
  },
  {
    "table_name": "expenses"
  },
  {
    "table_name": "hospitals"
  },
  {
    "table_name": "incinerator_transactions"
  },
  {
    "table_name": "incinerators"
  },
  {
    "table_name": "invoice_routes"
  },
  {
    "table_name": "invoices"
  },
  {
    "table_name": "notifications"
  },
  {
    "table_name": "representatives"
  },
  {
    "table_name": "route_stops"
  },
  {
    "table_name": "route_tracking_logs"
  },
  {
    "table_name": "routes"
  },
  {
    "table_name": "user_activity_logs"
  },
  {
    "table_name": "users"
  },
  {
    "table_name": "vehicles"
  }
]

*/

-- ============================================
-- 2. التحقق من Policies الموجودة
-- ============================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

/*
النتيجة:
-----------
(أضف النتيجة هنا)
[
  {
    "schemaname": "public",
    "tablename": "hospitals",
    "policyname": "Enable access to all users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "route_stops",
    "policyname": "Enable access to all users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "routes",
    "policyname": "Enable access to all users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow read access",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Enable access to all users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "vehicles",
    "policyname": "Enable access to all users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": null
  }
]

*/

-- ============================================
-- 3. فحص تعارضات Policies المحتملة
-- ============================================
-- هذا الاستعلام يعرض Policies المتعددة على نفس الجدول
SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
HAVING COUNT(*) > 1
ORDER BY policy_count DESC;

/*
النتيجة:
-----------
(أضف النتيجة هنا)
[
  {
    "tablename": "users",
    "policy_count": 2,
    "policies": "Allow read access, Enable access to all users"
  }
]

*/

-- ============================================
-- 4. عرض المستخدمين الموجودين
-- ============================================
SELECT 
    id,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM users
ORDER BY created_at DESC;

/*
النتيجة:
-----------
(أضف النتيجة هنا)

[
  {
    "id": "cff16f22-6bdb-4ec5-a65c-8447d61dd314",
    "email": "ahmed@concept.com",
    "full_name": "ahmed",
    "role": "representative",
    "is_active": true,
    "created_at": "2025-12-17 16:34:26.304799+00"
  }
]
*/

-- ============================================
-- 5. عرض المستشفيات
-- ============================================
SELECT 
    id,
    name,
    address,
    contact_person,
    contact_phone,
    is_active,
    created_at
FROM hospitals
ORDER BY name;

/*
النتيجة:
-----------
(أضف النتيجة هنا)
[
  {
    "id": "e7bb02f1-7d2d-4d71-9263-e412508f496a",
    "name": "مستشفى 1",
    "address": "شارع الاول",
    "contact_person": "احمد",
    "contact_phone": "01034455667",
    "is_active": true,
    "created_at": "2025-12-17 16:35:05.183839+00"
  }
]

*/

-- ============================================
-- 6. عرض العقود
-- ============================================
SELECT 
    c.id,
    h.name as hospital_name,
    c.start_date,
    c.end_date,
    c.price_per_kg,
    c.status,
    c.created_at
FROM contracts c
LEFT JOIN hospitals h ON c.hospital_id = h.id
ORDER BY c.created_at DESC;

/*
النتيجة:
-----------
(أضف النتيجة هنا)


*/

-- ============================================
-- 7. عرض المركبات
-- ============================================
SELECT 
    id,
    plate_number,
    model,
    capacity_kg,
    is_active,
    created_at
FROM vehicles
ORDER BY created_at DESC;

/*
النتيجة:
-----------
(أضف النتيجة هنا)


*/

-- ============================================
-- 8. عرض خطوط السير
-- ============================================
SELECT 
    r.id,
    r.route_name,
    r.route_date,
    u.full_name as representative_name,
    v.plate_number,
    r.status,
    r.total_weight_collected,
    r.created_at
FROM routes r
LEFT JOIN representatives rep ON r.representative_id = rep.id
LEFT JOIN users u ON rep.user_id = u.id
LEFT JOIN vehicles v ON r.vehicle_id = v.id
ORDER BY r.route_date DESC, r.created_at DESC
LIMIT 20;

/*
النتيجة:
-----------
(أضف النتيجة هنا)


*/

-- ============================================
-- 9. عرض الفواتير
-- ============================================
SELECT 
    i.id,
    i.invoice_number,
    h.name as hospital_name,
    i.total_amount,
    i.status,
    i.due_date,
    i.created_at
FROM invoices i
LEFT JOIN hospitals h ON i.hospital_id = h.id
ORDER BY i.created_at DESC
LIMIT 20;

/*
النتيجة:
-----------
(أضف النتيجة هنا)


*/

-- ============================================
-- 10. عرض المصروفات
-- ============================================
SELECT 
    id,
    description,
    amount,
    category,
    date,
    created_at
FROM expenses
ORDER BY date DESC, created_at DESC
LIMIT 20;

/*
النتيجة:
-----------
(أضف النتيجة هنا)


*/

-- ============================================
-- 11. التحقق من Foreign Keys
-- ============================================
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

/*
النتيجة:
-----------
(أضف النتيجة هنا)


*/

-- ============================================
-- 12. فحص الأعمدة في جدول expenses
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'expenses'
ORDER BY ordinal_position;

/*
النتيجة:
-----------
(أضف النتيجة هنا)


*/

-- ============================================
-- 13. فحص تطابق Auth.users مع public.users
-- ============================================
-- هذا الاستعلام يتحقق من المستخدمين في Auth ولكن ليسوا في public.users
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created_at,
    pu.id as public_user_id
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

/*
النتيجة:
-----------
(أضف النتيجة هنا)


*/

-- ============================================
-- 14. إحصائيات عامة
-- ============================================
SELECT 
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'hospitals', COUNT(*) FROM hospitals
UNION ALL
SELECT 'contracts', COUNT(*) FROM contracts
UNION ALL
SELECT 'vehicles', COUNT(*) FROM vehicles
UNION ALL
SELECT 'routes', COUNT(*) FROM routes
UNION ALL
SELECT 'route_stops', COUNT(*) FROM route_stops
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses
ORDER BY table_name;

/*
النتيجة:
-----------
(أضف النتيجة هنا)


*/

-- ============================================
--ملاحظات حول Policies
-- ============================================
/*
التحليل:
---------
الـ policies الموجودة في policies.sql تبدو متوافقة مع النظام، ولكن يجب مراجعة:

1. جدول users لديه 4 policies:
   - "Allow read access for authenticated users" - للقراءة
   - "Allow insert/update for own profile" - للتعديل الشخصي
   - "Allow all access for admins" - للمسؤولين
   - "Allow insert for authenticated" - للإضافة
   
   ⚠️ تنبيه: هناك احتمال تعارض بين policy "Allow insert for authenticated" 
   و policy "Allow insert/update for own profile" لأن الأولى تسمح بإضافة أي مستخدم
   بينما الثانية تحدد فقط التعديل على المستخدم نفسه.
   
   الحل المقترح: إبقاء "Allow insert for authenticated" لأن النظام يحتاج
   إلى إنشاء مستخدمين جدد من صفحة Users.

2. باقي الجداول لديها policy واحدة فقط "Enable access to all users"
   وهذا مناسب لنظام ERP داخلي.

3. ⚠️ جدول user_activity_logs غير مذكور في policies.sql
   يجب إضافة policy له إذا كان موجوداً في القاعدة.

التوصيات:
----------
1. تنفيذ جميع الاستعلامات أعلاه وإضافة النتائج
2. التحقق من عدم وجود policies قديمة متعارضة
3. إذا واجهت مشاكل في الإضافة/التعديل، قد نحتاج لتعديل policies
*/
