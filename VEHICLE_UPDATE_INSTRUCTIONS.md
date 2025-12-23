# تعليمات تحديث نظام المركبات

## ⚠️ خطأ 409 - الحل

إذا ظهر لك خطأ 409 عند حفظ مركبة، هذا يعني أن قاعدة البيانات لم يتم تحديثها بعد.

## الحل (خطوة واحدة فقط):

### قم بتشغيل SQL Migration في Supabase:

1. افتح Supabase Dashboard
2. اذهب إلى **SQL Editor**
3. انسخ والصق محتوى ملف `update_vehicles_fields.sql`
4. اضغط **Run** أو **F5**

## محتوى الـ SQL (يمكنك نسخه مباشرة):

```sql
-- Add new fields to vehicles table
-- تحديث جدول المركبات بإضافة حقول جديدة

-- Add license renewal date
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS license_renewal_date DATE;

COMMENT ON COLUMN vehicles.license_renewal_date IS 'تاريخ تجديد الرخصة';

-- Add owner representative (foreign key to representatives table)
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS owner_representative_id UUID REFERENCES representatives(id) ON DELETE SET NULL;

COMMENT ON COLUMN vehicles.owner_representative_id IS 'المندوب المالك للمركبة';

-- Create index for license renewal date to easily find expiring licenses
CREATE INDEX IF NOT EXISTS idx_vehicles_license_renewal ON vehicles(license_renewal_date);

-- Create index for owner representative
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_rep ON vehicles(owner_representative_id);
```

## بعد تشغيل الـ SQL:

✅ سيعمل النظام بشكل طبيعي
✅ يمكنك إضافة وتعديل المركبات
✅ يمكنك اختيار المندوب المالك من القائمة
✅ يمكنك تحديد تاريخ تجديد الرخصة

## المميزات الجديدة:

1. **اختيار المندوب المالك**: قائمة منسدلة بجميع المندوبين
2. **تاريخ تجديد الرخصة**: مع تنبيه تلقائي قبل 30 يوم
3. **تنبيهات**: صندوق أصفر يظهر المركبات التي تحتاج تجديد رخصة
4. **عرض المالك**: اسم المندوب يظهر في بطاقة المركبة

## ملاحظات:

- الحقول الجديدة اختيارية (يمكن تركها فارغة)
- إذا لم تختر مندوب، سيتم حفظ `null`
- إذا لم تحدد تاريخ، سيتم حفظ `null`
- التنبيهات تظهر فقط للمركبات التي لها تاريخ تجديد
