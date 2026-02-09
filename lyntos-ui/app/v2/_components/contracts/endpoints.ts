/**
 * @deprecated Bu dosya eski uyumluluk için korunuyor.
 * Yeni kod için _lib/config/api.ts kullanın.
 *
 * Tüm endpoint'ler artık merkezi api.ts dosyasından geliyor.
 */

// Re-export everything from central api config
export {
  API_BASE_URL,
  ENDPOINTS,
  ENDPOINTS_V2,
  buildScopedUrl,
  type ScopeParams,
} from '../../_lib/config/api';

// Legacy aliases for backwards compatibility
export { API_BASE_URL as API_V2_BASE } from '../../_lib/config/api';
export const API_BASE = '/api/v1';
