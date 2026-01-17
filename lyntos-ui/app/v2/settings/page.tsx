'use client';

import React, { useState, useEffect } from 'react';
import { Settings, User, Bell, Shield, Palette, Globe, Loader2, AlertCircle } from 'lucide-react';
import { getAuthToken } from '../_lib/auth';

interface Profile {
  name: string;
  email: string;
  title: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [mevzuatNotifications, setMevzuatNotifications] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/v1/profile', {
          headers: { Authorization: token },
        });

        if (!response.ok) {
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setProfile(data);
      } catch {
        // API baglantisi yok
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ayarlar</h1>
        <p className="text-slate-600 mt-1">
          Hesap ve uygulama ayarlarinizi yonetin
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Profil</h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-slate-600">Yukleniyor...</span>
          </div>
        ) : profile ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ad Soyad
              </label>
              <input
                type="text"
                defaultValue={profile.name}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                E-posta
              </label>
              <input
                type="email"
                defaultValue={profile.email}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Unvan
              </label>
              <input
                type="text"
                defaultValue={profile.title}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
            <p className="text-slate-600 text-center">
              Profil bilgileri yuklenemedi.
            </p>
            <p className="text-slate-400 text-sm text-center mt-1">
              Lutfen oturum acarak tekrar deneyin.
            </p>
          </div>
        )}
      </div>

      {/* Notifications Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Bildirimler</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">E-posta Bildirimleri</p>
              <p className="text-sm text-slate-500">Risk uyarilari ve beyanname hatirlaticlari</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notifications ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                notifications ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">Mevzuat Degisiklikleri</p>
              <p className="text-sm text-slate-500">RegWatch yeni mevzuat bildirimleri</p>
            </div>
            <button
              onClick={() => setMevzuatNotifications(!mevzuatNotifications)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                mevzuatNotifications ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                mevzuatNotifications ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Gorunum</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900">Karanlik Mod</p>
            <p className="text-sm text-slate-500">Koyu tema kullan</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              darkMode ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              darkMode ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Degisiklikleri Kaydet
        </button>
      </div>
    </div>
  );
}
