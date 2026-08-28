import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api, clearSession, initApi, loadSession, saveSession, ApiMode } from "../lib/api";
import { LoginResponse, UserDto } from "../lib/types";
import { useToast } from "../components/Toast";

/* ============================================================
   مدیریت نشست کاربر: ورود، خروج، به‌روزرسانی اطلاعات کاربر
   ============================================================ */

type Status = "loading" | "guest" | "authed";

interface AuthContextValue {
  status: Status;
  user: UserDto | null;
  token: string | null;
  mode: ApiMode;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  /** ذخیره‌ی نشست جدید (بعد از ورود یا تغییر رمز/پروفایل که توکن تازه می‌شود) */
  applyAuth: (res: LoginResponse) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** بررسی سریع انقضای توکن JWT از روی Payload (بدون نیاز به سرور) */
function tokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp * 1000 < Date.now() + 30_000;
  } catch {
    return true;
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth باید داخل AuthProvider استفاده شود");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<ApiMode>("detecting");

  const applyAuth = useCallback((res: LoginResponse) => {
    saveSession({ token: res.token, user: res.user });
    setToken(res.token);
    setUser(res.user);
    setStatus("authed");
  }, []);

  // هنگام بارگذاری: تشخیص سرور واقعی/Mock + بازیابی نشست قبلی
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const detected = await initApi();
      const session = loadSession();

      if (cancelled) return;
      setMode(detected);

      if (!session) {
        setStatus("guest");
        return;
      }

      // هر دو حالت: نشست ذخیره‌شده باید معتبر باشد —
      //  • Mock: بررسی امضا و انقضای توکن شبیه‌سازی‌شده
      //  • واقعی: تأیید توکن از خود سرور با GET /api/auth/me
      //    تا نشست‌های قدیمی/بیگانه باعث خطای «ابتدا وارد شوید» در عملیات نشوند.
      const restored = tokenExpired(session.token) ? null : await api.restoreSession(session);
      if (cancelled) return;
      if (restored) {
        applyAuth(restored);
      } else {
        clearSession();
        setStatus("guest");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyAuth]);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api.login(username, password);
      applyAuth(res);
      return res;
    },
    [applyAuth]
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setToken(null);
    setStatus("guest");
  }, []);

  const { push } = useToast();

  // شنونده‌ی سراسری 401 — اگر سرور هر درخواستِ احراز هویت‌شده‌ای را نپذیرفت
  // (توکن منقضی/نامعتبر)، به‌جای نمایش خطای تکراری در هر عملیات، نشست پاک شده
  // و کاربر با یک پیام روشن به صفحه‌ی ورود هدایت می‌شود.
  useEffect(() => {
    const onUnauthorized = () => {
      logout();
      push("info", "نشست شما پایان یافت", "توکن ورود نامعتبر یا منقضی شده است؛ لطفاً دوباره وارد شوید.");
    };
    window.addEventListener("phonebook:unauthorized", onUnauthorized);
    return () => window.removeEventListener("phonebook:unauthorized", onUnauthorized);
  }, [logout, push]);

  return (
    <AuthContext.Provider value={{ status, user, token, mode, login, logout, applyAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
