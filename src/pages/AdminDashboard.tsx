import { useCallback, useEffect, useState } from "react";
import { BarChart3, Briefcase, Home, BookOpen, Phone, ShieldCheck, Smartphone, UserRoundPlus, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { api } from "../lib/api";
import { ApiError, StatsDto, faDate, faNum } from "../lib/types";
import { Badge } from "../components/ui";
import UsersManager from "./UsersManager";
import ContactsPage from "./ContactsPage";

/* ============================================================
   داشبورد ادمین — سه تب: آمار کلی، مدیریت کاربران، مخاطبین من
   ============================================================ */

type Tab = "stats" | "users" | "contacts";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "stats", label: "آمار سامانه", icon: <BarChart3 size={15} /> },
  { id: "users", label: "مدیریت کاربران", icon: <Users size={15} /> },
  { id: "contacts", label: "مخاطبین من", icon: <BookOpen size={15} /> },
];

export default function AdminDashboard({ initialTab = "stats" }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div>
      {/* نوار تب‌ها */}
      <div className="mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-pine-200 bg-white p-1 shadow-card">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-bold transition-all ${
              tab === t.id ? "bg-pine-800 text-pine-50 shadow-sm" : "text-pine-600 hover:bg-pine-50 hover:text-pine-900"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "stats" && <StatsTab />}
      {tab === "users" && <UsersManager />}
      {tab === "contacts" && <ContactsPage />}
    </div>
  );
}

/* ============================================================
   تب آمار — بento چیدمان: کاشی بزرگ + کاشی‌های کوچک + نمودارها
   ============================================================ */

/** شمارنده‌ی متحرک اعداد */
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - k, 3)))); // easeOutCubic
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function StatTile({ label, value, icon, tone = "light" }: { label: string; value: number; icon: React.ReactNode; tone?: "light" | "dark" | "honey" }) {
  const v = useCountUp(value);
  const tones = {
    light: "bg-white border-pine-100 text-pine-950",
    dark: "bg-pine-900 border-pine-800 text-pine-50",
    honey: "bg-honey-100 border-honey-200 text-pine-950",
  };
  return (
    <div className={`animate-fade-up rounded-2xl border p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-bold ${tone === "dark" ? "text-pine-300" : "text-pine-500"}`}>{label}</p>
        <span className={`grid size-9 place-items-center rounded-xl ${tone === "dark" ? "bg-pine-800 text-honey-300" : tone === "honey" ? "bg-honey-400 text-pine-950" : "bg-pine-100 text-pine-700"}`}>
          {icon}
        </span>
      </div>
      <p className="font-display mt-2 text-4xl leading-none">{faNum(v)}</p>
    </div>
  );
}

function StatsTab() {
  const { token } = useAuth();
  const { push } = useToast();
  const [stats, setStats] = useState<StatsDto | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await api.getStats(token!));
    } catch (err) {
      push("error", "خطا در دریافت آمار", err instanceof ApiError ? err.message : "خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }, [token, push]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl border border-pine-100 bg-white" />
        ))}
      </div>
    );
  }

  const maxPerUser = Math.max(1, ...stats.users.map((u) => u.contactCount));
  const phoneTypes = [
    { label: "موبایل", value: stats.mobileCount, icon: <Smartphone size={15} />, color: "bg-pine-600" },
    { label: "خانه", value: stats.homeCount, icon: <Home size={15} />, color: "bg-honey-400" },
    { label: "محل کار", value: stats.workCount, icon: <Briefcase size={15} />, color: "bg-pine-300" },
  ];
  const recent = [...stats.users].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 4);

  return (
    <div className="animate-fade-up space-y-4">
      {/* کاشی‌های اصلی */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="کل کاربران" value={stats.totalUsers} icon={<Users size={17} />} />
        <StatTile label="کل مخاطبین" value={stats.totalContacts} icon={<BookOpen size={17} />} tone="dark" />
        <StatTile label="شماره‌های ثبت‌شده" value={stats.totalPhones} icon={<Phone size={17} />} tone="honey" />
        <StatTile
          label="میانگین مخاطب هر کاربر"
          value={stats.totalUsers ? Math.round(stats.totalContacts / stats.totalUsers) : 0}
          icon={<BarChart3 size={17} />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        {/* ---------- رتبه‌بندی کاربران ---------- */}
        <section className="animate-fade-up rounded-2xl border border-pine-100 bg-white p-5 shadow-card" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-pine-900">مخاطبین هر کاربر</h2>
            <Badge tone="neutral">{faNum(stats.users.length)} کاربر</Badge>
          </div>
          <ul className="mt-4 space-y-3.5">
            {stats.users.map((u, i) => (
              <li key={u.id} className="flex items-center gap-3">
                <span className="w-5 text-center text-[11px] font-extrabold text-pine-400">{faNum(i + 1)}</span>
                <span
                  className={`font-display grid size-9 shrink-0 place-items-center rounded-lg text-sm ${
                    u.role === "Admin" ? "bg-honey-400 text-pine-950" : "bg-pine-700 text-pine-50"
                  }`}
                >
                  {u.username.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between">
                    <span className="flex items-center gap-2 truncate text-[13px] font-bold text-pine-900">
                      <span dir="ltr">{u.username}</span>
                      {u.role === "Admin" && <ShieldCheck size={13} className="shrink-0 text-honey-500" />}
                    </span>
                    <span className="text-xs font-extrabold text-pine-600">{faNum(u.contactCount)}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-pine-50">
                    <div
                      className={`animate-bar-grow h-full rounded-full ${u.role === "Admin" ? "bg-honey-400" : "bg-pine-600"}`}
                      style={{ width: `${(u.contactCount / maxPerUser) * 100}%`, animationDelay: `${i * 90}ms` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-4">
          {/* ---------- توزیع نوع شماره‌ها ---------- */}
          <section className="animate-fade-up rounded-2xl border border-pine-100 bg-white p-5 shadow-card" style={{ animationDelay: "140ms" }}>
            <h2 className="font-display text-xl text-pine-900">توزیع نوع شماره‌ها</h2>
            <ul className="mt-4 space-y-3">
              {phoneTypes.map((t, i) => {
                const pct = stats.totalPhones ? Math.round((t.value / stats.totalPhones) * 100) : 0;
                return (
                  <li key={t.label}>
                    <div className="flex items-center justify-between text-xs font-bold text-pine-700">
                      <span className="flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-lg bg-pine-50 text-pine-600">{t.icon}</span>
                        {t.label}
                      </span>
                      <span>
                        {faNum(t.value)} <span className="font-normal text-pine-400">({faNum(pct)}٪)</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-pine-50">
                      <div className={`animate-bar-grow h-full rounded-full ${t.color}`} style={{ width: `${pct}%`, animationDelay: `${i * 110}ms` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ---------- تازه‌واردها ---------- */}
          <section className="animate-fade-up rounded-2xl border border-pine-100 bg-white p-5 shadow-card" style={{ animationDelay: "200ms" }}>
            <h2 className="font-display text-xl text-pine-900">تازه‌واردها</h2>
            <ul className="mt-3 divide-y divide-pine-50">
              {recent.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex items-center gap-2.5 text-[13px] font-bold text-pine-800">
                    <span className="grid size-8 place-items-center rounded-lg bg-pine-100 text-pine-600">
                      <UserRoundPlus size={14} />
                    </span>
                    <span dir="ltr">{u.username}</span>
                  </span>
                  <span className="text-[11px] text-pine-500">{faDate(u.createdAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
