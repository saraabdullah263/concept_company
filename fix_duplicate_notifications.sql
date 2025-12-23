-- إصلاح مشكلة الإشعارات المكررة
-- شغل هذا الملف في Supabase SQL Editor

-- 1. حذف كل الـ triggers المكررة
DROP TRIGGER IF EXISTS route_started_notification ON routes;
DROP TRIGGER IF EXISTS route_completed_admin_notification ON routes;
DROP TRIGGER IF EXISTS route_completed_notification ON routes;
DROP TRIGGER IF EXISTS route_status_change_notification ON routes;
DROP TRIGGER IF EXISTS route_updated_notification ON routes;

-- 2. حذف الدوال القديمة
DROP FUNCTION IF EXISTS notify_admin_route_started();
DROP FUNCTION IF EXISTS notify_admin_route_completed();
DROP FUNCTION IF EXISTS notify_route_completed();
DROP FUNCTION IF EXISTS notify_representative_route_updated();

-- 3. إنشاء دالة واحدة موحدة لتغيير حالة الرحلة
CREATE OR REPLACE FUNCTION notify_route_status_change()
RETURNS TRIGGER AS $$
DECLARE
    admin_user RECORD;
    rep_name TEXT;
BEGIN
    -- الحصول على اسم المندوب
    SELECT u.full_name INTO rep_name
    FROM representatives r
    JOIN users u ON r.user_id = u.id
    WHERE r.id = NEW.representative_id;

    -- إذا بدأت الرحلة
    IF NEW.status = 'in_progress' AND OLD.status = 'pending' THEN
        FOR admin_user IN
            SELECT u.id FROM users u WHERE u.role IN ('admin', 'logistics_manager')
        LOOP
            INSERT INTO notifications (user_id, title, message, type, related_id)
            VALUES (
                admin_user.id,
                '🚀 رحلة بدأت',
                'بدأ المندوب ' || COALESCE(rep_name, 'غير معروف') || ' رحلته بتاريخ ' || TO_CHAR(NEW.route_date, 'YYYY-MM-DD'),
                'route_assigned',
                NEW.id
            );
        END LOOP;
    END IF;

    -- إذا اكتملت الرحلة
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        FOR admin_user IN
            SELECT u.id FROM users u WHERE u.role IN ('admin', 'accountant', 'logistics_manager')
        LOOP
            INSERT INTO notifications (user_id, title, message, type, related_id)
            VALUES (
                admin_user.id,
                '✅ رحلة مكتملة',
                'أكمل المندوب ' || COALESCE(rep_name, 'غير معروف') || ' رحلته بتاريخ ' || TO_CHAR(NEW.route_date, 'YYYY-MM-DD'),
                'route_completed',
                NEW.id
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. إنشاء trigger واحد فقط
CREATE TRIGGER route_status_change_notification
    AFTER UPDATE ON routes
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_route_status_change();

-- 5. حذف الإشعارات المكررة القديمة (اختياري)
-- DELETE FROM notifications 
-- WHERE id NOT IN (
--     SELECT MIN(id) 
--     FROM notifications 
--     GROUP BY user_id, title, message, DATE(created_at)
-- );

SELECT 'تم إصلاح مشكلة الإشعارات المكررة بنجاح!' as result;
