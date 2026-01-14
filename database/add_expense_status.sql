-- إضافة حالة للمصاريف (active/cancelled)
-- Add status to expenses table

-- إضافة نوع الحالة
DO $$ BEGIN
    CREATE TYPE expense_status AS ENUM ('active', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- إضافة عمود الحالة
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS status expense_status DEFAULT 'active';

-- تحديث المصاريف القديمة لتكون نشطة
UPDATE expenses 
SET status = 'active' 
WHERE status IS NULL;

-- إضافة فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

-- تعليقات
COMMENT ON COLUMN expenses.status IS 'حالة المصروف: active=نشط, cancelled=ملغي';
COMMENT ON TYPE expense_status IS 'حالات المصاريف';

-- عرض النتيجة
SELECT 
    id,
    description,
    amount,
    expense_date,
    status,
    created_at
FROM expenses
ORDER BY created_at DESC
LIMIT 10;
