/**
 * Helix — Axios API Client
 * Centralized HTTP client with auth token injection, refresh logic, and error handling.
 */

import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
    total_pages?: number;
    has_next?: boolean;
    has_prev?: boolean;
  };
  errors?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  request_id: string;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
  requestId?: string;
}

// ─────────────────────────────────────────────
// Token Storage (in-memory for security)
// Refresh token stored in HttpOnly cookie by server
// ─────────────────────────────────────────────

let _accessToken: string | null = null;

export const tokenStore = {
  get: () => _accessToken,
  set: (token: string) => {
    _accessToken = token;
  },
  clear: () => {
    _accessToken = null;
  },
};

// ─────────────────────────────────────────────
// Axios Instance
// ─────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true, // For HttpOnly cookie refresh tokens
});

// ─────────────────────────────────────────────
// Request Interceptor — Inject Access Token
// ─────────────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStore.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add request ID for tracing
    config.headers["X-Request-ID"] = crypto.randomUUID();
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────
// Response Interceptor — Refresh Token on 401
// ─────────────────────────────────────────────

let _refreshPromise: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Deduplicate concurrent refresh calls
        if (!_refreshPromise) {
          _refreshPromise = refreshAccessToken().finally(() => {
            _refreshPromise = null;
          });
        }
        const newToken = await _refreshPromise;
        tokenStore.set(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        tokenStore.clear();
        // Redirect to login
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(normalizeError(error));
  }
);

async function refreshAccessToken(): Promise<string> {
  const { useAuthStore } = await import("@/store/auth.store");

  const response = await axios.post<ApiResponse<{ access_token: string; token_type: string; expires_in: number }>>(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/refresh`,
    {},
    { withCredentials: true }
  );

  const data = response.data.data;
  
  // Update the user session with the new access token
  useAuthStore.getState().setUser(
    useAuthStore.getState().user!,
    data.access_token,
  );

  return data.access_token;
}

function normalizeError(error: AxiosError<ApiResponse>): ApiError {
  if (error.response) {
    const data = error.response.data;
    return {
      code: data?.errors?.code || "API_ERROR",
      message: data?.errors?.message || error.message,
      status: error.response.status,
      details: data?.errors?.details,
      requestId: data?.request_id,
    };
  }
  if (error.request) {
    return {
      code: "NETWORK_ERROR",
      message: "Unable to reach the server. Check your connection.",
      status: 0,
    };
  }
  return {
    code: "UNKNOWN_ERROR",
    message: error.message,
    status: 0,
  };
}

// ─────────────────────────────────────────────
// Typed request helpers
// ─────────────────────────────────────────────

export const api = {
  get: <T>(url: string, config?: object) =>
    apiClient.get<ApiResponse<T>>(url, config).then((r) => r.data),

  post: <T>(url: string, data?: unknown, config?: object) =>
    apiClient.post<ApiResponse<T>>(url, data, config).then((r) => r.data),

  put: <T>(url: string, data?: unknown, config?: object) =>
    apiClient.put<ApiResponse<T>>(url, data, config).then((r) => r.data),

  patch: <T>(url: string, data?: unknown, config?: object) =>
    apiClient.patch<ApiResponse<T>>(url, data, config).then((r) => r.data),

  delete: <T>(url: string, config?: object) =>
    apiClient.delete<ApiResponse<T>>(url, config).then((r) => r.data),
};
