/* ============================================================
   سرور شبیه‌سازی‌شده (Mock) — دقیقاً همان قرارداد API بک‌اند ASP.NET:
   - صدور/اعتبارسنجی توکن JWTگونه با Claimهای سطوح دسترسی
   - جداسازی داده‌ی هر کاربر (OwnerId)
   - اجبار ادمین به تغییر رمز پس از اولین ورود
   - ذخیره‌سازی در LocalStorage برای ماندگاری داده بین رفرش‌ها
   ============================================================ */

import {
  ApiError,
  ContactDto,
  ContactRequest,
  CreateUserRequest,
  LoginResponse,
  PhoneType,
  Role,
  StatsDto,
  UpdateUserRequest,
  UserDto,
} from "./types";

/* ---------- مدل داده‌ی داخلی ---------- */

interface DbUser {
  id: number;
  username: string;
  passwordHash: string;
  salt: string;
  role: Role;
  isPasswordChanged: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewOnly: boolean;
  createdAt: string;
}

interface DbPhone {
  id: number;
  phoneNumber: string;
  phoneType: PhoneType;
}

interface DbContact {
  id: number;
  name: string;
  ownerId: number;
  createdAt: string;
  phones: DbPhone[];
}

interface DbShape {
  users: DbUser[];
  contacts: DbContact[];
  seq: number;
}

interface Claims {
  sub: number;
  unique_name: string;
  role: Role;
  ipc: boolean; // isPasswordChanged
  p_c: boolean;
  p_e: boolean;
  p_d: boolean;
  p_v: boolean;
  exp: number;
}

const DB_KEY = "phonebook.db.v1";
const SECRET = "phonebook-mock-secret-2026";

/* ---------- ابزارهای پایه ---------- */

const delay = () => new Promise((r) => setTimeout(r, 150 + Math.random() * 250));

function digest(str: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = ((h1 ^ c) * 16777619) >>> 0;
    h2 = (((h2 + c) * 2246822519) >>> 0) ^ h1;
  }
  return h1.toString(36) + "." + h2.toString(36);
}

const hashPassword = (password: string, salt: string) => digest(`${salt}::${password}::phonebook`);

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));
const unb64 = (s: string) => decodeURIComponent(escape(atob(s)));

function signToken(u: DbUser): string {
  const isAdmin = u.role === "Admin";
  const claims: Claims = {
    sub: u.id,
    unique_name: u.username,
    role: u.role,
    ipc: u.isPasswordChanged,
    p_c: isAdmin || u.canCreate,
    p_e: isAdmin || u.canEdit,
    p_d: isAdmin || u.canDelete,
    p_v: !isAdmin && u.canViewOnly,
    exp: Date.now() + 8 * 3600 * 1000, // ۸ ساعت — مثل بک‌اند
  };
  const h = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64(JSON.stringify(claims));
  return `${h}.${p}.${digest(h + "." + p + SECRET)}`;
}

function verifyToken(token: string): Claims {
  const parts = token.split(".");
  if (parts.length !== 3) throw new ApiError(401, "ابتدا وارد حساب کاربری خود شوید.");
  const sig = digest(parts[0] + "." + parts[1] + SECRET);
  if (sig !== parts[2]) throw new ApiError(401, "ابتدا وارد حساب کاربری خود شوید.");
  const claims = JSON.parse(unb64(parts[1])) as Claims;
  if (claims.exp < Date.now()) throw new ApiError(401, "نشست شما منقضی شده است؛ دوباره وارد شوید.");
  return claims;
}

/* ---------- Seed اولیه (مشابه AppDbContext.SeedAsync در بک‌اند) ---------- */

