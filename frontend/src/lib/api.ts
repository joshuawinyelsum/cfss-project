import axios from "axios";

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

export const getErrorMessage = (err: unknown, fallback: string) => {
  const axiosErr = err as { response?: { data?: { detail?: unknown } } };
  const detail = axiosErr.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return (detail[0] as { msg?: string })?.msg || fallback;
  return fallback;
};
