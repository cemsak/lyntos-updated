/**
 * Client-side PDF text extraction using pdfjs-dist
 * Replaces pdf-parse for browser compatibility
 */

'use client';

import * as pdfjsLib from 'pdfjs-dist';

// Set worker source (required for pdfjs-dist)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export async function extractTextFromPDF(data: ArrayBuffer): Promise<string> {
  try {
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: unknown) => {
          const textItem = item as { str?: string };
          return textItem.str || '';
        })
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    console.error('PDF text extraction error:', error);
    throw new Error('PDF metni cikarilirken hata olustu');
  }
}
