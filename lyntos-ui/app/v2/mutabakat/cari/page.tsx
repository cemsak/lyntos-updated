'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Cari Mutabakat Detay Sayfası
 *
 * IS-5 kapsamında tüm cari mutabakat işlevi /v2/mutabakat sayfasına taşındı.
 * Bu sayfa geriye uyumluluk için yönlendirme yapar.
 */
export default function CariMutabakatRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/v2/mutabakat');
  }, [router]);

  return (
    <div className="p-6 text-center text-[#969696]">
      Cari Mutabakat sayfasına yönlendiriliyorsunuz...
    </div>
  );
}
