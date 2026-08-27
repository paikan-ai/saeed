import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

/* ============================================================
   سیستم Toast Notification — پیام‌های موفقیت/خطا/اطلاع‌رسانی
   ============================================================ */

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  push: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ push: () => {} });

export const useToast = () => useContext(ToastContext);

const STYLES: Record<ToastType, { bar: string; icon: ReactNode; ring: string }> = {
  success: { bar: "bg-success", icon: <CheckCircle2 className="text-success" size={20} />, ring: "border-success/25" },
  error: { bar: "bg-danger", icon: <AlertTriangle className="text-danger" size={20} />, ring: "border-danger/25" },
  info: { bar: "bg-honey-500", icon: <Info className="text-honey-600" size={20} />, ring: "border-honey-400/30" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = ++counter.current;
      setItems((prev) => [...prev.slice(-3), { id, type, title, message }]);
      window.setTimeout(() => remove(id), 4200);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {/* جایگاه Toastها — گوشه‌ی پایین */}
      <div className="fixed bottom-4 left-4 z-[70] flex w-[min(92vw,360px)] flex-col gap-2" dir="rtl">
        {items.map((t) => {
          const s = STYLES[t.type];
          return (
            <div
              key={t.id}
              className={`animate-toast-in relative overflow-hidden rounded-xl border ${s.ring} bg-white shadow-lift`}
              role="status"
            >
              <div className="flex items-start gap-3 p-3.5 pe-9">
                <span className="mt-0.5 shrink-0">{s.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-pine-950">{t.title}</p>
                  {t.message && <p className="mt-0.5 text-xs leading-5 text-pine-700/80">{t.message}</p>}
                </div>
              </div>
              <button
                onClick={() => remove(t.id)}
                className="absolute top-2.5 left-2.5 rounded-md p-1 text-pine-400 transition hover:bg-pine-50 hover:text-pine-800"
                aria-label="بستن پیام"
              >
                <X size={14} />
              </button>
              {/* نوار پیشرفت بسته شدن خودکار */}
              <div className={`h-0.5 ${s.bar}`} style={{ animation: "bar-grow 4.2s linear reverse both", transformOrigin: "right" }} />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
