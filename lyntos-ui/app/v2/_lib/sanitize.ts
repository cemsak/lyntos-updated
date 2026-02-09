/**
 * LYNTOS HTML Sanitization Utility
 * XSS saldırılarına karşı koruma sağlar.
 *
 * @see https://github.com/cure53/DOMPurify
 */

import DOMPurify from 'dompurify';

/**
 * HTML içeriğini sanitize eder - XSS güvenliği için.
 * Sadece izin verilen tag ve attribute'ları korur.
 *
 * @param dirty - Sanitize edilecek HTML string
 * @returns Temizlenmiş güvenli HTML string
 *
 * @example
 * sanitizeHtml('<strong>Güvenli</strong><script>alert("XSS")</script>')
 * // Returns: '<strong>Güvenli</strong>'
 */
export function sanitizeHtml(dirty: string): string {
  // Server-side rendering kontrolü
  if (typeof window === 'undefined') {
    // SSR'da basit tag temizleme (DOMPurify DOM gerektirir)
    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'p', 'br', 'span', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['class', 'href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    // Link'leri güvenli yap
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

/**
 * Markdown bold syntax'ını HTML'e çevirir ve sanitize eder.
 * ChatInterface için özel fonksiyon.
 *
 * @param text - **bold** içerebilecek metin
 * @returns Sanitize edilmiş HTML
 */
export function formatChatMessage(text: string): string {
  // Markdown bold → HTML strong
  const withBold = text.replace(
    /\*\*(.*?)\*\*/g,
    '<strong class="text-[#2E2E2E] font-semibold">$1</strong>'
  );

  return sanitizeHtml(withBold);
}
