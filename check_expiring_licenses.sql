-- إضافة عمود reference_id إذا لم يكن موجوداً
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id UUID;

-- إضافة القيم الجديدة للـ enum إذا كان موجوداً
DO $$
BEGIN
    -- محاولة إضافة القيم الجديدة للـ enum
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'vehicle_license';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'rep_license';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'contract';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'route';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'invoice';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'general';
EXCEPTION
    WHEN others THEN
        -- إذا فشل، نحول العمود إلى TEXT
        ALTER TABLE notifications ALTER COLUMN type TYPE TEXT;
END $$;

-- دالة لإنشاء إشعارات للرخص القريبة من الانتهاء (المركبات والمندوبين)
-- يمكن تمرير عدد الأيام كمعامل (افتراضي 30 يوم)
CREATE OR REPLACE FUNCTION notify_expiring_licenses(alert_days INTEGER DEFAULT 30)
RETURNS void AS $$
DECLARE
    vehicle_record RECORD;
    rep_record RECORD;
    contract_record RECORD;
    admin_user RECORD;
    notification_exists BOOLEAN;
BEGIN
    -- 1. إشعارات رخص المركبات
    FOR vehicle_record IN
        SELECT v.id, v.plate_number, v.license_renewal_date
        FROM vehicles v
        WHERE v.license_renewal_date IS NOT NULL
        AND v.license_renewal_date BETWEEN CURRENT_DATE AND CURRENT_DATE + (alert_days || ' days')::INTERVAL
    LOOP
        FOR admin_user IN
            SELECT u.id FROM users u WHERE u.role IN ('admin', 'logistics_manager')
        LOOP
            -- تحقق من عدم وجود إشعار مكرر
            SELECT EXISTS(
                SELECT 1 FROM notifications 
                WHERE reference_id = vehicle_record.id 
                AND type = 'vehicle_license'
                AND created_at > CURRENT_DATE - INTERVAL '7 days'
            ) INTO notification_exists;
            
            IF NOT notification_exists THEN
                INSERT INTO notifications (user_id, title, message, type, reference_id)
                VALUES (
                    admin_user.id,
                    '⚠️ رخصة مركبة على وشك الانتهاء',
                    'رخصة المركبة ' || vehicle_record.plate_number || ' تنتهي في ' || TO_CHAR(vehicle_record.license_renewal_date, 'YYYY-MM-DD'),
                    'vehicle_license',
                    vehicle_record.id
                );
            END IF;
        END LOOP;
    END LOOP;

    -- 2. إشعارات رخص المندوبين
    FOR rep_record IN
        SELECT r.id, r.license_number, r.license_expiry_date, u.full_name
        FROM representatives r
        JOIN users u ON r.user_id = u.id
        WHERE r.license_expiry_date IS NOT NULL
        AND r.license_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + (alert_days || ' days')::INTERVAL
    LOOP
        FOR admin_user IN
            SELECT u.id FROM users u WHERE u.role IN ('admin', 'logistics_manager')
        LOOP
            -- تحقق من عدم وجود إشعار مكرر
            SELECT EXISTS(
                SELECT 1 FROM notifications 
                WHERE reference_id = rep_record.id 
                AND type = 'rep_license'
                AND created_at > CURRENT_DATE - INTERVAL '7 days'
            ) INTO notification_exists;
            
            IF NOT notification_exists THEN
                INSERT INTO notifications (user_id, title, message, type, reference_id)
                VALUES (
                    admin_user.id,
                    '⚠️ رخصة مندوب على وشك الانتهاء',
                    'رخصة المندوب ' || rep_record.full_name || ' تنتهي في ' || TO_CHAR(rep_record.license_expiry_date, 'YYYY-MM-DD'),
                    'rep_license',
                    rep_record.id
                );
            END IF;
        END LOOP;
    END LOOP;

    -- 3. إشعارات العقود القريبة من الانتهاء
    FOR contract_record IN
        SELECT c.id, c.contract_number, h.name as hospital_name, c.end_date
        FROM contracts c
        JOIN hospitals h ON c.hospital_id = h.id
        WHERE c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + (alert_days || ' days')::INTERVAL
        AND c.status = 'active'
    LOOP
        FOR admin_user IN
            SELECT u.id FROM users u WHERE u.role IN ('admin', 'accountant')
        LOOP
            -- تحقق من عدم وجود إشعار مكرر
            SELECT EXISTS(
                SELECT 1 FROM notifications 
                WHERE reference_id = contract_record.id 
                AND type = 'contract'
                AND created_at > CURRENT_DATE - INTERVAL '7 days'
            ) INTO notification_exists;
            
            IF NOT notification_exists THEN
                INSERT INTO notifications (user_id, title, message, type, reference_id)
                VALUES (
                    admin_user.id,
                    '📋 عقد على وشك الانتهاء',
                    'عقد ' || contract_record.hospital_name || ' رقم ' || contract_record.contract_number || ' ينتهي في ' || TO_CHAR(contract_record.end_date, 'YYYY-MM-DD'),
                    'contract',
                    contract_record.id
                );
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تنفيذ الدالة الآن لإنشاء الإشعارات (30 يوم افتراضي)
SELECT notify_expiring_licenses(1);

