# تعليمات الإعداد السريع

## 1. إعداد Supabase Storage

### الخطوة 1: إنشاء Storage Bucket
```
1. افتح Supabase Dashboard
2. اذهب إلى Storage
3. اضغط "New bucket"
4. الاسم: medical-waste
5. فعّل "Public bucket"
6. اضغط "Create bucket"
```

### الخطوة 2: تشغيل SQL Policies
```
1. افتح SQL Editor في Supabase
2. انسخ محتوى ملف setup_storage.sql
3. الصق في المحرر
4. اضغط "Run"
```

## 2. اختبار الوظائف

### كـ Admin/Manager:
```bash
1. سجل دخول
2. اذهب إلى /routes
3. اضغط "رحلة جديدة"
4. املأ البيانات:
   - اختر مندوب
   - اختر مركبة
   - أضف محطات (مستشفيات)
   - اختر محرقة
5. احفظ
```

### كـ Representative:
```bash
1. سجل دخول كمندوب
2. اذهب إلى /routes
3. اختر الرحلة المعينة لك
4. اضغط "بدء الرحلة"
5. لكل محطة:
   - اضغط "وصلت"
   - أدخل الوزن
   - ارفع صورة (اختياري)
   - خذ التوقيع
   - اضغط "مغادرة"
6. في المحرقة:
   - أدخل الوزن النهائي
   - اضغط "إنهاء الرحلة"
```

## 3. التحقق من البيانات

### في Supabase SQL Editor:
```sql
-- عرض الرحلات
SELECT * FROM routes ORDER BY created_at DESC LIMIT 5;

-- عرض المحطات
SELECT * FROM route_stops WHERE route_id = 'YOUR_ROUTE_ID';

-- عرض سجل التتبع
SELECT * FROM route_tracking_logs WHERE route_id = 'YOUR_ROUTE_ID';

-- عرض الصور المرفوعة
SELECT * FROM storage.objects WHERE bucket_id = 'medical-waste';
```

## 4. حل المشاكل الشائعة

### المشكلة: "الرجاء تفعيل خدمة الموقع"
```
الحل:
1. تأكد من تشغيل GPS في الجهاز
2. امنح إذن الموقع للمتصفح
3. استخدم HTTPS (مطلوب للموقع)
```

### المشكلة: "حدث خطأ في رفع الصورة"
```
الحل:
1. تأكد من إنشاء bucket "medical-waste"
2. تأكد من تشغيل SQL policies
3. تأكد من حجم الصورة < 5MB
4. تحقق من الـ RLS policies
```

### المشكلة: "حدث خطأ في حفظ التوقيع"
```
الحل:
1. تأكد من Storage policies
2. تأكد من Canvas مدعوم في المتصفح
3. جرب على جهاز آخر
```

## 5. الملفات المهمة

```
src/
├── pages/routes/
│   └── RepresentativeRoute.jsx          # صفحة تنفيذ الرحلة
├── components/routes/
│   ├── RouteStopCard.jsx                # بطاقة المحطة
│   ├── WeightEntryModal.jsx             # نموذج الوزن
│   ├── PhotoUploadModal.jsx             # نموذج الصور
│   ├── SignatureModal.jsx               # نموذج التوقيع
│   └── RepresentativeRouteList.jsx      # قائمة رحلات المندوب

setup_storage.sql                         # إعداد Storage
REPRESENTATIVE_FEATURES.md                # شرح الوظائف
```

## 6. الوظائف المنفذة

- ✅ تسجيل الوزن لكل محطة
- ✅ رفع الصور (Supabase Storage)
- ✅ التوقيع الإلكتروني (Canvas)
- ✅ تحديث حالة الرحلة والمحطات
- ✅ تسجيل الوقت والموقع لكل إجراء
- ✅ واجهة مستخدم سهلة

## 7. الخطوات التالية (اختياري)

1. إضافة نظام التأخير والإشعارات
2. إضافة الخرائط وتتبع الموقع
3. إضافة Offline Mode
4. إضافة Push Notifications

---

**ملاحظة:** تأكد من تشغيل التطبيق على HTTPS لأن Geolocation API يتطلب ذلك.

للتطوير المحلي، استخدم:
```bash
npm run dev -- --host
```

ثم افتح: `https://localhost:5173` (قد تحتاج لقبول الشهادة)
