export default function V2Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin h-8 w-8 border-3 border-[#B4B4B4] border-t-[#0049AA] rounded-full" />
        <p className="text-sm text-[#5A5A5A]">Dashboard yukleniyor...</p>
      </div>
    </div>
  );
}
