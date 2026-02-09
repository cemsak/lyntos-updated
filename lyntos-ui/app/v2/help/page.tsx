'use client';

import React from 'react';
import Link from 'next/link';
import { HelpCircle, Book, MessageCircle, Mail, ExternalLink, FileText, Percent } from 'lucide-react';

const HELP_TOPICS = [
  {
    title: 'Başlangıç Rehberi',
    description: 'LYNTOS\'a ilk adımlar ve temel kullanım',
    icon: Book,
    href: '/v2/pratik-bilgiler',
  },
  {
    title: 'Veri Yükleme',
    description: 'Mizan, e-defter ve diğer verileri nasıl yüklersiniz',
    icon: FileText,
    href: '/v2/upload',
  },
  {
    title: 'Risk Analizi',
    description: 'VDK 13 kriter ve risk skorları hakkında',
    icon: HelpCircle,
    href: '/v2/risk',
  },
  {
    title: 'Vergi Oranları',
    description: '2026 güncel vergi oranları ve dilimleri',
    icon: Percent,
    href: '/v2/pratik-bilgiler/oranlar',
  },
];

const FAQS = [
  {
    question: 'Mizan nasıl yüklenir?',
    answer: 'Veri Yükleme sayfasından Excel veya CSV formatında mizan dosyanızı sürükleyip bırakın.',
  },
  {
    question: 'Risk skoru nasıl hesaplanıyor?',
    answer: 'VDK\'nın 13 inceleme kriteri baz alınarak otomatik hesaplanır. Her kriter farklı ağırlığa sahiptir.',
  },
  {
    question: 'Enflasyon düzeltmesi için hangi belgeler gerekli?',
    answer: 'Sabit kıymet listesi, stok hareket tablosu ve sermaye detay tablosu gereklidir.',
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#2E2E2E]">Yardım Merkezi</h1>
        <p className="text-[#5A5A5A] mt-1">
          LYNTOS hakkında sorularınızı cevaplayalım
        </p>
      </div>

      {/* Quick Help Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {HELP_TOPICS.map((topic) => (
          <Link
            key={topic.title}
            href={topic.href}
            className="group bg-white rounded-xl border border-[#E5E5E5] p-5 hover:border-[#5ED6FF] hover:shadow-lg transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#E6F9FF] flex items-center justify-center">
                <topic.icon className="w-5 h-5 text-[#0049AA]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#2E2E2E] group-hover:text-[#0049AA]">
                  {topic.title}
                </h3>
                <p className="text-sm text-[#969696] mt-1">{topic.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
        <h2 className="text-lg font-semibold text-[#2E2E2E] mb-4">
          Sıkça Sorulan Sorular
        </h2>
        <div className="space-y-4">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="border-b border-[#E5E5E5] pb-4 last:border-0">
              <h3 className="font-medium text-[#2E2E2E] mb-2">{faq.question}</h3>
              <p className="text-sm text-[#5A5A5A]">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-[#E6F9FF] rounded-xl border border-[#ABEBFF] p-6">
        <h2 className="text-lg font-semibold text-[#2E2E2E] mb-4">
          Hâlâ Yardıma mı İhtiyacınız Var?
        </h2>
        <div className="flex flex-wrap gap-4">
          <a
            href="mailto:destek@lyntos.com"
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-[#E5E5E5] hover:border-[#5ED6FF] transition-colors"
          >
            <Mail className="w-4 h-4 text-[#0049AA]" />
            <span className="text-sm font-medium">E-posta Gönder</span>
          </a>
          <Link
            href="/v2/settings"
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-[#E5E5E5] hover:border-[#5ED6FF] transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-[#0049AA]" />
            <span className="text-sm font-medium">Ayarlar</span>
          </Link>
          <Link
            href="/v2/pratik-bilgiler"
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-[#E5E5E5] hover:border-[#5ED6FF] transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-[#0049AA]" />
            <span className="text-sm font-medium">Pratik Bilgiler</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
