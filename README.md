# دفترچه تلفن تحت وب چندکاربره 📞

یک سامانه‌ی کامل مدیریت مخاطبین با **ASP.NET Core 8 Web API** (بک‌اند)، **React + TypeScript + TailwindCSS** (فرانت‌اند) و **SQL Server** (دیتابیس).

هر کاربر فقط مخاطبین خودش را می‌بیند، ادمین کاربران و سطوح دسترسی را مدیریت می‌کند و همه‌ی مجوزها هم در توکن JWT و هم سمت سرور اعمال می‌شوند.

---

## ✨ امکانات

| بخش | امکانات |
|---|---|
| **احراز هویت** | ورود با JWT، اکانت اولیه‌ی `admin/123`، **اجبار ادمین به تغییر رمز پس از اولین ورود** (فلگ `IsPasswordChanged`) |
| **RBAC** | چهار مجوز `CanCreate / CanEdit / CanDelete / CanViewOnly` برای هر کاربر، ذخیره در دیتابیس، انتقال در Claimهای توکن JWT و بررسی در Middleware سمت سرور |
| **مخاطبین** | CRUD کامل با رابطه‌ی یک‌به‌چند (هر مخاطب N شماره: موبایل/خانه/کار)، جستجوی هم‌زمان در نام و شماره، جداسازی کامل داده‌ی کاربران |
| **داشبورد ادمین** | مدیریت کامل کاربران، تعیین نقش و دسترسی‌ها، آمار زنده (تعداد کاربران، مخاطبین، شماره‌ها، نمودار هر کاربر) |
| **فرانت‌اند** | رابط فارسی RTL، حالت «فقط مشاهده» (پنهان/غیرفعال شدن دکمه‌ها)، Toast، فرم داینامیک شماره تلفن، جستجوی زنده |

---

## 🏗 معماری (Layered Architecture)

```
backend/Phonebook.Api/
├── Program.cs                  ← Composition Root (DI, JWT, CORS, Swagger, Seed)
├── appsettings.json            ← Connection String و تنظیمات JWT
├── Controllers/                ← لایه‌ی ارائه (Auth, Users, Contacts)
├── Services/                   ← لایه‌ی منطق تجاری (Auth, User, Contact)
├── Data/                       ← لایه‌ی داده (Entities + AppDbContext + Seed)
├── Models/Dtos.cs              ← قرارداد ارتباط API با کلاینت
├── Mapping/MappingProfile.cs   ← AutoMapper (Entity ↔ DTO)
├── Validation/Validators.cs    ← FluentValidation با پیام‌های فارسی
└── Infrastructure/             ← PasswordHasher (PBKDF2), JwtTokenService,
                                   PermissionHandler (RBAC), ValidationFilter

src/                            ← فرانت‌اند React + TypeScript + Tailwind
├── lib/ (api, mockServer, types, icons)
├── context/AuthContext.tsx
├── components/ (ui, Toast)
└── pages/ (Login, ForcePassword, Admin, Contacts)
```

**جریان یک درخواست:**
`React → JWT Bearer → Middleware احراز هویت → Policyهای RBAC (بررسی Claimها) → Controller → FluentValidation Filter → Service (مالکیت + منطق) → EF Core → SQL Server`

### نکات امنیتی
- رمزها با **PBKDF2-SHA256 (۱۰۰هزار تکرار)** هش می‌شوند و هرگز خام ذخیره نمی‌شوند.
- مجوزها هنگام صدور توکن به‌صورت Claim (`perm.contact.create` و…) داخل JWT قرار می‌گیرند؛ ادمین همیشه مجاز است و `ViewOnly` همه‌ی عملیات تغییردهنده را مسدود می‌کند.
- همه‌ی کوئری‌های مخاطبین با `OwnerId` فیلتر می‌شوند (جداسازی کامل داده‌ها).

---

## 🚀 راه‌اندازی بک‌اند

### پیش‌نیازها
- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- SQL Server (لوکال یا Docker)

### ۱) تنظیم Connection String
فایل `backend/Phonebook.Api/appsettings.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=.;Database=PhonebookDb;Trusted_Connection=True;TrustServerCertificate=True;"
}
```

اجرای سریع SQL Server با Docker:
```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrongPassword" -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest
```

### ۲) اجرا
```bash
cd backend/Phonebook.Api
dotnet restore
dotnet run
```

