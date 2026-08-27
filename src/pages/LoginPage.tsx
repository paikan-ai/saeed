import { FormEvent, useState } from "react";
import { Eye, EyeOff, User as UserIcon, Phone, ShieldCheck, Search, Layers, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { Button, Field, TextInput } from "../components/ui";
import { ApiError } from "../lib/types";

/* ============================================================
   صفحه‌ی ورود — هویت بصری «دفترچه تلفن»
   ============================================================ */

const DEMO_ACCOUNTS = [
  { username: "admin", password: "123", label: "مدیر سیستم" },
  { username: "sara", password: "1234", label: "کاربر کامل" },
  { username: "reza", password: "1234", label: "فقط مشاهده" },
];

/** لوگوی اختصاصی سامانه */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#105041" />
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#lg)" opacity="0.35" />
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2e7b62" />
          <stop offset="1" stopColor="#092e27" />
        </linearGradient>
      </defs>
      <path
        d="M17 13.5c-2.5 0-4.2 2-4 4.4.6 9.3 12.3 21 21.6 21.6 2.4.2 4.4-1.5 4.4-4v-3.2c0-1.5-1-2.9-2.5-3.4l-3.4-1.1c-1.2-.4-2.5 0-3.3 1l-1.5 1.7c-3-1.6-6-4.6-7.6-7.6l1.7-1.5c1-.8 1.4-2.1 1-3.3l-1.1-3.4c-.5-1.5-1.9-2.5-3.4-2.5H17z"
        fill="#e9ae3f"
      />
      <circle cx="35" cy="13" r="3.2" fill="#f2c76f" />
    </svg>
  );
}

