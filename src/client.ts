import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

export interface FacturacionClientOptions {
  /**
   * Where the facturación API lives: the master service itself (cookie auth) or
   * the host backend's proxy (e.g. `/api/v1/facturacion`), which adds the internal key.
   */
  baseURL: string;
  /**
   * Called on a 401. Renew the session (against the host ERP, not this service:
   * the service verifies tokens, it does not issue them) and resolve `true` to retry
   * the request once, or `false` to give up. Redirecting to login is the host's call.
   * Concurrent 401s share a single call (single-flight).
   */
  onUnauthorized?: (error: AxiosError) => Promise<boolean>;
}

/** Axios instance for the facturación API. Sends cookies (`withCredentials`). */
export function createFacturacionClient({ baseURL, onUnauthorized }: FacturacionClientOptions): AxiosInstance {
  const client = axios.create({ baseURL, withCredentials: true });
  if (!onUnauthorized) return client;

  let refreshing: Promise<boolean> | null = null;

  client.interceptors.response.use(undefined, async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status !== 401 || !original || original._retry) throw error;

    original._retry = true;
    // Opening a screen fires several requests; they all wait on the same refresh.
    refreshing ??= onUnauthorized(error).finally(() => {
      refreshing = null;
    });
    if (!(await refreshing)) throw error;
    return client(original);
  });
  return client;
}
