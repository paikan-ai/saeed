import { useState } from "react";
import { FlaskConical, Loader2, LogOut, Server, UserRound } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider, useToast } from "./components/Toast";
import LoginPage, { Logo } from "./pages/LoginPage";
import ForcePasswordPage from "./pages/ForcePasswordPage";
import AdminDashboard from "./pages/AdminDashboard";
import ContactsPage from "./pages/ContactsPage";
import ProfileModal from "./components/ProfileModal";
import { Badge } from "./components/ui";

/* ============================================================
   ریشه‌ی برنامه — تصمیم‌گیری درباره‌ی صفحه‌ی جاری:
   بارگذاری → ورود → (تغییر رمز اجباری ادمین) → داشبورد
   ============================================================ */

function BootScreen() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-ring-pulse rounded-2xl">
          <Logo size={64} />
        </div>
        <p className="font-display text-2xl text-pine-900">در حال آماده‌سازی دفترچه…</p>
        <p className="flex items-center gap-2 text-xs text-pine-500">
          <Loader2 size={13} className="animate-spin" />
          بررسی اتصال به سرور
        </p>
      </div>
    </div>
  );
}

/** نشانگر حالت اتصال: سرور واقعی ASP.NET یا حالت نمایشی Mock */
function ModeChip() {
  const { mode } = useAuth();
  if (mode === "detecting")
    return (
      <Badge tone="neutral">
        <Loader2 size={11} className="animate-spin" /> در حال اتصال…
      </Badge>
    );
  if (mode === "real")
    return (
      <Badge tone="success">
        <Server size={11} /> اتصال به سرور
      </Badge>
    );
  return (
    <Badge tone="honey">
      <FlaskConical size={11} /> حالت نمایشی
    </Badge>
  );
}

function Shell() {
  const { user, logout, mode } = useAuth();
  const { push } = useToast();
  const [profileOpen, setProfileOpen] = useState(false);
  const isAdmin = user!.role === "Admin";

  return (
    <div className="flex min-h-screen flex-col">
      {/* ---------- نوار بالای برنامه ---------- */}
      <header className="sticky top-0 z-40 border-b border-pine-100 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo size={38} />
            <div>
              <p className="font-display text-lg leading-6 text-pine-950">دفترچه تلفن</p>
              <p className="text-[10px] font-semibold text-pine-500">
                {isAdmin ? "داشبورد مدیر سیستم" : "داشبورد کاربر"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex">
              <ModeChip />
            </span>
            <button
              onClick={() => setProfileOpen(true)}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-pine-200 bg-white py-1.5 pe-3 ps-1.5 shadow-sm transition hover:-translate-y-0.5 hover:border-pine-400 hover:shadow-card"
              title="پروفایل کاربری"
            >
              <span
                className={`font-display grid size-8 place-items-center rounded-lg text-sm ${
                  isAdmin ? "bg-honey-400 text-pine-950" : "bg-pine-700 text-pine-50"
                }`}
              >
                {user!.username.slice(0, 2)}
              </span>
              <span className="hidden text-right md:block">
                <span className="block text-xs font-extrabold text-pine-950" dir="ltr">
                  {user!.username}
                </span>
                <span className="block text-[10px] text-pine-500">{isAdmin ? "مدیر" : "کاربر"}</span>
              </span>
              <UserRound size={14} className="text-pine-400" />
            </button>
            <button
              onClick={() => {
                logout();
                push("info", "از حساب خارج شدید", "به‌امید دیدار!");
              }}
              className="grid size-10 cursor-pointer place-items-center rounded-xl border border-pine-200 bg-white text-pine-500 shadow-sm transition hover:border-danger/40 hover:bg-danger-soft hover:text-danger"
              title="خروج از حساب"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ---------- محتوای اصلی ---------- */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {isAdmin ? <AdminDashboard /> : <ContactsPage />}
      </main>

      {/* ---------- پانوشت ---------- */}
      <footer className="border-t border-pine-100 bg-white/60">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-[11px] text-pine-500">
          <p>
            دفترچه تلفن چندکاربره — <b>ASP.NET Core</b> + <b>React</b> + <b>SQL Server</b>
          </p>
          <p>
            {mode === "mock"
              ? "در حالت نمایشی، داده‌ها به‌صورت امن روی مرورگر شما ذخیره می‌شوند."
              : "متصل به API واقعی — داده‌ها در SQL Server ذخیره می‌شوند."}
          </p>
        </div>
      </footer>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

function Root() {
  const { status, user } = useAuth();

  if (status === "loading") return <BootScreen />;
  if (status === "guest") return <LoginPage />;
  // ادمین تا زمانی که رمز اولیه را تغییر ندهد، راهی به داشبورد ندارد
  if (user!.role === "Admin" && !user!.isPasswordChanged) return <ForcePasswordPage />;
  return <Shell />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </ToastProvider>
  );
}
