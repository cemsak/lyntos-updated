"use client";

/**
 * H-01: Global Error Boundary
 * Root layout hataları için son savunma hattı.
 * Bu dosya kendi html/body tag'lerini içermeli (Next.js 15 kuralı).
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Beklenmeyen Bir Hata Olustu
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            Uygulama beklenmeyen bir hatayla karsilasti. Lutfen tekrar deneyin.
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400 mb-4 font-mono">
              Hata kodu: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Tekrar Dene
          </button>
        </div>
      </body>
    </html>
  );
}
