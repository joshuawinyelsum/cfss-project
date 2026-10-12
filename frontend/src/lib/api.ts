import axios from "axios";
import { useAuthStore, useAdminAuthStore } from "./store";

/**
 * Base URL of the FastAPI backend.
 *
 * In production this MUST come from NEXT_PUBLIC_API_URL (e.g. the Render URL),
 * because the deployed frontend and backend live on different hosts. The
 * localhost fallback only exists so `next dev` keeps working with no setup.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || 
  (process.env.NODE_ENV === "production" ? "https://cfss-api.onrender.com" : "");

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const headers = config.headers;
    const hasAuth = !!(headers && (headers.Authorization || headers.authorization));
    if (!hasAuth) {
      const url = config.url || "";
      const isAuthSubmission =
        url.includes("/student/login") ||
        url.includes("/admin/login") ||
        url.includes("/register");

      if (!isAuthSubmission) {
        const isAdminRoute = url.includes("/admin") || url.startsWith("admin");
        if (isAdminRoute) {
          const adminToken = useAdminAuthStore.getState().token;
          if (adminToken) {
            config.headers.set("Authorization", `Bearer ${adminToken}`);
          }
        } else {
          const studentToken = useAuthStore.getState().token;
          if (studentToken) {
            config.headers.set("Authorization", `Bearer ${studentToken}`);
          }
        }
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      const url = error.config?.url || "";
      const pathname = window.location.pathname;

      // Do not redirect on active login or registration submissions
      const isAuthSubmission =
        url.includes("/student/login") ||
        url.includes("/admin/login") ||
        url.includes("/register");

      if (!isAuthSubmission) {
        const isAdminSession = url.includes("/admin") || pathname.startsWith("/admin");
        if (isAdminSession) {
          useAdminAuthStore.getState().logout();
          if (pathname !== "/admin/login") {
            window.location.href = `/admin/login?session_expired=1&next=${encodeURIComponent(pathname)}`;
          }
        } else {
          useAuthStore.getState().logout();
          if (pathname !== "/login") {
            window.location.href = `/login?session_expired=1&next=${encodeURIComponent(pathname)}`;
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (err: unknown, fallback: string) => {
  const axiosErr = err as { response?: { data?: { detail?: unknown } }; message?: string; code?: string };
  if (!axiosErr?.response) {
    if (axiosErr?.code === 'ECONNABORTED') return 'Connection timed out. Please try again.';
    if (axiosErr?.message === 'Network Error') return 'Network error: Server unreachable or CORS request blocked.';
    return fallback;
  }
  const detail = axiosErr.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return (detail[0] as { msg?: string })?.msg || fallback;
  return fallback;
};


