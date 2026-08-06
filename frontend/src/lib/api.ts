import axios from "axios";

const isBrowser = typeof window !== "undefined";

/**
 * Base URL of the FastAPI backend.
 *
 * In production this MUST come from NEXT_PUBLIC_API_URL (e.g. the Render URL),
 * because the deployed frontend and backend live on different hosts. The
 * localhost fallback only exists so `next dev` keeps working with no setup.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  `http://${isBrowser ? window.location.hostname : "127.0.0.1"}:8000`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const getErrorMessage = (err: any, fallback: string) => {
  const detail = err.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail[0]?.msg || fallback;
  return fallback;
};
