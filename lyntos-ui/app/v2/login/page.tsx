'use client';

/**
 * LYNTOS Login Sayfası
 * Email + şifre ile giriş — JWT token alır, localStorage'a kaydeder
 */

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, AlertCircle } from 'lucide-react';
import { setAuthToken } from '../_lib/auth';
import { API_BASE_URL } from '../_lib/config/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Giriş başarısız');
      }

      const data = await res.json();
      setAuthToken(data.access_token);

      // Dashboard'a yönlendir
      router.push('/v2/dashboard-v3');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0049AA] rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#2E2E2E]">LYNTOS</h1>
          <p className="text-[#5A5A5A] mt-1">SMMM/YMM Vergi Risk Platformu</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] p-8">
          <h2 className="text-lg font-semibold text-[#2E2E2E] mb-6">Giriş Yap</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#5A5A5A] mb-1">
                E-posta
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@sirket.com"
                required
                autoComplete="username"
                className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0078D0] focus:border-transparent text-[#2E2E2E] placeholder-[#B4B4B4]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#5A5A5A] mb-1">
                Şifre
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0078D0] focus:border-transparent text-[#2E2E2E] placeholder-[#B4B4B4]"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-[#BF192B] bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 bg-[#0049AA] text-white font-medium rounded-lg hover:bg-[#00287F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#969696] mt-6">
          LYNTOS v2 &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
