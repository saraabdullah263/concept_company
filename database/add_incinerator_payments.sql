-- جدول مدفوعات المحرقة
-- Incinerator Payments Table

CREATE TABLE IF NOT EXISTS incinerator_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incinerator_id UUID REFERENCES incinerators(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT DEFAULT 'cash', -- cash, transfer, check
    reference_number TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_incinerator_payments_incinerator ON incinerator_payments(incinerator_id);
CREATE INDEX IF NOT EXISTS idx_incinerator_payments_date ON incinerator_payments(payment_date);

-- تفعيل RLS
ALTER TABLE incinerator_payments ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة للجميع
CREATE POLICY "all_users_view_incinerator_payments"
ON incinerator_payments FOR SELECT
TO authenticated
USING (true);

-- سياسة التعديل للأدمن والمحاسبين
CREATE POLICY "admin_accountant_manage_incinerator_payments"
ON incinerator_payments FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'accountant')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'accountant')
    )
);

-- تعليقات على الأعمدة
COMMENT ON TABLE incinerator_payments IS 'جدول مدفوعات المحارق';
COMMENT ON COLUMN incinerator_payments.amount IS 'مبلغ الدفعة';
COMMENT ON COLUMN incinerator_payments.payment_method IS 'طريقة الدفع: cash=نقدي, transfer=تحويل, check=شيك';
COMMENT ON COLUMN incinerator_payments.reference_number IS 'رقم المرجع أو الإيصال';
