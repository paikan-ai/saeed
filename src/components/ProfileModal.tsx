import { FormEvent, useState } from "react";
import { KeyRound, Save, UserRound } from "lucide-react";
import { Modal, Field, TextInput, Button, Badge } from "./ui";
import { useToast } from "./Toast";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { ApiError, faDate } from "../lib/types";

/* ============================================================
   پروفایل کاربر — ویرایش نام کاربری و تغییر رمز عبور
   (هر کاربر فقط به پروفایل خودش دسترسی دارد)
   ============================================================ */
export default function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, token, applyAuth } = useAuth();
  const { push } = useToast();

  const [username, setUsername] = useState(user?.username ?? "");
  const [nameBusy, setNameBusy] = useState(false);

  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passErrors, setPassErrors] = useState<Record<string, string>>({});
  const [passBusy, setPassBusy] = useState(false);

  async function saveUsername(e: FormEvent) {
    e.preventDefault();
    if (username.trim().length < 3) {
      push("error", "نام کاربری کوتاه است", "نام کاربری باید حداقل ۳ کاراکتر باشد.");
      return;
    }
    setNameBusy(true);
    try {
      const res = await api.updateProfile(token!, username.trim());
      applyAuth(res);
      push("success", "پروفایل به‌روز شد", `نام کاربری شما اکنون «${res.user.username}» است.`);
    } catch (err) {
      push("error", "ذخیره ناموفق بود", err instanceof ApiError ? err.message : "خطا در ارتباط با سرور");
    } finally {
      setNameBusy(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!current) errs.current = "رمز فعلی الزامی است.";
    if (newPass.length < 4) errs.newPass = "رمز جدید باید حداقل ۴ کاراکتر باشد.";
    else if (newPass === current) errs.newPass = "رمز جدید نمی‌تواند با رمز فعلی یکسان باشد.";
    if (confirm !== newPass) errs.confirm = "تکرار رمز یکسان نیست.";
    setPassErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPassBusy(true);
    try {
      const res = await api.changePassword(token!, current, newPass);
      applyAuth(res);
      setCurrent("");
      setNewPass("");
      setConfirm("");
      push("success", "رمز عبور تغییر کرد", "از این پس با رمز جدید وارد شوید.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ارتباط با سرور";
      setPassErrors({ current: msg });
    } finally {
      setPassBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="پروفایل کاربری" subtitle="ویرایش نام کاربری و تغییر رمز عبور">
      {/* اطلاعات حساب */}
      <div className="flex items-center gap-3 rounded-xl border border-pine-100 bg-pine-50/60 p-3.5">
        <span className={`font-display grid size-11 place-items-center rounded-xl text-lg ${user?.role === "Admin" ? "bg-honey-400 text-pine-950" : "bg-pine-700 text-pine-50"}`}>
          {user?.username.slice(0, 2)}
        </span>
        <div className="flex-1">
          <p className="text-sm font-extrabold text-pine-950" dir="ltr" style={{ textAlign: "right" }}>
            {user?.username}
          </p>
          <p className="mt-0.5 text-[11px] text-pine-500">عضو از {user ? faDate(user.createdAt) : "—"}</p>
        </div>
        {user?.role === "Admin" ? <Badge tone="honey">مدیر</Badge> : <Badge tone="pine">کاربر</Badge>}
      </div>

      {/* ویرایش نام کاربری */}
      <form onSubmit={saveUsername} className="mt-5">
        <p className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-pine-800">
          <UserRound size={14} className="text-pine-500" /> نام کاربری
        </p>
        <div className="flex gap-2">
          <TextInput dir="ltr" className="text-left" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Button type="submit" loading={nameBusy} disabled={username.trim() === user?.username} className="shrink-0">
            <Save size={15} />
            ذخیره
          </Button>
        </div>
      </form>

      <hr className="my-5 border-dashed border-pine-200" />

      {/* تغییر رمز عبور */}
      <form onSubmit={savePassword} className="space-y-3.5">
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-pine-800">
          <KeyRound size={14} className="text-pine-500" /> تغییر رمز عبور
        </p>
        <Field label="رمز فعلی" error={passErrors.current}>
          <TextInput dir="ltr" type="password" className="text-left" value={current} onChange={(e) => setCurrent(e.target.value)} invalid={!!passErrors.current} />
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="رمز جدید" error={passErrors.newPass}>
            <TextInput dir="ltr" type="password" className="text-left" value={newPass} onChange={(e) => setNewPass(e.target.value)} invalid={!!passErrors.newPass} />
          </Field>
          <Field label="تکرار رمز جدید" error={passErrors.confirm}>
            <TextInput dir="ltr" type="password" className="text-left" value={confirm} onChange={(e) => setConfirm(e.target.value)} invalid={!!passErrors.confirm} />
          </Field>
        </div>
        <Button type="submit" loading={passBusy} variant="outline" className="w-full" disabled={!current && !newPass && !confirm}>
          تغییر رمز عبور
        </Button>
      </form>
    </Modal>
  );
}
