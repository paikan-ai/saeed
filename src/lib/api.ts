/* ============================================================
   لایه‌ی دسترسی به API
   - اگر سرور ASP.NET در دسترس باشد (GET /api/health) → API واقعی
   - در غیر این صورت → سرور شبیه‌سازی‌شده (Mock) با همان قرارداد
   ============================================================ */

import { mockServer } from "./mockServer";
import {
  ApiError,
  ContactDto,
  ContactRequest,
  CreateUserRequest,
  LoginResponse,
  StatsDto,
  UpdateUserRequest,
  UserDto,
} from "./types";

export type ApiMode = "detecting" | "real" | "mock";

const TOKEN_KEY = "phonebook.token.v1";

let mode: ApiMode = "detecting";
export const getMode = () => mode;

/** تشخیص اتصال به سرور واقعی — یک بار هنگام بارگذاری برنامه */
export async function initApi(): Promise<ApiMode> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch("/api/health", { signal: controller.signal });
    clearTimeout(timer);
    mode = res.ok ? "real" : "mock";
  } catch {
    mode = "mock";
  }
  return mode;
}

/* ---------- ذخیره‌ی نشست (توکن + اطلاعات کاربر) ---------- */
export interface Session {
  token: string;
  user: UserDto;
}

export function saveSession(session: Session) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export const clearSession = () => localStorage.removeItem(TOKEN_KEY);
export const readToken = () => loadSession()?.token ?? null;

/* ---------- کلاینت HTTP برای سرور واقعی ---------- */
async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    let message = "خطا در ارتباط با سرور";
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* بدنه‌ی JSON نبود */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/* ============================================================
   API عمومی برنامه — بسته به حالت، به سرور واقعی یا Mock وصل می‌شود
   ============================================================ */
export const api = {
  login(username: string, password: string): Promise<LoginResponse> {
    return mode === "real"
      ? request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) })
      : mockServer.login(username, password);
  },

  restoreSession(session: Session): Promise<LoginResponse | null> {
    // در حالت Mock صحت و انقضای توکن بررسی می‌شود؛ در حالت واقعی، نشست ذخیره‌شده
    // پذیرفته می‌شود و در صورت انقضای توکن، اولین درخواستِ ناموفق نشست را پاک می‌کند.
    return mode === "real" ? Promise.resolve(session) : mockServer.restoreSession(session.token);
  },

  changePassword(token: string, currentPassword: string, newPassword: string): Promise<LoginResponse> {
    return mode === "real"
      ? request<LoginResponse>(
          "/auth/change-password",
          { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) },
          token
        )
      : mockServer.changePassword(token, currentPassword, newPassword);
  },

  updateProfile(token: string, username: string): Promise<LoginResponse> {
    return mode === "real"
      ? request<LoginResponse>("/auth/profile", { method: "PUT", body: JSON.stringify({ username }) }, token)
      : mockServer.updateProfile(token, username);
  },

  listUsers(token: string): Promise<UserDto[]> {
    return mode === "real" ? request<UserDto[]>("/users", {}, token) : mockServer.listUsers(token);
  },

  getStats(token: string): Promise<StatsDto> {
    return mode === "real" ? request<StatsDto>("/users/stats", {}, token) : mockServer.getStats(token);
  },

  createUser(token: string, body: CreateUserRequest): Promise<UserDto> {
    return mode === "real"
      ? request<UserDto>("/users", { method: "POST", body: JSON.stringify(body) }, token)
      : mockServer.createUser(token, body);
  },

  updateUser(token: string, id: number, body: UpdateUserRequest): Promise<UserDto> {
    return mode === "real"
      ? request<UserDto>(`/users/${id}`, { method: "PUT", body: JSON.stringify(body) }, token)
      : mockServer.updateUser(token, id, body);
  },

  deleteUser(token: string, id: number): Promise<void> {
    return mode === "real"
      ? request<void>(`/users/${id}`, { method: "DELETE" }, token)
      : mockServer.deleteUser(token, id);
  },

  listContacts(token: string, search?: string): Promise<ContactDto[]> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return mode === "real" ? request<ContactDto[]>(`/contacts${qs}`, {}, token) : mockServer.listContacts(token, search);
  },

  createContact(token: string, body: ContactRequest): Promise<ContactDto> {
    return mode === "real"
      ? request<ContactDto>("/contacts", { method: "POST", body: JSON.stringify(body) }, token)
      : mockServer.createContact(token, body);
  },

  updateContact(token: string, id: number, body: ContactRequest): Promise<ContactDto> {
    return mode === "real"
      ? request<ContactDto>(`/contacts/${id}`, { method: "PUT", body: JSON.stringify(body) }, token)
      : mockServer.updateContact(token, id, body);
  },

  deleteContact(token: string, id: number): Promise<void> {
    return mode === "real"
      ? request<void>(`/contacts/${id}`, { method: "DELETE" }, token)
      : mockServer.deleteContact(token, id);
  },
};
