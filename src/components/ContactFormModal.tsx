import { FormEvent, useEffect, useState } from "react";
import { Plus, Smartphone, Trash2 } from "lucide-react";
import { Modal, Field, TextInput, Select, Button } from "./ui";
import { useToast } from "./Toast";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { ContactDto, PhoneRequest, PhoneType, PHONE_TYPE_LABEL, ApiError } from "../lib/types";

/* ============================================================
   فرم افزودن/ویرایش مخاطب — با شماره‌های داینامیک (One-to-Many)
   ============================================================ */

interface PhoneRow {
  key: number;
  phoneNumber: string;
  phoneType: PhoneType;
}

let rowKey = 0;

export default function ContactFormModal({
  open,
  contact,
  onClose,
  onSaved,
}: {
  open: boolean;
  contact: ContactDto | null; // null → ایجاد، در غیر این صورت ویرایش
  onClose: () => void;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const { push } = useToast();

  const [name, setName] = useState("");
  const [rows, setRows] = useState<PhoneRow[]>([]);
  const [errors, setErrors] = useState<{ name?: string; phones?: Record<number, string>; phonesList?: string }>({});
  const [loading, setLoading] = useState(false);

  // هنگام باز شدن، فرم با داده‌ی مخاطب پر می‌شود
  useEffect(() => {
    if (!open) return;
    setName(contact?.name ?? "");
    setErrors({});
    setRows(
      contact && contact.phones.length > 0
        ? contact.phones.map((p) => ({ key: ++rowKey, phoneNumber: p.phoneNumber, phoneType: p.phoneType }))
        : [{ key: ++rowKey, phoneNumber: "", phoneType: "Mobile" as PhoneType }]
    );
  }, [open, contact]);

  const setRow = (key: number, patch: Partial<PhoneRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function validate() {
    const errs: typeof errors = {};
    if (name.trim().length < 2) errs.name = "نام مخاطب باید حداقل ۲ کاراکتر باشد.";
    if (rows.length === 0) errs.phonesList = "حداقل یک شماره تلفن الزامی است.";
    const phoneErrs: Record<number, string> = {};
    for (const r of rows) {
      const trimmed = r.phoneNumber.trim();
      if (!trimmed) phoneErrs[r.key] = "شماره تلفن الزامی است.";
      else if (!/^[0-9+\-\s]{5,20}$/.test(trimmed)) phoneErrs[r.key] = "شماره معتبر نیست (فقط رقم و علائم + - ).";
    }
    if (Object.keys(phoneErrs).length > 0) errs.phones = phoneErrs;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const body = {
      name: name.trim(),
      phones: rows.map((r): PhoneRequest => ({ phoneNumber: r.phoneNumber.trim(), phoneType: r.phoneType })),
    };
    try {
      if (contact) {
        await api.updateContact(token!, contact.id, body);
        push("success", "مخاطب ویرایش شد", `تغییرات «${body.name}» ذخیره شد.`);
      } else {
        await api.createContact(token!, body);
        push("success", "مخاطب اضافه شد", `«${body.name}» به دفترچه شما پیوست.`);
      }
      onSaved();
      onClose();
    } catch (err) {
      push("error", "ذخیره ناموفق بود", err instanceof ApiError ? err.message : "خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={contact ? "ویرایش مخاطب" : "مخاطب جدید"}
      subtitle={contact ? `ویرایش اطلاعات «${contact.name}»` : "نام و یک یا چند شماره تلفن وارد کنید"}
      wide
    >
      <form onSubmit={onSubmit} noValidate>
        <Field label="نام مخاطب" error={errors.name}>
          <TextInput
            placeholder="مثلاً: مریم رضایی"
            value={name}
            onChange={(e) => setName(e.target.value)}
            invalid={!!errors.name}
            autoFocus
          />
        </Field>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-bold text-pine-800">شماره‌های تلفن</span>
            <span className="text-[11px] text-pine-400">{rows.length === 0 ? "بدون شماره" : `${rows.length} شماره`}</span>
          </div>

          <div className="space-y-2.5">
            {rows.map((row, idx) => (
              <div key={row.key} className="animate-fade-up">
                <div className="flex items-stretch gap-2">
                  {/* شماره‌ی ردیف — فقط در صفحه‌های بزرگ‌تر برای صرفه‌جویی در فضا */}
                  <span className="hidden w-7 shrink-0 place-items-center rounded-lg bg-pine-50 text-[11px] font-extrabold text-pine-500 sm:grid">
                    {idx + 1}
                  </span>
                  {/*
                    اصلاح باگ عرض: Select خودش w-full دارد؛ اگر مستقیماً کلاس عرض بگیرد
                    با w-full تداخل می‌کند و کل ردیف را می‌بلعد! پس عرض ثابت را روی
                    Wrapper اعمال می‌کنیم تا Select فقط همان را پُر کند.
                  */}
                  <div className="w-24 shrink-0 sm:w-28">
                    <Select
                      value={row.phoneType}
                      onChange={(e) => setRow(row.key, { phoneType: e.target.value as PhoneType })}
                      aria-label="نوع شماره"
                    >
                      {(Object.keys(PHONE_TYPE_LABEL) as PhoneType[]).map((t) => (
                        <option key={t} value={t}>
                          {PHONE_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {/* flex-1 + min-w-0 → باکس شماره همیشه بقیه‌ی فضای ردیف را می‌گیرد و له نمی‌شود */}
                  <TextInput
                    dir="ltr"
                    inputMode="tel"
                    placeholder="0912 345 6789"
                    className="min-w-0 flex-1 text-left"
                    value={row.phoneNumber}
                    onChange={(e) => setRow(row.key, { phoneNumber: e.target.value })}
                    invalid={!!errors.phones?.[row.key]}
                  />
                  <button
                    type="button"
                    onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                    disabled={rows.length === 1}
                    className="grid w-10 shrink-0 cursor-pointer place-items-center rounded-lg border border-pine-200 text-pine-400 transition hover:border-danger/40 hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="حذف این شماره"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {errors.phones?.[row.key] && (
                  <p className="mt-1 ms-0 text-xs font-medium text-danger sm:ms-9">{errors.phones[row.key]}</p>
                )}
              </div>
            ))}
          </div>

          {errors.phonesList && <p className="mt-2 text-xs font-medium text-danger">{errors.phonesList}</p>}

          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, { key: ++rowKey, phoneNumber: "", phoneType: "Mobile" }])}
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-pine-300 py-2.5 text-[13px] font-bold text-pine-600 transition hover:border-pine-500 hover:bg-pine-50 hover:text-pine-800"
          >
            <Smartphone size={16} />
            <Plus size={15} />
            افزودن شماره دیگر
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-pine-100 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            انصراف
          </Button>
          <Button type="submit" loading={loading}>
            {contact ? "ذخیره‌ی تغییرات" : "افزودن به دفترچه"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
