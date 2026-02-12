"use client";

/**
 * H-01: V2 Error Boundary
 * Dashboard sayfaları için error handler.
 * Sayfa çökse bile sidebar ve navigation korunur (layout seviyesinde).
 */

import { useRouter } from "next/navigation";

export default function V2Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white border border-red-100 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01"
              />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Sayfa Hatasi</h3>
            <p className="text-sm text-gray-500">Bu sayfa yuklenirken hata olustu</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-700 break-words">
            {error.message || "Bilinmeyen hata"}
          </p>
        </div>

        {error.digest && (
          <p className="text-xs text-gray-400 mb-4 font-mono">
            Ref: {error.digest}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={reset}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Tekrar Dene
          </button>
          <button
            onClick={() => router.push("/v2")}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
