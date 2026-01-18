/**
 * Client-side PDF text extraction using pdfjs-dist
 * Uses dynamic import to prevent SSR issues
 */

import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

// Lazy-loaded pdfjs instance
let pdfjs: typeof import('pdfjs-dist') | null = null;

/**
 * Dynamically loads pdfjs-dist only on client side
 */
async function getPdfjs() {
  if (pdfjs) return pdfjs;

  if (typeof window === 'undefined') {
    throw new Error('PDF parsing is only available on client side');
  }

  pdfjs = await import('pdfjs-dist');

  // Set worker source using CDN for pdfjs v5.x
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

  return pdfjs;
}

/**
 * Extract text from a PDF file
 */
export async function extractTextFromPDF(data: ArrayBuffer): Promise<string> {
  const pdfjsLib = await getPdfjs();

  const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data }).promise;
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page: PDFPageProxy = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: unknown) => {
        const textItem = item as { str?: string };
        return textItem.str || '';
      })
      .join(' ');
    textParts.push(pageText);
  }

  return textParts.join('\n');
}

/**
 * Extract text from specific pages
 */
export async function extractTextFromPages(
  data: ArrayBuffer,
  pageNumbers: number[]
): Promise<Map<number, string>> {
  const pdfjsLib = await getPdfjs();

  const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data }).promise;
  const result = new Map<number, string>();

  for (const pageNum of pageNumbers) {
    if (pageNum < 1 || pageNum > pdf.numPages) continue;

    const page: PDFPageProxy = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: unknown) => {
        const textItem = item as { str?: string };
        return textItem.str || '';
      })
      .join(' ');
    result.set(pageNum, pageText);
  }

  return result;
}

/**
 * Get PDF metadata
 */
export async function getPDFMetadata(data: ArrayBuffer): Promise<{
  numPages: number;
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
}> {
  const pdfjsLib = await getPdfjs();

  const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data }).promise;
  const metadata = await pdf.getMetadata();

  return {
    numPages: pdf.numPages,
    title: (metadata.info as Record<string, unknown>)?.Title as string | undefined,
    author: (metadata.info as Record<string, unknown>)?.Author as string | undefined,
    subject: (metadata.info as Record<string, unknown>)?.Subject as string | undefined,
    creator: (metadata.info as Record<string, unknown>)?.Creator as string | undefined,
  };
}

/**
 * Check if PDF parsing is available (client-side only)
 */
export function isPDFParsingAvailable(): boolean {
  return typeof window !== 'undefined';
}
