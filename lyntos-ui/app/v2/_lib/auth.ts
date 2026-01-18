/**
 * Central Authentication Helper
 * LYNTOS V2 - Merkezi auth token yönetimi
 *
 * Development mode: DEV_HKOZKAN fallback aktif
 * Production mode: Token yoksa hata fırlatılır
 */

// Development mode check - Next.js environment
const IS_DEV = process.env.NODE_ENV === 'development';
const DEV_TOKEN = 'DEV_HKOZKAN';

export class AuthError extends Error {
  constructor(message: string = 'Oturum bulunamadı. Lütfen giriş yapın.') {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Get auth token from localStorage
 * In development mode, falls back to DEV_HKOZKAN if no token
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    // SSR - use dev token in development
    return IS_DEV ? DEV_TOKEN : null;
  }

  const token = localStorage.getItem('lyntos_token');

  // Development fallback
  if (!token && IS_DEV) {
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
