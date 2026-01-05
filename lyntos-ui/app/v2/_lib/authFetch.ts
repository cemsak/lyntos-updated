export interface AuthFetchOptions extends RequestInit {
  timeout?: number;
}

export async function authFetch(url: string, options: AuthFetchOptions = {}): Promise<Response> {
  const { timeout = 12000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('lyntos_token') || 'DEV_HKOZKAN'
      : 'DEV_HKOZKAN';

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function authFetchJson<T>(url: string, options: AuthFetchOptions = {}): Promise<T> {
  const response = await authFetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
