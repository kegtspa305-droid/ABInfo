# دليل نشر ABInfo

## الخيار الموصى به
استضافة Node.js مدارة توفر:
- Node.js 20+ أو إصدار LTS حديث
- HTTPS/SSL تلقائي
- متغيرات Environment Variables
- قاعدة بيانات/قرص دائم للتطبيق
- إمكانية ربط نطاق مخصص

## على الخادم
```bash
npm install
npm start
```

اضبط:
```text
NODE_ENV=production
PORT=3000
SESSION_SECRET=<سر طويل وعشوائي>
GOOGLE_APPS_SCRIPT_URL=<رابط Web App من Apps Script>
GOOGLE_APPS_SCRIPT_SECRET=<نفس SCRIPT_SECRET>
```

## HTTPS
يفضل أن تنهي الاستضافة TLS/HTTPS أمام Node. لا تحتاج عادةً إلى وضع ملفات الشهادة داخل المشروع.

## النطاق
بعد شراء/تسجيل `abinfo.dz` عبر المسار الرسمي/مسجل معتمد، أضف سجلات DNS التي تطلبها الاستضافة، ثم اربط:
- `abinfo.dz`
- `www.abinfo.dz`

لا تضع كلمة مرور Google أو مفاتيح سرية داخل ملفات الواجهة.
