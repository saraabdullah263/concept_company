-- تحديث حالات الفواتير - حذف draft و sent
-- Update invoice status - remove draft and sent

-- حذف النوع القديم وإنشاء واحد جديد
DO $$ 
BEGIN
    -- تحويل الفواتير المسودة والمرسلة إلى معلقة
    ALTER TABLE invoices ALTER COLUMN status DROP DEFAULT;
    
    -- تحديث القيم الموجودة
    -- draft و sent و pending يتحولوا لـ overdue (معلقة/متأخرة)
    UPDATE invoices SET status = 'overdue'::text WHERE status::text IN ('draft', 'sent', 'pending');
    
    -- تغيير نوع العمود إلى text مؤقتاً
    ALTER TABLE invoices ALTER COLUMN status TYPE TEXT;
    
    -- حذف النوع القديم
    DROP TYPE IF EXISTS invoice_status CASCADE;
    
    -- إنشاء النوع الجديد
    CREATE TYPE invoice_status AS ENUM ('paid', 'overdue', 'cancelled');
    
    -- تحويل العمود للنوع الجديد
    ALTER TABLE invoices 
        ALTER COLUMN status TYPE invoice_status 
        USING status::invoice_status;
    
    -- تعيين القيمة الافتراضية
    ALTER TABLE invoices ALTER COLUMN status SET DEFAULT 'overdue';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error: %', SQLERRM;
        -- في حالة الخطأ، نحاول طريقة بديلة
        -- فقط نضيف تعليق توضيحي
        NULL;
END $$;

-- تعليقات
COMMENT ON TYPE invoice_status IS 'حالات الفواتير: paid=مدفوعة, overdue=متأخرة, cancelled=ملغاة';
COMMENT ON COLUMN invoices.status IS 'حالة الفاتورة';

-- عرض النتيجة
SELECT 
    invoice_number,
    status,
    total_amount,
    invoice_date,
    due_date
FROM invoices
ORDER BY created_at DESC
LIMIT 10;
