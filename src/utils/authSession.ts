import { queryClient } from "@/lib/queryClient";
import { getBlogRootUrl } from "@/utils/urlUtils";

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  role?: string;
  is_writer?: boolean;
  created_at?: string;
  name?: string;
  avatar?: string;
}

const TOKEN_KEY = "token";
const USER_KEY = "user";
const RETURN_URL_KEY = "returnUrl";
const AUTH_ERROR_KEY = "authError";

/**
 * Gets the current authentication token.
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Gets the currently stored user object.
 */
export function getCurrentUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Establishes a new user session (called after login/register).
 * Clears ALL prior query caches to prevent data leakage between accounts.
 */
export function setAuthSession(token: string, user: SessionUser): void {
  // 1. Wipe all previous query cache in memory immediately
  try {
    queryClient.clear();
    queryClient.removeQueries();
  } catch (err) {
    console.error("Failed to clear query cache on session start", err);
  }

  // 2. Persist fresh session credentials
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.removeItem(AUTH_ERROR_KEY);

  // 3. Dispatch an auth event so active listeners can re-render immediately
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("dev47:auth-change"));
  }
}

/**
 * Updates the current user's profile info in localStorage and broadcasts the update.
 */
export function updateSessionUser(user: Partial<SessionUser>): void {
  const current = getCurrentUser();
  if (!current) return;
  const updated = { ...current, ...user };
  localStorage.setItem(USER_KEY, JSON.stringify(updated));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("dev47:auth-change"));
  }
}

/**
 * Completely terminates the session and purges all in-memory and persistent state.
 */
export function clearAuthSession(options?: { errorMessage?: string }): void {
  // 1. Clear React Query cache completely
  try {
    queryClient.clear();
    queryClient.removeQueries();
  } catch (err) {
    console.error("Failed to clear query cache on session clear", err);
  }

  // 2. Clear storage items
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(RETURN_URL_KEY);

  if (options?.errorMessage) {
    localStorage.setItem(AUTH_ERROR_KEY, options.errorMessage);
  }

  // 3. Dispatch auth change event
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("dev47:auth-change"));
  }
}

/**
 * Initiates logout: wipes session and performs a clean full-page navigation
 * to guarantee complete disposal of in-memory closures and React state.
 */
export function logoutSession(targetUrl?: string): void {
  clearAuthSession();

  const destination = targetUrl || getBlogRootUrl();
  window.location.href = destination;
}
