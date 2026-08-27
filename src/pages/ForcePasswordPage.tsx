import { FormEvent, useState } from "react";
import { KeyRound, LogOut, LockKeyhole, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { Button, Field, TextInput } from "../components/ui";
import { api } from "../lib/api";
import { ApiError } from "../lib/types";
import { Logo } from "./LoginPage";

/* ============================================================
   صفحه‌ی تغییر رمز اجباری — فقط برای ادمین در اولین ورود
   (تا وقتی رمز عوض نشود، راهی به داشبورد نیست)
   ============================================================ */
export default function ForcePasswordPage() {
  const { user, token, applyAuth, logout } = useAuth();
  const { push } = useToast();

  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!current) errs.current = "رمز عبور فعلی الزامی است.";
    if (newPass.length < 4) errs.newPass = "رمز جدید باید حداقل ۴ کاراکتر باشد.";
    else if (newPass === current) errs.newPass = "رمز جدید نمی‌تواند با رمز فعلی یکسان باشد.";
    if (confirm !== newPass) errs.confirm = "تکرار رمز با رمز جدید یکسان نیست.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const res = await api.changePassword(token!, current, newPass);
      applyAuth(res); // توکن تازه با IsPasswordChanged=true
      push("success", "رمز عبور تغییر کرد", "اکنون به داشبورد مدیر دسترسی دارید.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ارتباط با سرور";
      setErrors({ current: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-dots-light flex min-h-screen items-center justify-center bg-pine-900 px-4 py-10">
      <div className="animate-pop w-full max-w-md">
        {/* سربرگ */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <p className="font-display text-xl text-pine-50">دفترچه تلفن</p>
          </div>
          <button
            onClick={logout}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-pine-200 transition hover:bg-pine-800 hover:text-pine-50"
          >
            <LogOut size={14} />
            خروج از حساب
          </button>
        </div>

        <div className="rounded-2xl border border-pine-700 bg-white p-7 shadow-lift">
          <div className="flex items-start gap-4">
            <span className="animate-ring-pulse grid size-12 shrink-0 place-items-center rounded-xl bg-honey-100 text-honey-600">
              <KeyRound size={24} />
            </span>
            <div>
              <h1 className="font-display text-2xl text-pine-950">تغییر رمز عبور الزامی است</h1>
              <p className="mt-1 text-[13px] leading-6 text-pine-600">
                حساب <b dir="ltr" className="text-pine-900">{user?.username}</b> با رمز اولیه وارد شده است؛ برای ادامه، رمز جدیدی تعیین کنید.
              </p>
            </div>
          </div>

          {/* مراحل */}
          <ol className="mt-5 flex items-center gap-2 text-[11px] font-bold">
            <li className="flex items-center gap-1.5 text-success">
              <span className="grid size-5 place-items-center rounded-full bg-success-soft"><Check size={12} /></span>
              ورود موفق
            </li>
            <span className="h-px flex-1 bg-pine-200" />
            <li className="flex items-center gap-1.5 text-honey-600">
              <span className="grid size-5 place-items-center rounded-full bg-honey-100"><LockKeyhole size={12} /></span>
              تغییر رمز
            </li>
            <span className="h-px flex-1 bg-pine-200" />
            <li className="text-pine-400">داشبورد</li>
          </ol>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <Field label="رمز عبور فعلی" error={errors.current}>
              <TextInput
                dir="ltr"
                type="password"
                className="text-left"
                placeholder="123"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                invalid={!!errors.current}
                autoFocus
              />
            </Field>
            <Field label="رمز عبور جدید" error={errors.newPass} hint="حداقل ۴ کاراکتر">
              <TextInput
                dir="ltr"
                type="password"
                className="text-left"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                invalid={!!errors.newPass}
              />
            </Field>
            <Field label="تکرار رمز جدید" error={errors.confirm}>
              <TextInput
                dir="ltr"
                type="password"
                className="text-left"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                invalid={!!errors.confirm}
              />
            </Field>
            <Button type="submit" loading={loading} className="w-full py-3">
              <LockKeyhole size={17} />
              ذخیره‌ی رمز جدید و ادامه
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-pine-300">
          این پیام فقط یک بار — پس از تغییر رمز — نمایش داده می‌شود.
        </p>
      </div>
    </div>
  );
}
