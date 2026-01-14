-- ========================================
-- إصلاح صلاحيات الإشعارات - نهائي
-- ========================================

-- 1. أولاً: شوف السياسات الموجودة
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'notifications';

-- 2. حذف كل السياسات
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'notifications'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON notifications', pol.policyname);
    END LOOP;
END $$;

-- 3. تأكد إن RLS مفعل
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. تأكد إن RLS يطبق على owner كمان
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

-- 5. إنشاء السياسات الجديدة
CREATE POLICY "select_own" ON notifications 
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "update_own" ON notifications 
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "delete_own" ON notifications 
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "insert_any" ON notifications 
    FOR INSERT WITH CHECK (true);

-- 6. تأكد من التطبيق
SELECT tablename, rowsecurity, forcerowsecurity 
FROM pg_tables 
WHERE tablename = 'notifications';
