import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, KeyRound, Pencil, ShieldCheck, Trash2, UserPlus, X, UserCog } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { api } from "../lib/api";
import { ApiError, Role, UserDto, faDate, faNum } from "../lib/types";
import { Badge, Button, Checkbox, ConfirmDialog, Field, Modal, Select, TextInput } from "../components/ui";

/* ============================================================
   مدیریت کاربران (فقط ادمین): لیست، ایجاد، ویرایش، حذف و
   تعیین سطوح دسترسی CanCreate/CanEdit/CanDelete/CanViewOnly
   ============================================================ */

export default function UsersManager() {
  const { user: me, token } = useAuth();
  const { push } = useToast();

  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<null | { editing: UserDto | null }>(null);
  const [deleting, setDeleting] = useState<UserDto | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await api.listUsers(token!));
    } catch (err) {
      push("error", "خطا در دریافت کاربران", err instanceof ApiError ? err.message : "خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }, [token, push]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.deleteUser(token!, deleting.id);
      push("success", "کاربر حذف شد", `حساب «${deleting.username}» و همه‌ی مخاطبینش پاک شد.`);
      setDeleting(null);
      load();
    } catch (err) {
      push("error", "حذف ناموفق بود", err instanceof ApiError ? err.message : "خطا در ارتباط با سرور");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-pine-950">مدیریت کاربران</h1>
          <p className="mt-1 text-[13px] text-pine-600">
            {loading ? "در حال بارگذاری…" : `${faNum(users.length)} کاربر فعال`} — دسترسی‌ها از ورودِ بعدیِ هر کاربر اعمال می‌شوند (داخل توکن JWT).
          </p>
        </div>
        <Button variant="honey" onClick={() => setFormState({ editing: null })}>
          <UserPlus size={17} />
          کاربر جدید
        </Button>
      </div>

      {/* ---------- جدول کاربران ---------- */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-pine-100 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-pine-100 bg-pine-50/60 text-right text-[11px] font-extrabold tracking-wide text-pine-500">
                <th className="px-5 py-3.5">کاربر</th>
                <th className="px-4 py-3.5">نقش</th>
                <th className="px-4 py-3.5">دسترسی‌ها</th>
                <th className="px-4 py-3.5">مخاطبین</th>
                <th className="px-4 py-3.5">عضویت</th>
                <th className="px-4 py-3.5 text-left">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-pine-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-pine-100" />
                        <div className="h-4 w-24 rounded bg-pine-100" />
                      </div>
                    </td>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 w-14 rounded bg-pine-50" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                users.map((u) => {
                  const self = u.id === me!.id;
                  return (
                    <tr key={u.id} className="group border-b border-pine-50 transition last:border-0 hover:bg-pine-50/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-display grid size-9 shrink-0 place-items-center rounded-lg text-sm ${
                              u.role === "Admin" ? "bg-honey-400 text-pine-950" : "bg-pine-700 text-pine-50"
                            }`}
                          >
                            {u.username.slice(0, 2)}
                          </span>
                          <div>
                            <p className="font-extrabold text-pine-950" dir="ltr" style={{ textAlign: "right" }}>
                              {u.username}
                              {self && <span className="ms-2 text-[10px] font-bold text-honey-600">(شما)</span>}
                            </p>
                            <p className="text-[11px] text-pine-400">شناسه {faNum(u.id)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {u.role === "Admin" ? (
                          <Badge tone="honey">
                            <ShieldCheck size={11} /> مدیر
                          </Badge>
                        ) : (
                          <Badge tone="pine">کاربر</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <PermissionBadges u={u} />
                      </td>
                      <td className="px-4 py-3.5 font-bold text-pine-800">{faNum(u.contactCount)}</td>
                      <td className="px-4 py-3.5 text-xs text-pine-500">{faDate(u.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                          <button
                            onClick={() => setFormState({ editing: u })}
                            className="cursor-pointer rounded-lg p-2 text-pine-400 transition hover:bg-pine-100 hover:text-pine-800"
                            title="ویرایش کاربر"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleting(u)}
                            disabled={self}
                            className="cursor-pointer rounded-lg p-2 text-pine-400 transition hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                            title={self ? "نمی‌توانید خودتان را حذف کنید" : "حذف کاربر"}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- مودال ایجاد/ویرایش کاربر ---------- */}
      {formState && (
        <UserFormModal
          editing={formState.editing}
          onClose={() => setFormState(null)}
          onSaved={() => {
            setFormState(null);
            load();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteBusy}
        title="حذف کاربر"
        confirmLabel="بله، کاربر حذف شود"
        description={
          <>
            حساب <b dir="ltr" className="text-pine-950">{deleting?.username}</b> به‌همراه{" "}
            <b>{faNum(deleting?.contactCount ?? 0)} مخاطب</b> برای همیشه حذف می‌شود. این عملیات قابل بازگشت نیست.
          </>
        }
      />
    </div>
  );
}

/* ---------- نمایش فشرده‌ی دسترسی‌ها ---------- */
function PermissionBadges({ u }: { u: UserDto }) {
  if (u.role === "Admin")
    return (
      <Badge tone="success">
        <Check size={11} /> دسترسی کامل
      </Badge>
    );
  if (u.permissions.canViewOnly)
    return (
      <Badge tone="honey">
        <KeyRound size={11} /> فقط مشاهده
      </Badge>
    );
  const items: [boolean, string][] = [
    [u.permissions.canCreate, "ایجاد"],
    [u.permissions.canEdit, "ویرایش"],
    [u.permissions.canDelete, "حذف"],
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(([has, label]) => (
        <span
          key={label}
          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
            has ? "bg-success-soft text-success" : "bg-pine-50 text-pine-300 line-through"
          }`}
        >
          {has ? <Check size={10} /> : <X size={10} />}
          {label}
        </span>
      ))}
    </div>
  );
}