در اولین اجرا، دیتابیس به‌صورت خودکار ساخته و **Seed** می‌شود (اکانت `admin/123` + کاربران نمونه).

سرور به‌صورت پیش‌فرض روی **`http://localhost:5000`** اجرا می‌شود (تنظیم `Urls` در `appsettings.json`) — دقیقاً همان آدرسی که فرانت‌اند با `BASE_URL` به آن وصل می‌شود.

**CORS:** در حالت توسعه، Policy مربوطه همه‌ی Originها را می‌پذیرد تا اتصال فرانت‌اند از پورت‌های دیگر (مثل ۳۰۰۰ یا ۵۱۷۳) برقرار شود؛ در Production حتماً با `WithOrigins` محدودش کنید.

> برای Production از Migration استفاده کنید:
> ```bash
> dotnet ef migrations add Init
> dotnet ef database update
> ```

### ۳) تست API
- Swagger: `http://localhost:5000/swagger`
- ابتدا از `POST /api/auth/login` توکن بگیرید و در Swagger (دکمه‌ی Authorize) وارد کنید.

---

## 🎨 راه‌اندازی فرانت‌اند

```bash
# در ریشه‌ی پروژه
npm install
npm run dev        # حالت توسعه: http://localhost:5173
npm run build      # خروجی Production در dist/
```

فرانت‌اند هنگام بارگذاری، `GET http://localhost:5000/api/health` را صدا می‌زند (آدرس پایه در `BASE_URL` فایل `src/lib/api.ts` تعریف شده و **همه‌ی درخواست‌ها مستقیماً به پورت ۵۰۰۰ بک‌اند** ارسال می‌شوند):

- اگر سرور ASP.NET در دسترس باشد → **اتصال به API واقعی** (SQL Server + JWT + RBAC)
- اگر در دسترس نباشد → **حالت شبیه‌سازی (Mock)** با همان قرارداد API و ذخیره‌سازی در LocalStorage — برای دموی بدون سرور.

---

## 👤 حساب‌های پیش‌فرض

| نام کاربری | رمز | نقش / دسترسی |
|---|---|---|
| `admin` | `123` | ادمین — **پس از اولین ورود مجبور به تغییر رمز می‌شود** |
| `sara` | `1234` | کاربر عادی با دسترسی کامل (دارای مخاطبین نمونه) |
| `reza` | `1234` | کاربر «فقط مشاهده» — دکمه‌های ایجاد/ویرایش/حذف برایش غیرفعال است |

---

## 🔌 endpoint‌های API

| متد | مسیر | دسترسی | توضیح |
|---|---|---|---|
| POST | `/api/auth/login` | عمومی | ورود و دریافت توکن |
| POST | `/api/auth/change-password` | لاگین‌شده | تغییر رمز (اجباری/اختیاری) |
| GET | `/api/auth/me` | لاگین‌شده | اعتبارسنجی نشست ذخیره‌شده هنگام بارگذاری فرانت‌اند |
| PUT | `/api/auth/profile` | لاگین‌شده | ویرایش نام کاربری خودم |
| GET | `/api/users` | ادمین | لیست کاربران |
| GET | `/api/users/stats` | ادمین | آمار داشبورد |
| POST | `/api/users` | ادمین | ایجاد کاربر + مجوزها |
| PUT | `/api/users/{id}` | ادمین | ویرایش کاربر / ریست رمز |
| DELETE | `/api/users/{id}` | ادمین | حذف کاربر و مخاطبینش |
| GET | `/api/contacts?search=` | لاگین‌شده | لیست مخاطبین خودم + جستجو در نام و شماره |
| POST | `/api/contacts` | مجوز `CanCreate` | افزودن مخاطب با N شماره |
| PUT | `/api/contacts/{id}` | مجوز `CanEdit` + مالک | ویرایش مخاطب |
| DELETE | `/api/contacts/{id}` | مجوز `CanDelete` + مالک | حذف مخاطب |

---

## 🧱 مدل داده

```
Users(Id, Username*, PasswordHash, Role, IsPasswordChanged,
      CanCreate, CanEdit, CanDelete, CanViewOnly, CreatedAt)
   └── 1:N ── Contacts(Id, Name, OwnerId → Users.Id, CreatedAt)
                 └── 1:N ── ContactPhones(Id, ContactId → Contacts.Id, PhoneNumber, PhoneType)
```

`Username` یکتا است؛ حذف کاربر/مخاطب به‌صورت Cascade انجام می‌شود.
