"use client";

/**
 * H-01: App-level Error Boundary
 * Root layout altındaki tüm sayfalar için error handler.
 */

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 shrink-0 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-600"
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
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Bir Hata Olustu
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              {error.message || "Sayfa yuklenirken beklenmeyen bir hata olustu."}
            </p>
            {error.digest && (
              <p className="text-xs text-gray-400 mb-4 font-mono">
                Ref: {error.digest}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Tekrar Dene
              </button>
              <button
                onClick={() => (window.location.href = "/v2")}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Ana Sayfaya Don
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
