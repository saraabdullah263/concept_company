-- إنشاء جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'contract', 'route', 'invoice', 'general'
    reference_id UUID, -- معرف العنصر المرتبط (عقد، رحلة، فاتورة)
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- تفعيل RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: المستخدم يقرأ إشعاراته فقط
CREATE POLICY "Users can read their own notifications"
    ON notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- سياسة التحديث: المستخدم يحدث إشعاراته فقط (مثل تعليم كمقروء)
CREATE POLICY "Users can update their own notifications"
    ON notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

-- سياسة الإدراج: النظام يمكنه إنشاء إشعارات لأي مستخدم
CREATE POLICY "System can create notifications"
    ON notifications
    FOR INSERT
    WITH CHECK (true);

-- دالة لإنشاء إشعار للعقود القريبة من الانتهاء
CREATE OR REPLACE FUNCTION notify_expiring_contracts()
RETURNS void AS $$
DECLARE
    contract_record RECORD;
    admin_user RECORD;
BEGIN
    -- البحث عن العقود التي ستنتهي خلال 30 يوم
    FOR contract_record IN
        SELECT c.id, c.contract_number, h.name as hospital_name, c.end_date
        FROM contracts c
        JOIN hospitals h ON c.hospital_id = h.id
        WHERE c.end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
        AND c.status = 'active'
    LOOP
        -- إرسال إشعار لجميع المدراء
        FOR admin_user IN
            SELECT u.id
            FROM users u
            WHERE u.role = 'admin'
        LOOP
            INSERT INTO notifications (user_id, title, message, type, reference_id)
            VALUES (
                admin_user.id,
                'عقد على وشك الانتهاء',
                'عقد ' || contract_record.hospital_name || ' رقم ' || contract_record.contract_number || ' ينتهي في ' || TO_CHAR(contract_record.end_date, 'YYYY-MM-DD'),
                'contract',
                contract_record.id
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإنشاء إشعار عند إكمال رحلة
CREATE OR REPLACE FUNCTION notify_route_completed()
RETURNS TRIGGER AS $$
DECLARE
    admin_user RECORD;
    route_info TEXT;
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        route_info := 'رحلة رقم #' || SUBSTRING(NEW.id::TEXT, 1, 8);
        
        -- إرسال إشعار لجميع المدراء والمحاسبين
        FOR admin_user IN
            SELECT u.id
            FROM users u
            WHERE u.role IN ('admin', 'accountant')
        LOOP
            INSERT INTO notifications (user_id, title, message, type, reference_id)
            VALUES (
                admin_user.id,
                'رحلة مكتملة',
                'تم إكمال ' || route_info || ' بنجاح',
                'route',
                NEW.id
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger للرحلات المكتملة
DROP TRIGGER IF EXISTS route_completed_notification ON routes;
CREATE TRIGGER route_completed_notification
    AFTER UPDATE ON routes
    FOR EACH ROW
    EXECUTE FUNCTION notify_route_completed();

-- دالة لإنشاء إشعار عند إنشاء فاتورة جديدة
CREATE OR REPLACE FUNCTION notify_invoice_created()
RETURNS TRIGGER AS $$
DECLARE
    admin_user RECORD;
    hospital_name TEXT;
BEGIN
    -- الحصول على اسم المستشفى
    SELECT h.name INTO hospital_name
    FROM hospitals h
    WHERE h.id = NEW.hospital_id;
    
    -- إرسال إشعار لجميع المدراء والمحاسبين
    FOR admin_user IN
        SELECT u.id
        FROM users u
        WHERE u.role IN ('admin', 'accountant')
    LOOP
        INSERT INTO notifications (user_id, title, message, type, reference_id)
        VALUES (
            admin_user.id,
            'فاتورة جديدة',
            'تم إنشاء فاتورة جديدة رقم ' || NEW.invoice_number || ' لـ ' || hospital_name,
            'invoice',
            NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger للفواتير الجديدة
DROP TRIGGER IF EXISTS invoice_created_notification ON invoices;
CREATE TRIGGER invoice_created_notification
    AFTER INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION notify_invoice_created();
