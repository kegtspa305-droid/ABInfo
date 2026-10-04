# ABInfo — نشر مجاني على Render

## 1) التسجيل
افتح: https://render.com/
ثم Sign Up. لا تحتاج إلى شراء استضافة.

## 2) ربط GitHub
Render يحتاج مستودع GitHub/GitLab/Bitbucket للمشروع. ارفع مجلد ABInfo_work إلى مستودع خاص باسم `abinfo-store`.

## 3) إنشاء الخدمة
Render > New > Web Service > اختر المستودع.
يمكن أيضًا استخدام `render.yaml` الموجود في المشروع.

## 4) المتغيرات المطلوبة
- NODE_ENV=production
- SESSION_SECRET: يولده Render تلقائيًا عبر render.yaml
- ADMIN_USERNAME=admin
- ADMIN_PASSWORD: اختر كلمة مرور قوية
- GOOGLE_APPS_SCRIPT_URL: يوضع بعد نشر Apps Script
- GOOGLE_APPS_SCRIPT_SECRET: نفس السر الموجود في Apps Script

## 5) الرابط
بعد نجاح أول Deploy سيظهر رابط من الشكل:
https://abinfo-store.onrender.com
قد يختلف اسم الرابط حسب توفر الاسم.

## ملاحظة مهمة عن الخطة المجانية
Render Free يوقف الخدمة بعد 15 دقيقة من عدم النشاط ويعيد تشغيلها عند وصول طلب جديد. كما أن ملفات الخدمة المحلية مؤقتة؛ لذلك لا ينبغي الاعتماد على SQLite وحدها لتخزين بيانات متجر حقيقية. المشروع يرسل الطلبات إلى Google Apps Script عند ضبط متغيرات Google، ويجب إكمال جعل Google Sheets مصدر التخزين الدائم قبل إطلاق المتجر تجاريًا.