/* ============================================================
   فرم کاربر — ایجاد یا ویرایش + تعیین نقش و دسترسی‌ها
   ============================================================ */
function UserFormModal({ editing, onClose, onSaved }: { editing: UserDto | null; onClose: () => void; onSaved: () => void }) {
  const { token } = useAuth();
  const { push } = useToast();

  const [username, setUsername] = useState(editing?.username ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(editing?.role ?? "User");
  const [canCreate, setCanCreate] = useState(editing?.permissions.canCreate ?? true);
  const [canEdit, setCanEdit] = useState(editing?.permissions.canEdit ?? true);
  const [canDelete, setCanDelete] = useState(editing?.permissions.canDelete ?? true);
  const [viewOnly, setViewOnly] = useState(editing?.permissions.canViewOnly ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (username.trim().length < 3) errs.username = "نام کاربری باید حداقل ۳ کاراکتر باشد.";
    if (!editing && password.length < 4) errs.password = "رمز عبور باید حداقل ۴ کاراکتر باشد.";
    if (editing && password && password.length < 4) errs.password = "رمز جدید باید حداقل ۴ کاراکتر باشد.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      if (editing) {
        await api.updateUser(token!, editing.id, {
          username: username.trim(),
          newPassword: password || null,
          role,
          canCreate,
          canEdit,
          canDelete,
          canViewOnly: viewOnly,
        });
        push("success", "کاربر ویرایش شد", `تغییرات «${username}» ذخیره شد و از ورود بعدی‌اش اعمال می‌شود.`);
      } else {
        await api.createUser(token!, {
          username: username.trim(),
          password,
          role,
          canCreate,
          canEdit,
          canDelete,
          canViewOnly: viewOnly,
        });
        push("success", "کاربر ساخته شد", `حساب «${username}» آماده‌ی ورود است.`);
      }
      onSaved();
    } catch (err) {
      push("error", "ذخیره ناموفق بود", err instanceof ApiError ? err.message : "خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }

  const toggleViewOnly = (v: boolean) => {
    setViewOnly(v);
    if (v) {
      setCanCreate(false);
      setCanEdit(false);
      setCanDelete(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? `ویرایش کاربر ${editing.username}` : "تعریف کاربر جدید"}
      subtitle="نقش و سطوح دسترسی مخاطبین را مشخص کنید"
      wide
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نام کاربری" error={errors.username}>
            <TextInput dir="ltr" className="text-left" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" autoFocus />
          </Field>
          <Field
            label={editing ? "رمز عبور جدید (اختیاری)" : "رمز عبور"}
            error={errors.password}
            hint={editing ? "برای ریست رمز پر کنید" : "حداقل ۴ کاراکتر"}
          >
            <TextInput dir="ltr" type="password" className="text-left" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••" />
          </Field>
        </div>

        {/* نقش */}
        <div className="mt-4">
          <span className="mb-1.5 block text-[13px] font-bold text-pine-800">نقش</span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["User", "کاربر عادی", "فقط مخاطبین خودش را مدیریت می‌کند"],
                ["Admin", "مدیر سیستم", "دسترسی کامل به کاربران و آمار"],
              ] as [Role, string, string][]
            ).map(([r, label, desc]) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`cursor-pointer rounded-xl border p-3 text-right transition ${
                  role === r ? "border-pine-500 bg-pine-50 ring-2 ring-pine-500/15" : "border-pine-200 bg-white hover:border-pine-300"
                }`}
              >
                <span className="block text-[13px] font-extrabold text-pine-900">{label}</span>
                <span className="mt-0.5 block text-[11px] leading-4 text-pine-500">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* دسترسی‌ها */}
        <div className={`mt-4 transition ${role === "Admin" ? "pointer-events-none opacity-40" : ""}`}>
          <div className="mb-1.5 flex items-center gap-2">
            <UserCog size={15} className="text-pine-500" />
            <span className="text-[13px] font-bold text-pine-800">دسترسی‌های مخاطبین</span>
            {role === "Admin" && <span className="text-[10px] text-pine-400">(مدیر همیشه دسترسی کامل دارد)</span>}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Checkbox checked={viewOnly} onChange={toggleViewOnly} label="فقط مشاهده (CanViewOnly)" description="دکمه‌های ایجاد/ویرایش/حذف برایش غیرفعال می‌شود" accent="danger" />
            <Checkbox checked={canCreate} onChange={setCanCreate} disabled={viewOnly} label="ایجاد مخاطب (CanCreate)" description="افزودن مخاطب جدید به دفترچه" />
            <Checkbox checked={canEdit} onChange={setCanEdit} disabled={viewOnly} label="ویرایش مخاطب (CanEdit)" description="تغییر نام و شماره‌های مخاطبین" />
            <Checkbox checked={canDelete} onChange={setCanDelete} disabled={viewOnly} label="حذف مخاطب (CanDelete)" description="پاک کردن مخاطب به‌همراه شماره‌هایش" />
          </div>
          {viewOnly && (
            <p className="mt-2 rounded-lg bg-honey-100 px-3 py-2 text-[11px] font-semibold text-honey-700">
              حالت «فقط مشاهده» فعال است — این کاربر صرفاً می‌تواند مخاطبینش را ببیند و جستجو کند.
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-pine-100 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            انصراف
          </Button>
          <Button type="submit" loading={loading}>
            {editing ? "ذخیره‌ی تغییرات" : "ایجاد کاربر"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
