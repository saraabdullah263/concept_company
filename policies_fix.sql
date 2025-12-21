-- ============================================
-- POLICIES FIX - حل التعارضات المحتملة
-- ============================================
-- هذا الملف يحتوي على نسخة محسنة من الـ policies
-- لتجنب التعارضات وتحسين الأداء

-- ============================================
-- الخطوة 1: حذف Policies القديمة (إذا كانت موجودة)
-- ============================================
-- قم بتنفيذ هذا القسم فقط إذا كنت تريد إعادة إنشاء كل شيء من جديد

-- DROP POLICY IF EXISTS "Allow read access for authenticated users" ON users;
-- DROP POLICY IF EXISTS "Allow insert/update for own profile" ON users;
-- DROP POLICY IF EXISTS "Allow all access for admins" ON users;
-- DROP POLICY IF EXISTS "Allow insert for authenticated" ON users;
-- DROP POLICY IF EXISTS "Enable access to all users" ON vehicles;
-- DROP POLICY IF EXISTS "Enable access to all users" ON representatives;
-- DROP POLICY IF EXISTS "Enable access to all users" ON hospitals;
-- DROP POLICY IF EXISTS "Enable access to all users" ON contracts;
-- DROP POLICY IF EXISTS "Enable access to all users" ON incinerators;
-- DROP POLICY IF EXISTS "Enable access to all users" ON routes;
-- DROP POLICY IF EXISTS "Enable access to all users" ON route_stops;
-- DROP POLICY IF EXISTS "Enable access to all users" ON route_tracking_logs;
-- DROP POLICY IF EXISTS "Enable access to all users" ON invoices;
-- DROP POLICY IF EXISTS "Enable access to all users" ON invoice_routes;
-- DROP POLICY IF EXISTS "Enable access to all users" ON expenses;
-- DROP POLICY IF EXISTS "Enable access to all users" ON incinerator_transactions;
-- DROP POLICY IF EXISTS "Enable access to all users" ON notifications;

-- ============================================
-- الخطوة 2: التأكد من تفعيل RLS
-- ============================================
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

-- ============================================
-- الخطوة 3: Policies الجديدة المحسنة
-- ============================================

-- =====================
-- جدول users
-- =====================
-- قراءة: أي مستخدم مسجل يمكنه رؤية المستخدمين الآخرين
CREATE POLICY "users_select_authenticated" 
ON users FOR SELECT 
TO authenticated 
USING (true);

-- إضافة: أي مستخدم مسجل يمكنه إضافة مستخدمين (للتسجيل الأولي)
CREATE POLICY "users_insert_authenticated" 
ON users FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- تعديل: يمكن تعديل البيانات الخاصة أو إذا كان admin
CREATE POLICY "users_update_own_or_admin" 
ON users FOR UPDATE 
TO authenticated 
USING (
    id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- حذف: Admin فقط
CREATE POLICY "users_delete_admin_only" 
ON users FOR DELETE 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- =====================
-- باقي الجداول: سياسة موحدة
-- =====================
-- نظراً لأن هذا نظام ERP داخلي، نسمح بالوصول الكامل للمستخدمين المصرح لهم

CREATE POLICY "vehicles_all_authenticated" 
ON vehicles FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "representatives_all_authenticated" 
ON representatives FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "hospitals_all_authenticated" 
ON hospitals FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "contracts_all_authenticated" 
ON contracts FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "incinerators_all_authenticated" 
ON incinerators FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "routes_all_authenticated" 
ON routes FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "route_stops_all_authenticated" 
ON route_stops FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "route_tracking_logs_all_authenticated" 
ON route_tracking_logs FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "invoices_all_authenticated" 
ON invoices FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "invoice_routes_all_authenticated" 
ON invoice_routes FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "expenses_all_authenticated" 
ON expenses FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "incinerator_transactions_all_authenticated" 
ON incinerator_transactions FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "notifications_all_authenticated" 
ON notifications FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "user_activity_logs_all_authenticated" 
ON user_activity_logs FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ============================================
-- ملاحظات:
-- ============================================
/*
الفرق بين النسخة الأصلية والنسخة المحسنة:

النسخة الأصلية (policies.sql):
----------------------------------
- جدول users: 4 policies منفصلة قد تتعارض
- باقي الجداول: policy واحدة بنفس الاسم لكل جدول

النسخة المحسنة (هذا الملف):
----------------------------------
- جدول users: 4 policies واضحة حسب العملية (SELECT, INSERT, UPDATE, DELETE)
- باقي الجداول: policy واحدة شاملة (FOR ALL) مع أسماء فريدة
- إضافة user_activity_logs

مزايا النسخة المحسنة:
-----------------------
1. أسماء فريدة لكل policy تمنع التعارضات
2. توزيع واضح للصلاحيات حسب العملية
3. أداء أفضل (policy واحدة بدلاً من عدة policies)
4. سهولة الصيانة والفهم

متى تستخدم هذا الملف:
------------------------
إذا واجهتك مشاكل مع الـ policies الحالية، استخدم هذا الملف كالتالي:
1. انسخ قسم "الخطوة 1" (بعد إزالة التعليق) لحذف القديم
2. نفذ "الخطوة 2" و "الخطوة 3" لإنشاء Policies جديدة
3. تحقق من عمل النظام

*/
