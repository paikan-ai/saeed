import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Copy,
  Home,
  BookOpen,
  Pencil,
  Phone,
  Plus,
  Search,
  SearchX,
  Smartphone,
  Trash2,
  UserPlus,
  Eye,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { api } from "../lib/api";
import { ApiError, ContactDto, PhoneType, PHONE_TYPE_LABEL, faDate, faNum } from "../lib/types";
import { Button, ConfirmDialog, EmptyState, SkeletonCard, Badge } from "../components/ui";
import ContactFormModal from "../components/ContactFormModal";

/* ============================================================
   داشبورد مخاطبین — لیست، جستجوی پیشرفته، فیلتر حروف الفبا،
   مرتب‌سازی و CRUD با توجه به سطوح دسترسی کاربر
   ============================================================ */

const ALPHABET = "آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی".split("");

/** نرمال‌سازی حروف عربی/فارسی برای فیلتر الفبا */
const normalize = (s: string) => s.replace(/ي/g, "ی").replace(/ك/g, "ک").trim();

const AVATAR_TONES = [
  "bg-pine-600 text-pine-50",
  "bg-honey-400 text-pine-950",
  "bg-pine-800 text-honey-300",
  "bg-pine-200 text-pine-900",
  "bg-pine-500 text-white",
  "bg-honey-600 text-honey-100",
];

const PHONE_ICON: Record<PhoneType, ReactNode> = {
  Mobile: <Smartphone size={15} />,
  Home: <Home size={15} />,
  Work: <Briefcase size={15} />,
};

type SortKey = "newest" | "oldest" | "alpha";

