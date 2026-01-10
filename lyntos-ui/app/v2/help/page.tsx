'use client';

import React from 'react';
import { HelpCircle, Book, MessageCircle, Mail, ExternalLink, FileText, Video } from 'lucide-react';

const HELP_TOPICS = [
  {
    title: 'Baslangic Rehberi',
    description: 'LYNTOS\'a ilk adimlar ve temel kullanim',
    icon: Book,
    href: '#',
  },
  {
    title: 'Veri Yukleme',
    description: 'Mizan, e-defter ve diger verileri nasil yuklersiniz',
    icon: FileText,
    href: '#',
  },
  {
    title: 'Risk Analizi',
    description: 'VDK 13 kriter ve risk skorlari hakkinda',
    icon: HelpCircle,
    href: '#',
  },
  {
    title: 'Video Egitimler',
    description: 'Adim adim video anlatimlar',
    icon: Video,
    href: '#',
  },
];

const FAQS = [
  {
    question: 'Mizan nasil yuklenir?',
    answer: 'Veri Yukleme sayfasindan Excel veya CSV formatinda mizan dosyanizi surukleyip birakin.',
  },
  {
    question: 'Risk skoru nasil hesaplaniyor?',
    answer: 'VDK\'nin 13 inceleme kriteri baz alinarak otomatik hesaplanir. Her kriter farkli agirliga sahiptir.',
  },
  {
    question: 'Enflasyon duzeltmesi icin hangi belgeler gerekli?',
    answer: 'Sabit kiymet listesi, stok hareket tablosu ve sermaye detay tablosu gereklidir.',
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Yardim Merkezi</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          LYNTOS hakkinda sorularinizi cevaplayalim
        </p>
      </div>

      {/* Quick Help Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {HELP_TOPICS.map((topic) => (
          <a
            key={topic.title}
            href={topic.href}
            className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <topic.icon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600">
                  {topic.title}
                </h3>
                <p className="text-sm text-slate-500 mt-1">{topic.description}</p>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Sikca Sorulan Sorular
        </h2>
        <div className="space-y-4">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="border-b border-slate-100 dark:border-slate-700 pb-4 last:border-0">
              <h3 className="font-medium text-slate-900 dark:text-white mb-2">{faq.question}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Hala Yardima mi Ihtiyaciniz Var?
        </h2>
        <div className="flex flex-wrap gap-4">
          <a
            href="mailto:destek@lyntos.com"
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 transition-colors"
          >
            <Mail className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">E-posta Gonder</span>
          </a>
          <a
            href="/v2/corporate/chat"
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">Canli Destek</span>
          </a>
          <a
            href="https://docs.lyntos.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">Dokumantasyon</span>
          </a>
        </div>
      </div>
    </div>
  );
}