function seed(): DbShape {
  const mkUser = (
    id: number,
    username: string,
    password: string,
    role: Role,
    ipc: boolean,
    perms: [boolean, boolean, boolean, boolean],
    createdDaysAgo: number
  ): DbUser => {
    const salt = digest(`salt-${id}-${username}`);
    return {
      id,
      username,
      salt,
      passwordHash: hashPassword(password, salt),
      role,
      isPasswordChanged: ipc,
      canCreate: perms[0],
      canEdit: perms[1],
      canDelete: perms[2],
      canViewOnly: perms[3],
      createdAt: new Date(Date.now() - createdDaysAgo * 864e5).toISOString(),
    };
  };

  const users = [
    // ادمین اولیه با رمز 123 و IsPasswordChanged=false → تغییر رمز اجباری
    mkUser(1, "admin", "123", "Admin", false, [true, true, true, false], 90),
    mkUser(2, "sara", "1234", "User", true, [true, true, true, false], 45),
    mkUser(3, "reza", "1234", "User", true, [false, false, false, true], 30),
  ];

  const mkContact = (id: number, ownerId: number, name: string, phones: [string, PhoneType][], daysAgo: number): DbContact => ({
    id,
    ownerId,
    name,
    createdAt: new Date(Date.now() - daysAgo * 864e5).toISOString(),
    phones: phones.map(([phoneNumber, phoneType], i) => ({ id: id * 10 + i, phoneNumber, phoneType })),
  });

  const contacts = [
    // مخاطبین sara
    mkContact(101, 2, "مریم رضایی", [["0912 123 4567", "Mobile"]], 40),
    mkContact(102, 2, "علی محمدی", [["0935 111 2233", "Mobile"], ["021 8877 6655", "Work"]], 36),
    mkContact(103, 2, "حسین کریمی", [["021 4433 2211", "Work"]], 31),
    mkContact(104, 2, "نگار صادقی", [["0919 888 7766", "Mobile"]], 25),
    mkContact(105, 2, "خانه پدربزرگ", [["026 3344 5566", "Home"]], 20),
    mkContact(106, 2, "بابک جهانبخش", [["0912 909 8080", "Mobile"], ["0912 456 7890", "Home"]], 12),
    mkContact(107, 2, "ترانه علیدوستی", [["0936 222 3344", "Mobile"]], 6),
    mkContact(108, 2, "آژانس مسافرتی آفتاب", [["021 9100 2200", "Work"], ["0912 000 1122", "Mobile"]], 2),
    // مخاطبین reza (فقط مشاهده)
    mkContact(201, 3, "امیر تهرانی", [["0912 111 2244", "Mobile"]], 18),
    mkContact(202, 3, "لیلا حاتمی", [["021 8811 2233", "Work"]], 9),
    // چند مخاطب برای admin
    mkContact(301, 1, "پشتیبانی سرور", [["021 2222 3333", "Work"]], 60),
    mkContact(302, 1, "مدیر ساختمان", [["0912 555 6677", "Mobile"]], 15),
  ];

  return { users, contacts, seq: 1000 };
}

/* ---------- خواندن/نوشتن دیتابیس ---------- */

function loadDb(): DbShape {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as DbShape;
  } catch {
    /* داده خراب — دوباره Seed می‌کنیم */
  }
  const db = seed();
  saveDb(db);
  return db;
}

function saveDb(db: DbShape) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

const nextId = (db: DbShape) => ++db.seq;

/* ---------- نگاشت به DTO ---------- */

const toUserDto = (u: DbUser, db: DbShape): UserDto => ({
  id: u.id,
  username: u.username,
  role: u.role,
  isPasswordChanged: u.isPasswordChanged,
  permissions: {
    canCreate: u.canCreate,
    canEdit: u.canEdit,
    canDelete: u.canDelete,
    canViewOnly: u.canViewOnly,
  },
  contactCount: db.contacts.filter((c) => c.ownerId === u.id).length,
  createdAt: u.createdAt,
});

const toContactDto = (c: DbContact): ContactDto => ({
  id: c.id,
  name: c.name,
  createdAt: c.createdAt,
  phones: [...c.phones]
    .sort((a, b) => order(a.phoneType) - order(b.phoneType))
    .map((p) => ({ id: p.id, phoneNumber: p.phoneNumber, phoneType: p.phoneType })),
});

const order = (t: PhoneType) => (t === "Mobile" ? 0 : t === "Home" ? 1 : 2);

/* ---------- گاردها ---------- */

function requireAuth(token: string | null): Claims {
  if (!token) throw new ApiError(401, "ابتدا وارد حساب کاربری خود شوید.");
  return verifyToken(token);
}

function requireAdmin(claims: Claims) {
  if (claims.role !== "Admin") throw new ApiError(403, "این عملیات فقط برای مدیر سیستم مجاز است.");
}

function requirePermission(claims: Claims, perm: "p_c" | "p_e" | "p_d") {
  if (claims.role === "Admin") return;
  if (claims.p_v) throw new ApiError(403, "حساب شما «فقط مشاهده» است و اجازه‌ی این عملیات را ندارید.");
  if (!claims[perm]) throw new ApiError(403, "شما دسترسی لازم برای این عملیات را ندارید.");
}

/* ============================================================
   عملیات‌ها — معادل Endpointهای بک‌اند
   ============================================================ */

