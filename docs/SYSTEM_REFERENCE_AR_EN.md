# مرجع النظام الكامل | Full System Reference

## العربية

### 1) نبذة عامة
النظام عبارة عن متجر إلكتروني مع وظائف ERP مبنية على Next.js + Prisma + PostgreSQL، ويدعم العربية (RTL) والإنجليزية (LTR).

### 2) الوحدات الأساسية
- **واجهة المتجر**: الصفحة الرئيسية، المنتجات، تفاصيل المنتج، السلة، الدفع، التواصل، من نحن.
- **نظام الحسابات**: تسجيل/دخول، إعدادات حساب المستخدم، العناوين.
- **لوحة الأدمن**: الطلبات، المخزون، المحاسبة، الموظفون، الموردون، الرسائل، الإعدادات.
- **نقطة البيع POS**: بيع مباشر، إدارة سلة سريعة، إصدار فاتورة.

### 3) إدارة المحتوى
- **محتوى الرئيسية**:
  - Hero Banners: إضافة/تعديل/حذف/ترتيب/تفعيل.
  - Offers: إضافة/تعديل/حذف/تفعيل/تاريخ انتهاء.
- **البراند**:
  - اسم المتجر عربي/إنجليزي من الإعدادات.
  - يتم استخدام الاسم ديناميكيًا عبر الموقع.

### 4) إدارة بيانات المتجر
من إعدادات المتجر يمكنك تعديل:
- الاسم والشعار (AR/EN)
- الهاتف والبريد
- العنوان (AR/EN)
- رابط Google Maps
- روابط WhatsApp / Facebook / Instagram / TikTok
- اللغة الافتراضية والعملة
- وضع الصيانة

### 5) الطلبات والفواتير
- إنشاء الطلب من المتجر أو POS.
- تحديث حالة الطلب.
- توليد وعرض/طباعة الفاتورة.
- تتبع الطلبات من حساب العميل.

### 6) المخزون والمنتجات
- إدارة المنتجات (اسم، وصف، صور، سعر شراء/بيع، SKU، مخزون).
- إدارة التصنيفات.
- تنبيهات المخزون المنخفض/المنتهي.
- حركات المخزون (وارد/صادر).

### 7) الموردون والمشتريات
- إدارة الموردين.
- أوامر شراء.
- تسجيل المدفوعات.
- تقارير إنفاق ومتابعة مستحقات.

### 8) المحاسبة
- تتبع الإيرادات والمصروفات.
- تقارير مالية دورية.
- نظرة عامة على الأداء المالي.

### 9) الصلاحيات
- النظام يعتمد أدوار: ADMIN / MANAGER / CASHIER / CUSTOMER.
- بعض الصفحات والوحدات محمية حسب الدور.

### 10) دعم اللغتين والاتجاه
- العربية: RTL + محاذاة يمين.
- الإنجليزية: LTR + محاذاة يسار.
- تم ضبط عرض النص العربي لمنع التقطيع/التباعد غير الصحيح.

### 11) الأمان
- مصادقة المستخدمين.
- التحقق من الصلاحيات على server actions.
- حماية العمليات الحساسة (مثل الإعدادات والإدارة).

### 12) أهم الجداول (مختصر)
- `Store`: إعدادات المتجر والبراند والتواصل.
- `Banner`, `Offer`: محتوى الصفحة الرئيسية.
- `Product`, `Category`: الكتالوج.
- `Order`, `OrderItem`, `Invoice`: الطلبات والفواتير.
- `User`, `Permission`: المستخدمون والصلاحيات.
- `Supplier`, `Purchase`: الموردون والمشتريات.

### 13) مسارات مهمة
- `/` الصفحة الرئيسية
- `/products` المنتجات
- `/checkout` الدفع
- `/contact` التواصل
- `/admin` لوحة الأدمن
- `/admin/settings` إعدادات النظام والمحتوى
- `/pos` نقطة البيع

### 14) ملاحظات تشغيل
- أي تعديل محتوى/إعدادات يظهر بعد الحفظ والتحديث.
- عند تغييرات كبيرة بالمحتوى، اختبر بالعربي والإنجليزي.

---

## English

### 1) Overview
This is an e-commerce + ERP system built with Next.js, Prisma, and PostgreSQL, with full Arabic (RTL) and English (LTR) support.

### 2) Core Modules
- **Storefront**: home, catalog, product page, cart, checkout, contact, about.
- **Account**: auth, profile settings, addresses.
- **Admin**: orders, inventory, accounting, employees, suppliers, contacts, settings.
- **POS**: direct sales terminal with receipt/invoice flow.

### 3) Content Management
- **Homepage content**:
  - Hero Banners: CRUD + ordering + activation.
  - Offers: CRUD + activation + expiry date.
- **Branding**:
  - Store name AR/EN is editable in settings.
  - Brand name is consumed dynamically across the app.

### 4) Store Settings
Editable fields include:
- Name/slogan (AR/EN)
- Phone/email
- Address (AR/EN)
- Google Maps URL
- WhatsApp/Facebook/Instagram/TikTok URLs
- Default language, currency
- Maintenance mode

### 5) Orders and Invoicing
- Orders from storefront and POS.
- Order status lifecycle updates.
- Invoice generation + print.
- Customer order tracking.

### 6) Inventory and Catalog
- Product management (names, descriptions, images, SKU, prices, stock).
- Category management.
- Low/out-of-stock alerts.
- Stock movement tracking.

### 7) Suppliers and Purchasing
- Supplier profiles.
- Purchase orders.
- Payment tracking.
- Spend and outstanding reports.

### 8) Accounting
- Revenue/expense tracking.
- Financial summaries and reports.
- Operational finance visibility.

### 9) Authorization
- Role model: ADMIN / MANAGER / CASHIER / CUSTOMER.
- Protected admin actions and role-based access.

### 10) i18n and Direction
- Arabic uses RTL and right alignment.
- English uses LTR and left alignment.
- Arabic text rendering issues (spacing/cutting) are handled.

### 11) Security
- Authenticated workflows.
- Server-side role checks for sensitive actions.
- Controlled updates for admin settings/content.

### 12) Key Data Models (summary)
- `Store` for core settings/branding/contact.
- `Banner`, `Offer` for homepage content.
- `Product`, `Category` for catalog.
- `Order`, `OrderItem`, `Invoice` for sales flow.
- `User`, `Permission` for access control.
- `Supplier`, `Purchase` for procurement.

### 13) Important Routes
- `/` Home
- `/products` Catalog
- `/checkout` Checkout
- `/contact` Contact
- `/admin` Admin dashboard
- `/admin/settings` System/content settings
- `/pos` POS terminal

### 14) Operational Notes
- Settings/content updates apply after save and refresh.
- Validate major changes in both Arabic and English.
