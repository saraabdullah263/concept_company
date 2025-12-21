# حل مشكلة Schema Cache

## المشكلة
```
Could not find the 'representatives' column of 'routes' in the schema cache
```

## السبب
Supabase بيحتفظ بـ cache للـ schema، ولما بنغير الـ queries محتاج يعمل refresh.

## الحلول (جرب بالترتيب):

### 1. Clear Browser Cache (الأسرع)
```
1. اضغط Ctrl+Shift+R (Windows) أو Cmd+Shift+R (Mac)
   أو
2. افتح DevTools (F12)
3. اضغط كليك يمين على زر Refresh
4. اختر "Empty Cache and Hard Reload"
```

### 2. Restart Vite Dev Server
```bash
# أوقف السيرفر (Ctrl+C)
# ثم شغله تاني
npm run dev
```

### 3. Clear Vite Cache
```bash
# أوقف السيرفر
# احذف الـ cache
rm -rf node_modules/.vite

# شغل السيرفر تاني
npm run dev
```

### 4. Reload Supabase Schema (في Dashboard)
```
1. افتح Supabase Dashboard
2. اذهب إلى Settings → API
3. ابحث عن "Reload schema" أو انتظر دقيقة
4. Supabase بيعمل auto-refresh كل دقيقة
```

### 5. تأكد من الكود (آخر حل)

تأكد إن مفيش أي ملف لسه بيستخدم الـ select القديم:

```bash
# ابحث في كل الملفات
grep -r "representatives (" src/
```

يجب ألا يظهر أي نتائج!

## الملفات المصلحة

تم تعديل هذه الملفات لتجنب الـ joins المعقدة:

- ✅ `src/pages/routes/Routes.jsx`
- ✅ `src/pages/routes/RepresentativeRoute.jsx`
- ✅ `src/pages/routes/RouteDetails.jsx`

كل الملفات دلوقتي بتجيب البيانات بشكل منفصل بدل الـ joins.

## التحقق من الحل

بعد ما تعمل Clear Cache:

1. افتح صفحة Routes
2. جرب تعدل رحلة
3. لو اشتغل → تمام! ✅
4. لو لسه فيه error → شوف الـ error في Console

## إذا لم يحل المشكلة

أرسل لي:
1. الـ error الكامل من Console
2. اسم الملف اللي فيه المشكلة
3. رقم السطر

---

**ملاحظة مهمة:** 
المشكلة غالباً من الـ browser cache. 
جرب Ctrl+Shift+R أولاً قبل أي حاجة تانية!
