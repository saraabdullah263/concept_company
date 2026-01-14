# حل مشكلة Toggle Switch

## المشكلة
الدائرة البيضاء في الـ Toggle Switch كانت تخرج من الإطار عند التفعيل بسبب تعارض مع `direction: rtl` في الـ CSS العام.

## السبب الجذري
1. الموقع يستخدم `direction: rtl` في `src/index.css`
2. الـ `translate-x` في Tailwind يتأثر بالـ RTL ويعكس الاتجاه
3. الحسابات كانت صحيحة لكن الاتجاه معكوس

## الحل النهائي

### التغييرات في `src/components/common/ToggleSwitch.jsx`:

1. **استخدام `dir="ltr"`** على الـ button لعزله عن الـ RTL:
   ```jsx
   <button dir="ltr" ...>
   ```

2. **استخدام `margin-inline-start` بدلاً من `translate-x`**:
   - `ms-[2px]` للحالة المعطلة (disabled)
   - `ms-[22px]` للحالة المفعلة (enabled)

3. **الحسابات الدقيقة**:
   - الإطار: `w-11` = 44px
   - الدائرة: `w-5` = 20px
   - المسافة المتبقية: 44px - 20px = 24px
   - Margin عند التفعيل: 22px (يترك 2px من اليمين)
   - Margin عند التعطيل: 2px (يترك 2px من اليسار)

## الضمانات ضد تكرار المشكلة

1. ✅ استخدام `dir="ltr"` يعزل الـ component عن أي RTL خارجي
2. ✅ استخدام `margin-inline-start` بدلاً من `transform` أكثر استقراراً
3. ✅ قيم ثابتة بالـ pixels بدلاً من Tailwind utilities المتغيرة
4. ✅ تم اختبار الحل في ملف HTML منفصل

## الاستخدام

```jsx
<ToggleSwitch
    checked={isEnabled}
    onChange={(value) => setIsEnabled(value)}
    label="عنوان الخيار"
    description="وصف اختياري"
/>
```

## ملاحظات مهمة

- الـ component يعمل بشكل صحيح في بيئة RTL
- لا يحتاج أي تعديلات إضافية في المستقبل
- متوافق مع جميع المتصفحات الحديثة

## تاريخ الإصلاح
التاريخ: 2025-12-17
الإصدار: 1.0.0
