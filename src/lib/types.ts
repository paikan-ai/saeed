/* ============================================================
   تایپ‌های مشترک فرانت‌اند — مطابق با DTOهای بک‌اند ASP.NET
   ============================================================ */

export type Role = "Admin" | "User";
export type PhoneType = "Mobile" | "Home" | "Work";

export interface Permissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewOnly: boolean;
}

export interface UserDto {
  id: number;
  username: string;
  role: Role;
  isPasswordChanged: boolean;
  permissions: Permissions;
  contactCount: number;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  user: UserDto;
}

export interface PhoneDto {
  id: number;
  phoneNumber: string;
  phoneType: PhoneType;
}

export interface ContactDto {
  id: number;
  name: string;
  createdAt: string;
  phones: PhoneDto[];
}

export interface PhoneRequest {
  phoneNumber: string;
  phoneType: PhoneType;
}

export interface ContactRequest {
  name: string;
  phones: PhoneRequest[];
}

export interface UserStat {
  id: number;
  username: string;
  role: Role;
  contactCount: number;
  createdAt: string;
}

export interface StatsDto {
  totalUsers: number;
  totalContacts: number;
  totalPhones: number;
  mobileCount: number;
  homeCount: number;
  workCount: number;
  users: UserStat[];
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: Role;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewOnly: boolean;
}

export interface UpdateUserRequest {
  username: string;
  newPassword?: string | null;
  role: Role;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewOnly: boolean;
}

/** خطای ساختاریافته‌ی API — message فارسی مستقیماً از سرور می‌آید */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/* ---------- ابزارهای نمایشی مشترک ---------- */

export const PHONE_TYPE_LABEL: Record<PhoneType, string> = {
  Mobile: "موبایل",
  Home: "خانه",
  Work: "محل کار",
};

/** تبدیل میلادی به تاریخ شمسی */
export function faDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long", year: "numeric" }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
}

/** تبدیل ارقام لاتین به فارسی */
export function faNum(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
