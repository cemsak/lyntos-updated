'use client';

import React, { useState } from 'react';
import { Settings, User, Bell, Shield, Palette, Globe } from 'lucide-react';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ayarlar</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Hesap ve uygulama ayarlarinizi yonetin
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Profil</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Ad Soyad
            </label>
            <input
              type="text"
              defaultValue="Hasan Kozkan"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              E-posta
            </label>
            <input
              type="email"
              defaultValue="hkozkan@example.com"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Unvan
            </label>
            <input
              type="text"
              defaultValue="Serbest Muhasebeci Mali Musavir"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Bildirimler</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">E-posta Bildirimleri</p>
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
              <p className="font-medium text-slate-900 dark:text-white">Mevzuat Degisiklikleri</p>
              <p className="text-sm text-slate-500">RegWatch yeni mevzuat bildirimleri</p>
            </div>
            <button className="relative w-12 h-6 rounded-full bg-blue-600">
              <span className="absolute top-1 left-7 w-4 h-4 bg-white rounded-full" />
            </button>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Gorunum</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Karanlik Mod</p>
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
