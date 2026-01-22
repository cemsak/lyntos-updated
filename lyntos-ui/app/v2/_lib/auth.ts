/**
 * Central Authentication Helper
 * LYNTOS V2 - Merkezi auth token yönetimi
 *
 * Dev bypass: Set NEXT_PUBLIC_DEV_AUTH_BYPASS=1 in .env.local
 * When enabled and no token exists, automatically uses DEV_HKOZKAN
 * Production: Token yoksa hata fırlatılır
 */

// Dev bypass check - explicit env var (NEXT_PUBLIC_ prefix required for client-side access)
const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';
const DEV_TOKEN = 'DEV_HKOZKAN';

export class AuthError extends Error {
  constructor(message: string = 'Oturum bulunamadı. Lütfen giriş yapın.') {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Get auth token from localStorage
 * If NEXT_PUBLIC_DEV_AUTH_BYPASS=1 and no token, falls back to DEV_HKOZKAN
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    // SSR - use dev token if bypass enabled
    return DEV_AUTH_BYPASS ? DEV_TOKEN : null;
  }

  const token = localStorage.getItem('lyntos_token');

  // Dev bypass fallback
  if (!token && DEV_AUTH_BYPASS) {
    return DEV_TOKEN;
  }

  return token;
}

/**
 * Require auth token - throws AuthError if not available
 * Use this for operations that MUST have authentication
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
  return getAuthToken() !== null;
}

/**
 * Set auth token in localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lyntos_token', token);
}

/**
 * Clear auth token from localStorage
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('lyntos_token');
}
