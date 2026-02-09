'use client';

import { CheckCircle2, Lock, CircleDot, Play, ArrowRight } from 'lucide-react';

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  status: 'completed' | 'current' | 'locked';
  detailedSteps?: string[];
  onStart: () => void;
  onMarkComplete: () => void;
  index: number;
}

export function StepCard({
  step,
  title,
  description,
  icon: Icon,
  status,
  detailedSteps,
  onStart,
  onMarkComplete,
  index,
}: StepCardProps) {
  const statusConfig = {
    completed: {
      bg: 'from-[#00A651]/10 to-[#00A651]/5',
      border: 'border-[#6BDB83]',
      iconBg: 'bg-gradient-to-br from-[#00CB50] to-[#00A651]',
      badge: 'bg-[#ECFDF5] text-[#00804D]',
      badgeText: 'Tamamlandı',
    },
    current: {
      bg: 'from-[#0078D0]/10 to-[#0078D0]/5',
      border: 'border-[#5ED6FF]',
      iconBg: 'bg-gradient-to-br from-[#0078D0] to-[#0078D0]',
      badge: 'bg-[#E6F9FF] text-[#0049AA]',
      badgeText: 'Aktif',
    },
    locked: {
      bg: 'from-[#969696]/5 to-[#969696]/5',
      border: 'border-[#E5E5E5]',
      iconBg: 'bg-[#B4B4B4]',
      badge: 'bg-[#F5F6F8] text-[#969696]',
      badgeText: 'Kilitli',
    },
  };

  const cfg = statusConfig[status];

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border bg-gradient-to-br backdrop-blur-sm
        ${cfg.bg} ${cfg.border}
        transition-all duration-500 animate-slide-up
        ${status !== 'locked' ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer' : 'opacity-60'}
      `}
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={() => status !== 'locked' && onStart()}
    >
      {/* Step Number */}
      <div className="absolute top-4 right-4">
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
          ${status === 'completed' ? 'bg-[#00A651] text-white' :
            status === 'current' ? 'bg-[#0078D0] text-white' :
            'bg-[#E5E5E5] text-[#969696]'}
        `}>
          {status === 'completed' ? '✓' : step}
        </div>
      </div>

      <div className="p-6">
        {/* Icon & Status */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-14 h-14 rounded-xl ${cfg.iconBg} flex items-center justify-center shadow-lg`}>
            {status === 'completed' ? (
              <CheckCircle2 className="w-7 h-7 text-white" />
            ) : status === 'locked' ? (
              <Lock className="w-7 h-7 text-white/70" />
            ) : (
              <Icon className="w-7 h-7 text-white" />
            )}
          </div>
          <div className="flex-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>
              {cfg.badgeText}
            </span>
            <h3 className="font-bold text-[#2E2E2E] text-lg mt-1">{title}</h3>
            <p className="text-sm text-[#969696]">{description}</p>
          </div>
        </div>

        {/* Detailed Steps */}
        {detailedSteps && (
          <div className="mt-4 space-y-2">
            {detailedSteps.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-[#5A5A5A]">
                <CircleDot className="w-3 h-3 text-[#969696] flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {status === 'current' && (
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-[#E5E5E5]/50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
              className="flex-1 py-2.5 bg-gradient-to-r from-[#0078D0] to-[#0078D0] text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Başla
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkComplete();
              }}
              className="py-2.5 px-4 border border-[#6BDB83] text-[#00804D] rounded-xl font-medium hover:bg-[#ECFDF5] transition-all"
            >
              Tamamla
            </button>
          </div>
        )}

        {status === 'completed' && (
          <div className="mt-6 pt-4 border-t border-[#AAE8B8]/50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#00804D] hover:text-[#00804D] transition-colors"
            >
              Görüntüle
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