-- ملاحظة: لتشغيل هذه الدالة تلقائياً يومياً، يمكنك:
-- 1. استخدام pg_cron extension في Supabase
-- 2. أو إنشاء Edge Function تعمل يومياً
-- 3. أو تنفيذ هذا الأمر يدوياً: SELECT notify_expiring_licenses(30);


-- ========================================
-- إشعار المندوب عند إنشاء رحلة جديدة له
-- ========================================

CREATE OR REPLACE FUNCTION notify_representative_new_route()
RETURNS TRIGGER AS $$
DECLARE
    rep_user_id UUID;
    route_date_formatted TEXT;
BEGIN
    -- الحصول على user_id للمندوب
    SELECT user_id INTO rep_user_id
    FROM representatives
    WHERE id = NEW.representative_id;
    
    IF rep_user_id IS NOT NULL THEN
        route_date_formatted := TO_CHAR(NEW.route_date, 'YYYY-MM-DD');
        
        INSERT INTO notifications (user_id, title, message, type, reference_id)
        VALUES (
            rep_user_id,
            '🚚 رحلة جديدة مسندة إليك',
            'تم إسناد رحلة جديدة لك بتاريخ ' || route_date_formatted,
            'route',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger للرحلات الجديدة
DROP TRIGGER IF EXISTS new_route_notification ON routes;
CREATE TRIGGER new_route_notification
    AFTER INSERT ON routes
    FOR EACH ROW
    EXECUTE FUNCTION notify_representative_new_route();

-- ========================================
-- إشعار المندوب عند تعديل رحلته
-- ========================================

CREATE OR REPLACE FUNCTION notify_representative_route_updated()
RETURNS TRIGGER AS $$
DECLARE
    rep_user_id UUID;
BEGIN
    -- إذا تغير المندوب المعين
    IF OLD.representative_id IS DISTINCT FROM NEW.representative_id THEN
        -- إشعار المندوب الجديد
        IF NEW.representative_id IS NOT NULL THEN
            SELECT user_id INTO rep_user_id
            FROM representatives
            WHERE id = NEW.representative_id;
            
            IF rep_user_id IS NOT NULL THEN
                INSERT INTO notifications (user_id, title, message, type, reference_id)
                VALUES (
                    rep_user_id,
                    '🚚 رحلة جديدة مسندة إليك',
                    'تم إسناد رحلة بتاريخ ' || TO_CHAR(NEW.route_date, 'YYYY-MM-DD') || ' إليك',
                    'route',
                    NEW.id
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger لتحديث الرحلات
DROP TRIGGER IF EXISTS route_updated_notification ON routes;
CREATE TRIGGER route_updated_notification
    AFTER UPDATE ON routes
    FOR EACH ROW
    EXECUTE FUNCTION notify_representative_route_updated();

-- ========================================
-- إشعار الأدمن عند إكمال رحلة
-- ========================================

CREATE OR REPLACE FUNCTION notify_admin_route_completed()
RETURNS TRIGGER AS $$
DECLARE
    admin_user RECORD;
    rep_name TEXT;
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- الحصول على اسم المندوب
        SELECT u.full_name INTO rep_name
        FROM representatives r
        JOIN users u ON r.user_id = u.id
        WHERE r.id = NEW.representative_id;
        
        -- إرسال إشعار لجميع المدراء والمحاسبين
        FOR admin_user IN
            SELECT u.id
            FROM users u
            WHERE u.role IN ('admin', 'accountant', 'logistics_manager')
        LOOP
            INSERT INTO notifications (user_id, title, message, type, reference_id)
            VALUES (
                admin_user.id,
                '✅ رحلة مكتملة',
                'أكمل المندوب ' || COALESCE(rep_name, 'غير معروف') || ' رحلة بتاريخ ' || TO_CHAR(NEW.route_date, 'YYYY-MM-DD'),
                'route',
                NEW.id
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger للرحلات المكتملة
DROP TRIGGER IF EXISTS route_completed_admin_notification ON routes;
CREATE TRIGGER route_completed_admin_notification
    AFTER UPDATE ON routes
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_route_completed();


-- ========================================
-- إشعار الأدمن عند بدء المندوب للرحلة
-- ========================================

CREATE OR REPLACE FUNCTION notify_admin_route_started()
RETURNS TRIGGER AS $$
DECLARE
    admin_user RECORD;
    rep_name TEXT;
BEGIN
    -- إذا تغيرت الحالة إلى "in_progress" (بدأت)
    IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
        -- الحصول على اسم المندوب
        SELECT u.full_name INTO rep_name
        FROM representatives r
        JOIN users u ON r.user_id = u.id
        WHERE r.id = NEW.representative_id;
        
        -- إرسال إشعار لجميع المدراء
        FOR admin_user IN
            SELECT u.id
            FROM users u
            WHERE u.role IN ('admin', 'logistics_manager')
        LOOP
            INSERT INTO notifications (user_id, title, message, type, reference_id)
            VALUES (
                admin_user.id,
                '🚀 رحلة بدأت',
                'بدأ المندوب ' || COALESCE(rep_name, 'غير معروف') || ' رحلة بتاريخ ' || TO_CHAR(NEW.route_date, 'YYYY-MM-DD'),
                'route',
                NEW.id
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger لبدء الرحلات
DROP TRIGGER IF EXISTS route_started_notification ON routes;
CREATE TRIGGER route_started_notification
    AFTER UPDATE ON routes
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_route_started();

-- ========================================
-- تحديث دالة إكمال الرحلة (لتجنب التكرار)
-- ========================================

DROP TRIGGER IF EXISTS route_completed_admin_notification ON routes;
DROP TRIGGER IF EXISTS route_completed_notification ON routes;

CREATE OR REPLACE FUNCTION notify_route_status_change()
RETURNS TRIGGER AS $$
DECLARE
    admin_user RECORD;
    rep_name TEXT;
    rep_user_id UUID;
BEGIN
    -- الحصول على اسم المندوب و user_id
    SELECT u.full_name, r.user_id INTO rep_name, rep_user_id
    FROM representatives r
    JOIN users u ON r.user_id = u.id
    WHERE r.id = NEW.representative_id;

    -- إذا بدأت الرحلة
    IF NEW.status = 'in_progress' AND OLD.status = 'pending' THEN
        FOR admin_user IN
            SELECT u.id FROM users u WHERE u.role IN ('admin', 'logistics_manager')
        LOOP
            INSERT INTO notifications (user_id, title, message, type, reference_id)
            VALUES (
                admin_user.id,
                '🚀 رحلة بدأت',
                'بدأ المندوب ' || COALESCE(rep_name, 'غير معروف') || ' رحلته بتاريخ ' || TO_CHAR(NEW.route_date, 'YYYY-MM-DD'),
                'route',
                NEW.id
            );
        END LOOP;
    END IF;

    -- إذا اكتملت الرحلة
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        FOR admin_user IN
            SELECT u.id FROM users u WHERE u.role IN ('admin', 'accountant', 'logistics_manager')
        LOOP
            INSERT INTO notifications (user_id, title, message, type, reference_id)
            VALUES (
                admin_user.id,
                '✅ رحلة مكتملة',
                'أكمل المندوب ' || COALESCE(rep_name, 'غير معروف') || ' رحلته بتاريخ ' || TO_CHAR(NEW.route_date, 'YYYY-MM-DD'),
                'route',
                NEW.id
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger واحد لتغيير حالة الرحلة
CREATE TRIGGER route_status_change_notification
    AFTER UPDATE ON routes
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_route_status_change();


-- ========================================
-- إصلاح صلاحيات جدول الإشعارات (RLS)
-- ========================================

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- تفعيل RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: المستخدم يقرأ إشعاراته فقط
CREATE POLICY "Users can read own notifications"
    ON notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- سياسة التحديث: المستخدم يحدث إشعاراته فقط
CREATE POLICY "Users can update own notifications"
    ON notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

-- سياسة الحذف: المستخدم يحذف إشعاراته فقط
CREATE POLICY "Users can delete own notifications"
    ON notifications
    FOR DELETE
    USING (auth.uid() = user_id);

-- سياسة الإدراج: السماح للـ triggers بإنشاء إشعارات
CREATE POLICY "Allow insert notifications"
    ON notifications
    FOR INSERT
    WITH CHECK (true);

-- ========================================
-- التأكد من ربط user_id بـ auth.users
-- ========================================

-- تحديث الإشعارات القديمة التي ليس لها user_id صحيح
DELETE FROM notifications WHERE user_id NOT IN (SELECT id FROM auth.users);
