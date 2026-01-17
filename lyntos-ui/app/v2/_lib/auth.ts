/**
 * Central Authentication Helper
 * LYNTOS V2 - Merkezi auth token yönetimi
 *
 * DEV_HKOZKAN fallback'ler kaldırıldı - Token yoksa hata fırlat
 */

export class AuthError extends Error {
  constructor(message: string = 'Oturum bulunamadı. Lütfen giriş yapın.') {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Get auth token from localStorage
 * Returns null if not available (SSR or no token)
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lyntos_token');
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
