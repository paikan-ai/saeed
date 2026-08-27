import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, useEffect } from "react";
import { Loader2, X, AlertTriangle } from "lucide-react";

/* ============================================================
   کامپوننت‌های پایه‌ی رابط کاربری
   ============================================================ */

/* ---------- دکمه ---------- */

type ButtonVariant = "primary" | "honey" | "ghost" | "danger" | "outline";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-pine-700 text-pine-50 hover:bg-pine-800 active:scale-[0.98] shadow-sm shadow-pine-900/20",
  honey:
    "bg-honey-400 text-pine-950 hover:bg-honey-300 active:scale-[0.98] shadow-sm shadow-honey-600/25 font-bold",
  ghost: "text-pine-800 hover:bg-pine-100 active:scale-[0.98]",
  danger: "bg-danger text-white hover:bg-[#a5342a] active:scale-[0.98] shadow-sm shadow-danger/25",
  outline:
    "border border-pine-200 bg-white text-pine-800 hover:border-pine-400 hover:bg-pine-50 active:scale-[0.98]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading, className = "", children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-600 disabled:cursor-not-allowed disabled:opacity-45 ${
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
      } ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

/* ---------- مودال ---------- */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, subtitle, children, wide }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6" dir="rtl">
      <div className="animate-fade-in absolute inset-0 bg-pine-950/55 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`animate-pop relative max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-pine-100 bg-white shadow-lift ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-pine-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 className="font-display text-xl leading-7 text-pine-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-pine-600">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-pine-400 transition hover:bg-pine-50 hover:text-pine-800"
            aria-label="بستن"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------- دیالوگ تأیید ---------- */

interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "حذف شود", loading }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
          <AlertTriangle size={20} />
        </span>
        <div className="text-sm leading-6 text-pine-800">{description}</div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          انصراف
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ---------- فرم ---------- */

export const inputCls =
  "w-full rounded-lg border border-pine-200 bg-white px-3.5 py-2.5 text-sm text-pine-950 placeholder:text-pine-300 transition focus:border-pine-500 focus:ring-2 focus:ring-pine-500/20 focus:outline-none disabled:bg-pine-50";

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-bold text-pine-800">
        {label}
        {hint && <span className="text-[11px] font-normal text-pine-400">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-xs font-medium text-danger">{error}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { invalid, className = "", ...rest } = props;
  return (
    <input
      className={`${inputCls} ${invalid ? "border-danger/60 focus:border-danger focus:ring-danger/15" : ""} ${className}`}
      {...rest}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <select className={`${inputCls} select-caret cursor-pointer appearance-none pe-9 ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
  accent = "pine",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  accent?: "pine" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-right transition ${
        checked
          ? accent === "pine"
            ? "border-pine-400 bg-pine-50"
            : "border-danger/40 bg-danger-soft"
          : "border-pine-200 bg-white hover:border-pine-300"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-all ${
          checked
            ? accent === "pine"
              ? "border-pine-600 bg-pine-600 text-white"
              : "border-danger bg-danger text-white"
            : "border-pine-300 bg-white text-transparent"
        }`}
      >
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m4 12 5 5L20 6" />
        </svg>
      </span>
      <span>
        <span className="block text-[13px] font-bold text-pine-900">{label}</span>
        {description && <span className="mt-0.5 block text-[11px] leading-4 text-pine-600">{description}</span>}
      </span>
    </button>
  );
}

/* ---------- نشان‌ها ---------- */

export function Badge({ tone, children }: { tone: "pine" | "honey" | "danger" | "neutral" | "success"; children: ReactNode }) {
  const tones = {
    pine: "bg-pine-100 text-pine-800 border-pine-200",
    honey: "bg-honey-100 text-honey-700 border-honey-200",
    danger: "bg-danger-soft text-danger border-danger/20",
    success: "bg-success-soft text-success border-success/20",
    neutral: "bg-pine-50 text-pine-600 border-pine-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

/* ---------- حالت‌های خاص ---------- */

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="animate-fade-up col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-pine-300 bg-white/60 px-6 py-16 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-pine-100 text-pine-600">{icon}</div>
      <h3 className="mt-4 font-display text-2xl text-pine-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-pine-600">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-pine-100 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-xl bg-pine-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/5 rounded bg-pine-100" />
          <div className="h-3 w-1/4 rounded bg-pine-50" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-9 rounded-lg bg-pine-50" />
        <div className="h-9 rounded-lg bg-pine-50" />
      </div>
    </div>
  );
}
