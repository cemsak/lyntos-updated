'use client';

// ════════════════════════════════════════════════════════════════════════════
// StateWrapper - Unified state machine for all panels
// States: loading | ok | empty | missing | auth | error
// ════════════════════════════════════════════════════════════════════════════

interface StateWrapperProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function StateWrapper({
  loading = false,
  error = null,
  empty = false,
  emptyMessage = 'Veri bulunamadi',
  onRetry,
  children
}: StateWrapperProps) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    );
  }

  // Error state
  if (error) {
    const isAuth = error.includes('401') || error.includes('403');
    const isNotFound = error.includes('404');

    return (
      <div className={`rounded-lg p-4 ${isAuth ? 'bg-amber-50' : isNotFound ? 'bg-gray-50' : 'bg-red-50'}`}>
        <p className={`text-sm font-medium ${isAuth ? 'text-amber-800' : isNotFound ? 'text-gray-600' : 'text-red-800'}`}>
          {isAuth ? 'Oturum sorunu' : isNotFound ? 'Bu donem icin veri bulunamadi' : 'Gecici servis hatasi'}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          {isAuth
            ? 'Lutfen tekrar giris yapin.'
            : isNotFound
              ? 'Henuz belge yuklenmemis olabilir.'
              : 'Verileriniz kaybolmadi. Yenilemeyi deneyin.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Yeniden dene
          </button>
        )}
      </div>
    );
  }

  // Empty state
  if (empty) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  // OK state - render children
  return <>{children}</>;
}

export default StateWrapper;