/** تصویر تزئینی تلفن روتاری — امضای بصری صفحه‌ی ورود */
function RotaryPhoneArt() {
  return (
    <svg viewBox="0 0 300 260" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
      {/* دسته‌ی گوشی */}
      <path d="M60 62c-14 0-24 10-24 24v6c0 5 4 9 9 9h26c5 0 9-4 9-9v-2h140v2c0 5 4 9 9 9h26c5 0 9-4 9-9v-6c0-14-10-24-24-24-32-8-142-8-180 0z" />
      {/* بدنه */}
      <path d="M82 104l-14 96c-1 8 5 15 13 15h138c8 0 14-7 13-15l-14-96" />
      {/* صفحه‌ی شماره‌گیر دوار */}
      <circle cx="150" cy="160" r="42" />
      <circle cx="150" cy="160" r="14" />
      {/* سوراخ‌های شماره‌گیر */}
      <circle cx="150" cy="128" r="4" fill="currentColor" stroke="none" />
      <circle cx="172" cy="136" r="4" fill="currentColor" stroke="none" />
      <circle cx="181" cy="158" r="4" fill="currentColor" stroke="none" />
      <circle cx="174" cy="180" r="4" fill="currentColor" stroke="none" />
      <circle cx="152" cy="190" r="4" fill="currentColor" stroke="none" />
      <circle cx="129" cy="183" r="4" fill="currentColor" stroke="none" />
      <circle cx="120" cy="161" r="4" fill="currentColor" stroke="none" />
      <circle cx="128" cy="138" r="4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const { push } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("نام کاربری و رمز عبور را وارد کنید.");
      setShakeKey((k) => k + 1);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await login(username, password);
      push("success", "خوش آمدید!", `ورود با حساب «${res.user.username}» موفق بود.`);
      // اگر ادمین اولین ورودش باشد، به صفحه‌ی تغییر رمز اجباری هدایت می‌شود (در App)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا در ارتباط با سرور");
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      {/* ================= پنل فرم (سمت راست) ================= */}
      <div className="relative flex flex-col justify-center px-5 py-10 sm:px-12 lg:px-16">
        {/* سربرگ برند فقط در موبایل */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <Logo size={44} />
          <div>
            <p className="font-display text-2xl leading-7 text-pine-900">دفترچه تلفن</p>
            <p className="text-xs text-pine-600">سامانه‌ی مدیریت مخاطبین چندکاربره</p>
          </div>
        </div>

        <div className="w-full max-w-md self-center lg:self-start">
          <p className="text-xs font-bold tracking-widest text-honey-600">ورود به سامانه</p>
          <h1 className="mt-2 font-display text-4xl leading-tight text-pine-950 sm:text-5xl">
            سلام! دفترچه‌ات
            <span className="relative mx-2 inline-block text-pine-600">
              آماده است
              <svg viewBox="0 0 120 8" className="absolute -bottom-1 right-0 w-full text-honey-400" preserveAspectRatio="none">
                <path d="M2 6C30 2 90 2 118 5" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-3 text-sm leading-6 text-pine-600">
            برای مدیریت مخاطبین‌تان وارد شوید؛ هر کاربر فقط دفترچه‌ی خودش را می‌بیند.
          </p>

          <form onSubmit={onSubmit} className="mt-8 rounded-2xl border border-pine-100 bg-white p-6 shadow-card sm:p-7" noValidate>
            <div key={shakeKey} className={error ? "animate-shake" : ""}>
              <Field label="نام کاربری">
                <div className="relative">
                  <UserIcon size={17} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-pine-400" />
                  <TextInput
                    dir="ltr"
                    className="pe-3.5 ps-10 text-left"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </Field>

              <div className="mt-4">
                <Field label="رمز عبور">
                  <div className="relative">
                    <TextInput
                      dir="ltr"
                      type={showPass ? "text" : "password"}
                      className="pe-10 ps-10 text-left"
                      placeholder="••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="absolute top-1/2 right-3.5 -translate-y-1/2 text-pine-400 transition hover:text-pine-700"
                      aria-label="نمایش رمز عبور"
                    >
                      {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </Field>
              </div>

              {error && (
                <div className="mt-4 rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-[13px] font-semibold text-danger">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="mt-5 w-full py-3 text-base">
                <LogIn size={18} />
                ورود به حساب
              </Button>
            </div>
          </form>

          {/* حساب‌های آزمایشی برای دمو */}
          <div className="mt-6 rounded-xl border border-honey-200 bg-honey-100/60 p-4">
            <p className="text-[11px] font-bold tracking-wide text-honey-700">حساب‌های آزمایشی — برای پر کردن فرم کلیک کنید</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.username}
                  type="button"
                  onClick={() => {
                    setUsername(a.username);
                    setPassword(a.password);
                    setError(null);
                  }}
                  className="group flex cursor-pointer items-center gap-2 rounded-lg border border-honey-300/70 bg-white px-3 py-1.5 text-xs font-semibold text-pine-800 transition hover:-translate-y-0.5 hover:border-honey-400 hover:shadow-card"
                >
                  <span dir="ltr" className="font-bold text-pine-950 group-hover:text-honey-600">
                    {a.username} / {a.password}
                  </span>
                  <span className="text-pine-500">{a.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[11px] leading-5 text-pine-600">
              ادمین در اولین ورود ملزم به تغییر رمز «123» خواهد شد.
            </p>
          </div>
        </div>
      </div>

      {/* ================= پنل برند (سمت چپ) ================= */}
      <div className="bg-dots-light relative hidden overflow-hidden bg-pine-900 lg:block">
        {/* هاله‌های نوری ملایم */}
        <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-pine-700/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-24 size-[28rem] rounded-full bg-pine-800/70 blur-3xl" />

        {/* تلفن روتاری تزئینی */}
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-[420px] w-[480px] text-pine-700/40">
          <RotaryPhoneArt />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <Logo size={42} />
            <div>
              <p className="font-display text-xl leading-6 text-pine-50">دفترچه تلفن</p>
              <p className="text-[11px] text-pine-300">نسخه‌ی سازمانی ۱۴۰۴</p>
            </div>
          </div>

          <div>
            <h2 className="max-w-md font-display text-6xl leading-[1.15] text-pine-50">
              هر شماره،
              <br />
              درست سرِ
              <span className="text-honey-300"> جای خودش.</span>
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-7 text-pine-200">
              دفترچه تلفن تحت وب چندکاربره با سطوح دسترسی دقیق؛ مخاطبین هر کاربر کاملاً از بقیه جداست.
            </p>

            {/* کارت‌های شناور مخاطبین */}
            <div className="relative mt-10 h-40 max-w-md">
              <FloatingChip name="مریم رضایی" phone="۰۹۱۲ ۱۲۳ ۴۵۶۷" className="top-0 right-2" tilt="-4deg" delay="0s" />
              <FloatingChip name="دفتر مرکزی" phone="۰۲۱ ۴۴۳۳ ۲۲۱۱" className="top-10 right-44" tilt="3deg" delay="0.8s" tone="dark" />
              <FloatingChip name="نگار صادقی" phone="۰۹۱۹ ۸۸۸ ۷۷۶۶" className="top-20 right-10" tilt="-2deg" delay="1.6s" />
            </div>
          </div>

          <ul className="flex flex-wrap gap-x-8 gap-y-2 text-[13px] font-semibold text-pine-200">
            <li className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-honey-300" /> دسترسی سطح‌بندی‌شده
            </li>
            <li className="flex items-center gap-2">
              <Search size={16} className="text-honey-300" /> جستجو در نام و شماره
            </li>
            <li className="flex items-center gap-2">
              <Layers size={16} className="text-honey-300" /> تفکیک کامل کاربران
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function FloatingChip({
  name,
  phone,
  className = "",
  tilt,
  delay,
  tone = "light",
}: {
  name: string;
  phone: string;
  className?: string;
  tilt: string;
  delay: string;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={`animate-float absolute flex items-center gap-3 rounded-xl px-4 py-2.5 shadow-lift ${
        tone === "light" ? "bg-white text-pine-950" : "bg-pine-800 text-pine-50 border border-pine-700"
      } ${className}`}
      style={{ ["--tilt" as string]: tilt, animationDelay: delay }}
    >
      <span className={`grid size-8 place-items-center rounded-lg ${tone === "light" ? "bg-pine-100 text-pine-700" : "bg-pine-700 text-honey-300"}`}>
        <Phone size={15} />
      </span>
      <span>
        <span className="block text-xs font-extrabold">{name}</span>
        <span className={`block text-[11px] ${tone === "light" ? "text-pine-500" : "text-pine-300"}`} dir="ltr">
          {phone}
        </span>
      </span>
    </div>
  );
}