export default function ContactsPage() {
  const { user, token } = useAuth();
  const { push } = useToast();

  const [contacts, setContacts] = useState<ContactDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [letter, setLetter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("newest");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContactDto | null>(null);
  const [deleting, setDeleting] = useState<ContactDto | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const debounceRef = useRef<number>(0);

  // ---------- سطوح دسترسی کاربر جاری ----------
  const isAdmin = user!.role === "Admin";
  const p = user!.permissions;
  const viewOnly = !isAdmin && p.canViewOnly;
  const canCreate = isAdmin || (!p.canViewOnly && p.canCreate);
  const canEdit = isAdmin || (!p.canViewOnly && p.canEdit);
  const canDelete = isAdmin || (!p.canViewOnly && p.canDelete);

  // ---------- بارگذاری لیست ----------
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listContacts(token!, search || undefined);
      setContacts(list);
    } catch (err) {
      push("error", "خطا در دریافت مخاطبین", err instanceof ApiError ? err.message : "خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }, [token, search, push]);

  useEffect(() => {
    load();
  }, [load]);

  // جستجوی Debounce شده (۳۰۰ میلی‌ثانیه)
  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(debounceRef.current);
  }, [searchInput]);

  // ---------- فیلتر و مرتب‌سازی سمت کلاینت ----------
  const visible = useMemo(() => {
    let list = contacts;
    if (letter) list = list.filter((c) => normalize(c.name).startsWith(letter) || (letter === "آ" && normalize(c.name).startsWith("ا")));
    switch (sort) {
      case "newest":
        list = [...list].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        break;
      case "oldest":
        list = [...list].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
        break;
      case "alpha":
        list = [...list].sort((a, b) => a.name.localeCompare(b.name, "fa"));
        break;
    }
    return list;
  }, [contacts, letter, sort]);

  // حروفی که حداقل یک مخاطب با آن‌ها وجود دارد
  const activeLetters = useMemo(() => {
    const set = new Set(contacts.map((c) => normalize(c.name)[0]).filter(Boolean));
    if (set.has("ا")) set.add("آ");
    return set;
  }, [contacts]);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.deleteContact(token!, deleting.id);
      push("success", "مخاطب حذف شد", `«${deleting.name}» از دفترچه پاک شد.`);
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
      {/* ---------- سربرگ ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-pine-950">مخاطبین من</h1>
          <p className="mt-1 flex items-center gap-2 text-[13px] text-pine-600">
            {loading ? "در حال بارگذاری…" : `${faNum(visible.length)} مخاطب`}
            {!loading && search && ` برای «${search}»`}
            {viewOnly && (
              <Badge tone="honey">
                <Eye size={11} /> فقط مشاهده
              </Badge>
            )}
          </p>
        </div>
        {canCreate && (
          <Button
            variant="honey"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <UserPlus size={17} />
            مخاطب جدید
          </Button>
        )}
      </div>

      {/* ---------- نوار ابزار: جستجو / الفبا / مرتب‌سازی ---------- */}
      <div className="mt-5 rounded-2xl border border-pine-100 bg-white p-4 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={17} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-pine-400" />
            <input
              className="w-full rounded-xl border border-pine-200 bg-pine-50/50 py-2.5 pe-4 ps-10 text-sm transition placeholder:text-pine-300 focus:border-pine-500 focus:bg-white focus:ring-2 focus:ring-pine-500/15 focus:outline-none"
              placeholder="جستجو در نام مخاطب یا شماره تلفن…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                }}
                className="absolute top-1/2 left-3 -translate-y-1/2 cursor-pointer rounded-md px-1.5 text-[11px] font-bold text-pine-400 transition hover:bg-pine-100 hover:text-pine-800"
              >
                پاک کردن
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-pine-400">مرتب‌سازی:</span>
            <div className="flex rounded-lg border border-pine-200 p-0.5 text-xs font-bold">
              {(
                [
                  ["newest", "جدیدترین"],
                  ["oldest", "قدیمی‌ترین"],
                  ["alpha", "الفبایی"],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className={`cursor-pointer rounded-md px-3 py-1.5 transition ${
                    sort === key ? "bg-pine-700 text-pine-50 shadow-sm" : "text-pine-600 hover:text-pine-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* نوار حروف الفبا — مثل دفترچه تلفن‌های کاغذی */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1 border-t border-dashed border-pine-200 pt-3.5">
          <button
            onClick={() => setLetter(null)}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-[13px] font-bold transition ${
              letter === null ? "bg-honey-400 text-pine-950 shadow-sm" : "text-pine-600 hover:bg-pine-100"
            }`}
          >
            همه
          </button>
          <span className="mx-1 h-4 w-px bg-pine-200" />
          {ALPHABET.map((l) => {
            const enabled = activeLetters.has(l);
            return (
              <button
                key={l}
                disabled={!enabled}
                onClick={() => setLetter(letter === l ? null : l)}
                className={`size-7 cursor-pointer rounded-md text-[13px] font-bold transition disabled:cursor-default ${
                  letter === l
                    ? "bg-pine-700 text-pine-50 shadow-sm"
                    : enabled
                      ? "text-pine-700 hover:bg-pine-100"
                      : "text-pine-200"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------- شبکه‌ی کارت‌ها ---------- */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <>
            <SkeletonCard /> <SkeletonCard /> <SkeletonCard />
          </>
        ) : visible.length === 0 ? (
          search || letter ? (
            <EmptyState
              icon={<SearchX size={30} />}
              title="چیزی پیدا نشد"
              description={
                search
                  ? `هیچ مخاطب یا شماره‌ای مطابق «${search}» در دفترچه‌ی شما نیست.`
                  : `مخاطبی که با حرف «${letter}» شروع شود وجود ندارد.`
              }
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setLetter(null);
                  }}
                >
                  نمایش همه‌ی مخاطبین
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<BookOpen size={30} />}
              title={viewOnly ? "دفترچه‌ی شما خالی است" : "هنوز مخاطبی ندارید"}
              description={
                viewOnly
                  ? "هنوز مخاطبی برای شما ثبت نشده است. به‌محض ثبت، اینجا نمایش داده می‌شود."
                  : "اولین مخاطب‌تان را اضافه کنید؛ هر مخاطب می‌تواند چند شماره (موبایل، خانه، محل کار) داشته باشد."
              }
              action={
                canCreate ? (
                  <Button variant="honey" onClick={() => setFormOpen(true)}>
                    <Plus size={16} />
                    افزودن اولین مخاطب
                  </Button>
                ) : undefined
              }
            />
          )
        ) : (
          visible.map((contact, idx) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              index={idx}
              query={search}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={() => {
                setEditing(contact);
                setFormOpen(true);
              }}
              onDelete={() => setDeleting(contact)}
            />
          ))
        )}
      </div>

      {/* ---------- مودال‌ها ---------- */}
      <ContactFormModal open={formOpen} contact={editing} onClose={() => setFormOpen(false)} onSaved={load} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteBusy}
        title="حذف مخاطب"
        confirmLabel="بله، حذف شود"
        description={
          <>
            آیا از حذف <b className="text-pine-950">«{deleting?.name}»</b> مطمئن هستید؟ این مخاطب به‌همراه{" "}
            <b>{faNum(deleting?.phones.length ?? 0)} شماره تلفن</b> برای همیشه پاک می‌شود.
          </>
        }
      />
    </div>
  );
}

/* ============================================================
   کارت مخاطب
   ============================================================ */
function ContactCard({
  contact,
  index,
  query,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  contact: ContactDto;
  index: number;
  query: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { push } = useToast();
  const tone = AVATAR_TONES[contact.id % AVATAR_TONES.length];
  const initials = contact.name.trim().slice(0, 2);

  async function copy(phone: string) {
    try {
      await navigator.clipboard.writeText(phone.replace(/\s/g, ""));
      push("info", "کپی شد", phone);
    } catch {
      push("error", "کپی ناموفق بود");
    }
  }

  return (
    <article
      className="animate-fade-up group flex flex-col rounded-2xl border border-pine-100 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-pine-300 hover:shadow-lift"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      {/* سربرگ کارت */}
      <div className="flex items-start gap-3">
        <span className={`font-display grid size-12 shrink-0 place-items-center rounded-xl text-lg ${tone}`}>
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-extrabold text-pine-950">
            <Highlight text={contact.name} query={query} />
          </h3>
          <p className="mt-0.5 text-[11px] text-pine-500">ثبت در {faDate(contact.createdAt)}</p>
        </div>
        {(canEdit || canDelete) && (
          <div className="flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
            {canEdit && (
              <button
                onClick={onEdit}
                className="cursor-pointer rounded-lg p-2 text-pine-400 transition hover:bg-pine-100 hover:text-pine-800"
                aria-label="ویرایش مخاطب"
                title="ویرایش"
              >
                <Pencil size={15} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="cursor-pointer rounded-lg p-2 text-pine-400 transition hover:bg-danger-soft hover:text-danger"
                aria-label="حذف مخاطب"
                title="حذف"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* شماره‌ها */}
      <ul className="mt-4 space-y-2">
        {contact.phones.map((ph) => (
          <li
            key={ph.id}
            className="flex items-center gap-2.5 rounded-xl border border-pine-100 bg-pine-50/60 py-2 pe-2.5 ps-2 transition hover:border-pine-300 hover:bg-white"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-pine-600 shadow-sm" title={PHONE_TYPE_LABEL[ph.phoneType]}>
              {PHONE_ICON[ph.phoneType]}
            </span>
            <div className="min-w-0 flex-1">
              <a href={`tel:${ph.phoneNumber.replace(/\s/g, "")}`} dir="ltr" className="block truncate text-left text-[13px] font-bold tracking-wide text-pine-900 transition hover:text-pine-600">
                <Highlight text={ph.phoneNumber} query={query} />
              </a>
              <span className="block text-[10px] text-pine-400">{PHONE_TYPE_LABEL[ph.phoneType]}</span>
            </div>
            <button
              onClick={() => copy(ph.phoneNumber)}
              className="cursor-pointer rounded-md p-1.5 text-pine-300 transition hover:bg-pine-100 hover:text-pine-700"
              aria-label="کپی شماره"
              title="کپی"
            >
              <Copy size={14} />
            </button>
          </li>
        ))}
      </ul>

      {/* پانوشت */}
      <div className="mt-auto flex items-center justify-between pt-4 text-[11px] text-pine-400">
        <span className="flex items-center gap-1.5">
          <Phone size={12} />
          {faNum(contact.phones.length)} شماره
        </span>
        <span className="font-bold text-pine-300 transition group-hover:text-honey-500">#{faNum(contact.id)}</span>
      </div>
    </article>
  );
}

/** هایلایت کردن عبارت جستجو داخل متن */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const q = query.replace(/\s/g, "");
  const idx = text.replace(/\s/g, "").toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  // نگاشت اندیسِ بدون‌فاصله به متن اصلی
  let pos = 0;
  let start = -1;
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " ") continue;
    if (count === idx) start = i;
    count++;
    if (count === idx + q.length) {
      pos = i + 1;
      break;
    }
  }
  if (start === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded bg-honey-200 px-0.5 text-pine-950">{text.slice(start, pos)}</mark>
      {text.slice(pos)}
    </>
  );
}
