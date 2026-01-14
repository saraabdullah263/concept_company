-- إضافة حقل مبلغ التأمين للمحارق
-- Add insurance amount field to incinerators table

ALTER TABLE incinerators ADD COLUMN IF NOT EXISTS insurance_amount DECIMAL(10,2) DEFAULT 0;

-- تحديث التعليق على العمود
COMMENT ON COLUMN incinerators.insurance_amount IS 'مبلغ التأمين للمحرقة';
