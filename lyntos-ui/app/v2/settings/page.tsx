'use client';

import React, { useState, useEffect } from 'react';
import { Settings, User, Bell, Shield, Palette, Globe, Loader2, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { api } from '../_lib/api/client';
import { API_ENDPOINTS } from '../_lib/config/api';
import { useToast } from '../_components/shared/Toast';

interface Profile {
  name: string;
  email: string;
  title: string;
}

interface SettingsState {
  notifications: boolean;
  darkMode: boolean;
  mevzuatNotifications: boolean;
}

const SETTINGS_KEY = 'lyntos_settings';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [mevzuatNotifications, setMevzuatNotifications] = useState(true);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileTitle, setProfileTitle] = useState('');

  // Load saved settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed: SettingsState = JSON.parse(savedSettings);
        setNotifications(parsed.notifications ?? true);
        setDarkMode(parsed.darkMode ?? false);
        setMevzuatNotifications(parsed.mevzuatNotifications ?? true);
      } catch {
        // Invalid saved settings
      }
    }
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data, ok } = await api.get<Profile>(API_ENDPOINTS.user.profile);

        if (!ok || !data) {
          // Use default profile
          setProfile({
            name: 'SMMM Kullanıcı',
            email: 'smmm@example.com',
            title: 'Serbest Muhasebeci Mali Müşavir'
          });
          setProfileName('SMMM Kullanıcı');
          setProfileEmail('smmm@example.com');
          setProfileTitle('Serbest Muhasebeci Mali Müşavir');
          setIsLoading(false);
          return;
        }

        setProfile(data);
        setProfileName(data.name || '');
        setProfileEmail(data.email || '');
        setProfileTitle(data.title || '');
      } catch {
        // Use default profile
        setProfile({
          name: 'SMMM Kullanıcı',
          email: 'smmm@example.com',
          title: 'Serbest Muhasebeci Mali Müşavir'
        });
        setProfileName('SMMM Kullanıcı');
        setProfileEmail('smmm@example.com');
        setProfileTitle('Serbest Muhasebeci Mali Müşavir');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    // Save settings to localStorage
    const settings: SettingsState = {
      notifications,
      darkMode,
      mevzuatNotifications
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    // Save profile via API
    try {
      const { ok } = await api.put(API_ENDPOINTS.user.profile, {
        name: profileName,
        email: profileEmail,
        title: profileTitle,
        settings,
      });

      if (!ok) {
        throw new Error('API error');
      }

      setSaveSuccess(true);
      showToast('success', 'Ayarlar kaydedildi');
    } catch {
      // API failed - save to localStorage as fallback
      const profileData = {
        name: profileName,
        email: profileEmail,
        title: profileTitle
      };
      localStorage.setItem('lyntos_profile', JSON.stringify(profileData));
      setSaveSuccess(true);
      showToast('warning', 'Sunucu bağlantısı kurulamadı, ayarlar yerel olarak kaydedildi');
    }

    setIsSaving(false);

    // Hide success message after 3 seconds
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[#2E2E2E]">Ayarlar</h1>
        <p className="text-[#5A5A5A] mt-1">
          Hesap ve uygulama ayarlarinizi yonetin
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-[#5A5A5A]" />
          <h2 className="text-lg font-semibold text-[#2E2E2E]">Profil</h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#0049AA]" />
            <span className="ml-2 text-[#5A5A5A]">Yukleniyor...</span>
          </div>
        ) : profile ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
                Ad Soyad
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-4 py-2 bg-[#F5F6F8] border border-[#E5E5E5] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
                E-posta
              </label>
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full px-4 py-2 bg-[#F5F6F8] border border-[#E5E5E5] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
                Unvan
              </label>
              <input
                type="text"
                value={profileTitle}
                onChange={(e) => setProfileTitle(e.target.value)}
                className="w-full px-4 py-2 bg-[#F5F6F8] border border-[#E5E5E5] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="w-12 h-12 text-[#FFCE19] mb-3" />
            <p className="text-[#5A5A5A] text-center">
              Profil bilgileri yuklenemedi.
            </p>
            <p className="text-[#969696] text-sm text-center mt-1">
              Lutfen oturum acarak tekrar deneyin.
            </p>
          </div>
        )}
      </div>

      {/* Notifications Section */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-[#5A5A5A]" />
          <h2 className="text-lg font-semibold text-[#2E2E2E]">Bildirimler</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[#2E2E2E]">E-posta Bildirimleri</p>
              <p className="text-sm text-[#969696]">Risk uyarilari ve beyanname hatirlaticlari</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notifications ? 'bg-[#0049AA]' : 'bg-[#B4B4B4]'
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                notifications ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[#2E2E2E]">Mevzuat Degisiklikleri</p>
              <p className="text-sm text-[#969696]">RegWatch yeni mevzuat bildirimleri</p>
            </div>
            <button
              onClick={() => setMevzuatNotifications(!mevzuatNotifications)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                mevzuatNotifications ? 'bg-[#0049AA]' : 'bg-[#B4B4B4]'
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
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-5 h-5 text-[#5A5A5A]" />
          <h2 className="text-lg font-semibold text-[#2E2E2E]">Gorunum</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-[#2E2E2E]">Karanlik Mod</p>
            <p className="text-sm text-[#969696]">Koyu tema kullan</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              darkMode ? 'bg-[#0049AA]' : 'bg-[#B4B4B4]'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              darkMode ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4">
        {saveSuccess && (
          <div className="flex items-center gap-2 text-[#00804D]">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Ayarlar kaydedildi!</span>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] transition-colors disabled:bg-[#00B4EB] disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Degisiklikleri Kaydet
            </>
          )}
        </button>
      </div>
    </div>
  );
}
