/**
 * LYNTOS Centralized API Client
 * ==============================
 * L-02 / M-04 / M-08: Tek noktadan API erisimi
 *
 * Sagladiklari:
 * - Auth header otomatik enjeksiyonu
 * - Tutarli hata yonetimi (throw yerine {data, error} pattern)
 * - Timeout (varsayilan 30sn)
 * - Response envelope normalize (hem {success,data} hem raw JSON)
 * - Retry (varsayilan 0, ozellikle GET icin 1 retry)
 * - AbortController destegi
 *
 * Kullanim:
 *   import { api } from '@/app/v2/_lib/api/client';
 *
 *   const { data, error } = await api.get<MyType>('/api/v2/rules');
 *   const { data, error } = await api.post<MyType>('/api/v2/ingest', formData);
 */

import { getAuthToken } from '../auth';

// ══════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
  ok: boolean;
}

export interface ApiRequestOptions {
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Number of retries on failure (default: 0) */
  retries?: number;
  /** Custom headers (merged with defaults) */
  headers?: Record<string, string>;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Query parameters (appended to URL) */
  params?: Record<string, string | number | boolean | undefined>;
  /** Skip auth header (for public endpoints) */
  skipAuth?: boolean;
  /** Skip JSON parsing (for blob/text responses) */
  rawResponse?: boolean;
}

// ══════════════════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════════════════

const DEFAULT_TIMEOUT = 30_000; // 30 seconds
const RETRY_DELAY = 1_000; // 1 second between retries

// ══════════════════════════════════════════════════════════════════
// Helper: Build URL with query params
// ══════════════════════════════════════════════════════════════════

function buildUrlWithParams(url: string, params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return url;

  const filtered = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null
  );
  if (filtered.length === 0) return url;

  const separator = url.includes('?') ? '&' : '?';
  const qs = filtered
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${url}${separator}${qs}`;
}

// ══════════════════════════════════════════════════════════════════
// Helper: Normalize backend response envelope
// ══════════════════════════════════════════════════════════════════

function normalizeResponse<T>(json: unknown): T {
  // Backend envelope pattern: { success: true, data: {...} }
  if (
    json !== null &&
    typeof json === 'object' &&
    'success' in (json as Record<string, unknown>) &&
    'data' in (json as Record<string, unknown>)
  ) {
    return (json as Record<string, unknown>).data as T;
  }
  // Raw response (no envelope)
  return json as T;
}

// ══════════════════════════════════════════════════════════════════
// Core fetch wrapper
// ══════════════════════════════════════════════════════════════════

async function request<T = unknown>(
  url: string,
  method: string,
  body?: unknown,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = 0,
    headers: customHeaders = {},
    signal: externalSignal,
    params,
    skipAuth = false,
    rawResponse = false,
  } = options;

  const finalUrl = buildUrlWithParams(url, params);

  // Build headers
  const headers: Record<string, string> = { ...customHeaders };

  // Auth header
  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = token;
    }
  }

  // Content-Type (skip for FormData — browser sets multipart boundary)
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Build fetch options
  const fetchBody = body instanceof FormData
    ? body
    : body !== undefined
      ? JSON.stringify(body)
      : undefined;

  let lastError: string | null = null;
  let lastStatus = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Combine external signal with timeout
    const combinedSignal = externalSignal
      ? AbortSignal.any
        ? AbortSignal.any([externalSignal, controller.signal])
        : controller.signal // Fallback for older browsers
      : controller.signal;

    try {
      const response = await fetch(finalUrl, {
        method,
        headers,
        body: fetchBody,
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);
      lastStatus = response.status;

      // Auth error — no retry
      if (response.status === 401 || response.status === 403) {
        return {
          data: null,
          error: response.status === 401
            ? 'Oturum suresi dolmus. Lutfen tekrar giris yapin.'
            : 'Bu isleme yetkiniz bulunmuyor.',
          status: response.status,
          ok: false,
        };
      }

      if (!response.ok) {
        // Try to get error detail from response body
        let detail = `HTTP ${response.status}`;
        try {
          const errJson = await response.json();
          detail = errJson.detail || errJson.message || errJson.error || detail;
        } catch {
          // Response body not JSON
        }
        lastError = detail;

        // Don't retry client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return { data: null, error: detail, status: response.status, ok: false };
        }

        // Retry on server errors (5xx)
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
          continue;
        }

        return { data: null, error: detail, status: response.status, ok: false };
      }

      // Success
      if (rawResponse) {
        return { data: response as unknown as T, error: null, status: response.status, ok: true };
      }

      // Empty response (204)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return { data: null, error: null, status: response.status, ok: true };
      }

      const json = await response.json();
      const data = normalizeResponse<T>(json);
      return { data, error: null, status: response.status, ok: true };

    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof DOMException && err.name === 'AbortError') {
        if (externalSignal?.aborted) {
          return { data: null, error: 'Istek iptal edildi.', status: 0, ok: false };
        }
        lastError = `Istek zaman asimina ugradi (${timeout / 1000}sn)`;
      } else {
        lastError = err instanceof Error ? err.message : 'Beklenmeyen hata';
      }

      lastStatus = 0;

      if (attempt < retries) {
        await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
        continue;
      }
    }
  }

  return { data: null, error: lastError, status: lastStatus, ok: false };
}

// ══════════════════════════════════════════════════════════════════
// Public API
// ══════════════════════════════════════════════════════════════════

export const api = {
  get<T = unknown>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return request<T>(url, 'GET', undefined, options);
  },

  post<T = unknown>(url: string, body?: unknown, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return request<T>(url, 'POST', body, options);
  },

  put<T = unknown>(url: string, body?: unknown, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return request<T>(url, 'PUT', body, options);
  },

  patch<T = unknown>(url: string, body?: unknown, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return request<T>(url, 'PATCH', body, options);
  },

  delete<T = unknown>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return request<T>(url, 'DELETE', undefined, options);
  },
};
