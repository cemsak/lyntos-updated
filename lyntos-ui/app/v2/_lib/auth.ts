/**
 * Central Authentication Helper
 * LYNTOS V2 — JWT token yönetimi
 *
 * Token: localStorage + cookie (middleware için)
 * Bearer prefix: getAuthToken() otomatik ekler
 */

export class AuthError extends Error {
  constructor(message: string = 'Oturum bulunamadı. Lütfen giriş yapın.') {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Get auth token from localStorage
 * Returns token with Bearer prefix for API calls
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = localStorage.getItem('lyntos_token');
  if (!token) return null;

  // Bearer prefix ekle (yoksa)
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
}

/**
 * Get raw token without Bearer prefix
 */
export function getRawToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lyntos_token');
}

/**
 * Require auth token — throws AuthError if not available
 */
export function requireAuthToken(): string {
  const token = getAuthToken();
  if (!token) {
    throw new AuthError('Oturum bulunamadı. Lütfen giriş yapın.');
  }
  return token;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getRawToken() !== null;
}

/**
 * Set auth token in localStorage + cookie (for middleware)
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lyntos_token', token);
  // Middleware için cookie'ye de yaz (4 saat TTL)
  document.cookie = `lyntos_token=${token}; path=/; max-age=${60 * 60 * 4}; SameSite=Lax`;
}

/**
 * Clear auth token from localStorage + cookie
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('lyntos_token');
  document.cookie = 'lyntos_token=; path=/; max-age=0';
}
