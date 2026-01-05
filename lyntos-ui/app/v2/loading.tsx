export default function V2Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin h-8 w-8 border-3 border-slate-300 border-t-blue-600 rounded-full" />
        <p className="text-sm text-slate-600">Dashboard yukleniyor...</p>
      </div>
    </div>
  );
}
