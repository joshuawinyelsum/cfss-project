import axios from "axios";

const isBrowser = typeof window !== "undefined";
const apiHost = isBrowser ? window.location.hostname : "127.0.0.1";

export const api = axios.create({
  baseURL: `http://${apiHost}:8000`, 
  withCredentials: true,
});

export const getErrorMessage = (err: any, fallback: string) => {
  const detail = err.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail[0]?.msg || fallback;
  return fallback;
};
