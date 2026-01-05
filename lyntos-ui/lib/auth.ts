// ════════════════════════════════════════════════════════════════════════════
// LYNTOS - Merkezi Auth Provider
// FormData + JSON destekli, guvenli response parsing
// ════════════════════════════════════════════════════════════════════════════

export function getAuthHeaders(smmm: string): HeadersInit {
  return { 'Authorization': 'DEV_' + smmm };
}

export function getAuthToken(smmm: string): string {
  return 'DEV_' + smmm;
}

export async function authFetch<T = unknown>(
  url: string,
  smmm: string,
  options: RequestInit = {}
): Promise<T> {
  // Header merge - caller headers korunur
  const headers = new Headers(options.headers);
  headers.set('Authorization', 'DEV_' + smmm);
  
  let body = options.body;
  
  // FormData ise Content-Type EKLEME (browser boundary ayarlar)
  // JSON object ise stringify et ve Content-Type ekle
  if (body !== undefined && body !== null) {
    const isFormData = body instanceof FormData;
    const isURLSearchParams = body instanceof URLSearchParams;
    const isBlob = body instanceof Blob;
    const isString = typeof body === 'string';
    
    if (!isFormData && !isURLSearchParams && !isBlob && !isString && typeof body === 'object') {
      body = JSON.stringify(body);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }
  }

  const response = await fetch(url, { ...options, headers, body });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new AuthFetchError(response.status, errorText);
  }

  // Bos response (204 No Content veya empty body)
  if (response.status === 204) {
    return null as T;
  }
  
  const text = await response.text();
  if (!text || text.trim() === '') {
    return null as T;
  }
  
  // JSON parse dene, basarisiz olursa text don
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export class AuthFetchError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message || 'HTTP ' + status);
    this.name = 'AuthFetchError';
    this.status = status;
  }

  isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  isNotFound(): boolean {
    return this.status === 404;
  }

  isServerError(): boolean {
    return this.status >= 500;
  }

  getUserMessage(): string {
    if (this.isAuthError()) return 'Oturum suresi dolmus. Lutfen yeniden giris yapin.';
    if (this.isNotFound()) return 'Bu donem icin veri bulunamadi.';
    if (this.isServerError()) return 'Gecici sorun olustu. Verileriniz guvendedir.';
    return 'Beklenmeyen hata olustu.';
  }
}