export const mockServer = {
  /** POST /api/auth/login */
  async login(username: string, password: string): Promise<LoginResponse> {
    await delay();
    const db = loadDb();
    const user = db.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user || user.passwordHash !== hashPassword(password, user.salt))
      throw new ApiError(401, "نام کاربری یا رمز عبور اشتباه است.");
    return { token: signToken(user), user: toUserDto(user, db) };
  },

  /** اعتبارسنجی توکن ذخیره‌شده هنگام بارگذاری برنامه */
  async restoreSession(token: string): Promise<LoginResponse | null> {
    await delay();
    try {
      const claims = verifyToken(token);
      const db = loadDb();
      const user = db.users.find((u) => u.id === claims.sub);
      if (!user) return null;
      return { token: signToken(user), user: toUserDto(user, db) };
    } catch {
      return null;
    }
  },

  /** POST /api/auth/change-password */
  async changePassword(token: string, currentPassword: string, newPassword: string): Promise<LoginResponse> {
    await delay();
    const claims = requireAuth(token);
    const db = loadDb();
    const user = db.users.find((u) => u.id === claims.sub);
    if (!user) throw new ApiError(401, "کاربر یافت نشد.");
    if (user.passwordHash !== hashPassword(currentPassword, user.salt))
      throw new ApiError(400, "رمز عبور فعلی اشتباه است.");
    if (newPassword.length < 4) throw new ApiError(400, "رمز عبور جدید باید حداقل ۴ کاراکتر باشد.");
    user.salt = digest(`salt-${user.id}-${Date.now()}`);
    user.passwordHash = hashPassword(newPassword, user.salt);
    user.isPasswordChanged = true; // ← فلگ تغییر رمز فعال شد
    saveDb(db);
    return { token: signToken(user), user: toUserDto(user, db) };
  },

  /** PUT /api/auth/profile */
  async updateProfile(token: string, username: string): Promise<LoginResponse> {
    await delay();
    const claims = requireAuth(token);
    const db = loadDb();
    const user = db.users.find((u) => u.id === claims.sub);
    if (!user) throw new ApiError(401, "کاربر یافت نشد.");
    const name = username.trim();
    if (db.users.some((u) => u.id !== user.id && u.username.toLowerCase() === name.toLowerCase()))
      throw new ApiError(400, "این نام کاربری قبلاً استفاده شده است.");
    user.username = name;
    saveDb(db);
    return { token: signToken(user), user: toUserDto(user, db) };
  },

  /** GET /api/users — فقط ادمین */
  async listUsers(token: string): Promise<UserDto[]> {
    await delay();
    const claims = requireAuth(token);
    requireAdmin(claims);
    const db = loadDb();
    return db.users.map((u) => toUserDto(u, db));
  },

  /** GET /api/users/stats — فقط ادمین */
  async getStats(token: string): Promise<StatsDto> {
    await delay();
    const claims = requireAuth(token);
    requireAdmin(claims);
    const db = loadDb();
    const allPhones = db.contacts.flatMap((c) => c.phones);
    return {
      totalUsers: db.users.length,
      totalContacts: db.contacts.length,
      totalPhones: allPhones.length,
      mobileCount: allPhones.filter((p) => p.phoneType === "Mobile").length,
      homeCount: allPhones.filter((p) => p.phoneType === "Home").length,
      workCount: allPhones.filter((p) => p.phoneType === "Work").length,
      users: db.users
        .map((u) => ({
          id: u.id,
          username: u.username,
          role: u.role,
          contactCount: db.contacts.filter((c) => c.ownerId === u.id).length,
          createdAt: u.createdAt,
        }))
        .sort((a, b) => b.contactCount - a.contactCount),
    };
  },

  /** POST /api/users — فقط ادمین */
  async createUser(token: string, req: CreateUserRequest): Promise<UserDto> {
    await delay();
    const claims = requireAuth(token);
    requireAdmin(claims);
    const db = loadDb();
    const name = req.username.trim();
    if (name.length < 3) throw new ApiError(400, "نام کاربری باید حداقل ۳ کاراکتر باشد.");
    if (db.users.some((u) => u.username.toLowerCase() === name.toLowerCase()))
      throw new ApiError(400, "این نام کاربری قبلاً استفاده شده است.");
    if (req.password.length < 4) throw new ApiError(400, "رمز عبور باید حداقل ۴ کاراکتر باشد.");
    const salt = digest(`salt-${Date.now()}-${name}`);
    const user: DbUser = {
      id: nextId(db),
      username: name,
      salt,
      passwordHash: hashPassword(req.password, salt),
      role: req.role,
      isPasswordChanged: true,
      canCreate: req.canCreate && !req.canViewOnly,
      canEdit: req.canEdit && !req.canViewOnly,
      canDelete: req.canDelete && !req.canViewOnly,
      canViewOnly: req.canViewOnly,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    saveDb(db);
    return toUserDto(user, db);
  },

  /** PUT /api/users/{id} — فقط ادمین */
  async updateUser(token: string, id: number, req: UpdateUserRequest): Promise<UserDto> {
    await delay();
    const claims = requireAuth(token);
    requireAdmin(claims);
    const db = loadDb();
    const user = db.users.find((u) => u.id === id);
    if (!user) throw new ApiError(400, "کاربر یافت نشد.");
    if (id === claims.sub && req.role !== "Admin")
      throw new ApiError(400, "شما نمی‌توانید نقش خودتان را از مدیر تغییر دهید.");
    const name = req.username.trim();
    if (db.users.some((u) => u.id !== id && u.username.toLowerCase() === name.toLowerCase()))
      throw new ApiError(400, "این نام کاربری قبلاً استفاده شده است.");
    user.username = name;
    user.role = req.role;
    user.canCreate = req.canCreate && !req.canViewOnly;
    user.canEdit = req.canEdit && !req.canViewOnly;
    user.canDelete = req.canDelete && !req.canViewOnly;
    user.canViewOnly = req.canViewOnly;
    if (req.newPassword) {
      if (req.newPassword.length < 4) throw new ApiError(400, "رمز عبور جدید باید حداقل ۴ کاراکتر باشد.");
      user.salt = digest(`salt-${id}-${Date.now()}`);
      user.passwordHash = hashPassword(req.newPassword, user.salt);
    }
    saveDb(db);
    return toUserDto(user, db);
  },

  /** DELETE /api/users/{id} — فقط ادمین (حذف آبشاری مخاطبین) */
  async deleteUser(token: string, id: number): Promise<void> {
    await delay();
    const claims = requireAuth(token);
    requireAdmin(claims);
    if (id === claims.sub) throw new ApiError(400, "شما نمی‌توانید حساب خودتان را حذف کنید.");
    const db = loadDb();
    db.users = db.users.filter((u) => u.id !== id);
    db.contacts = db.contacts.filter((c) => c.ownerId !== id);
    saveDb(db);
  },

  /** GET /api/contacts?search= — فقط مخاطبین خود کاربر */
  async listContacts(token: string, search?: string): Promise<ContactDto[]> {
    await delay();
    const claims = requireAuth(token);
    const db = loadDb();
    let list = db.contacts.filter((c) => c.ownerId === claims.sub); // ← جداسازی داده
    const term = search?.trim();
    if (term) {
      // جستجوی هم‌زمان در نام و شماره تلفن — مثل LINQ بک‌اند
      list = list.filter(
        (c) => c.name.includes(term) || c.phones.some((p) => p.phoneNumber.replace(/\s/g, "").includes(term.replace(/\s/g, "")))
      );
    }
    return [...list].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).map(toContactDto);
  },

  /** POST /api/contacts — نیازمند CanCreate */
  async createContact(token: string, req: ContactRequest): Promise<ContactDto> {
    await delay();
    const claims = requireAuth(token);
    requirePermission(claims, "p_c");
    const db = loadDb();
    const contact: DbContact = {
      id: nextId(db),
      ownerId: claims.sub,
      name: req.name.trim(),
      createdAt: new Date().toISOString(),
      phones: req.phones.map((p) => ({ id: nextId(db), phoneNumber: p.phoneNumber.trim(), phoneType: p.phoneType })),
    };
    db.contacts.push(contact);
    saveDb(db);
    return toContactDto(contact);
  },

  /** PUT /api/contacts/{id} — نیازمند CanEdit + مالکیت */
  async updateContact(token: string, id: number, req: ContactRequest): Promise<ContactDto> {
    await delay();
    const claims = requireAuth(token);
    requirePermission(claims, "p_e");
    const db = loadDb();
    const contact = db.contacts.find((c) => c.id === id && c.ownerId === claims.sub);
    if (!contact) throw new ApiError(400, "مخاطب یافت نشد یا شما صاحب آن نیستید.");
    contact.name = req.name.trim();
    contact.phones = req.phones.map((p) => ({ id: nextId(db), phoneNumber: p.phoneNumber.trim(), phoneType: p.phoneType }));
    saveDb(db);
    return toContactDto(contact);
  },

  /** DELETE /api/contacts/{id} — نیازمند CanDelete + مالکیت */
  async deleteContact(token: string, id: number): Promise<void> {
    await delay();
    const claims = requireAuth(token);
    requirePermission(claims, "p_d");
    const db = loadDb();
    const contact = db.contacts.find((c) => c.id === id && c.ownerId === claims.sub);
    if (!contact) throw new ApiError(400, "مخاطب یافت نشد یا شما صاحب آن نیستید.");
    db.contacts = db.contacts.filter((c) => c.id !== id);
    saveDb(db);
  },
};
