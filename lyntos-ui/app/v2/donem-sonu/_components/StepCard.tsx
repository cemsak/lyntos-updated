'use client';

/**
 * StepCard - Dönem sonu wizard adım kartı
 */

import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  Play,
  FileSpreadsheet,
  Calculator,
  Shield,
  FileText,
} from 'lucide-react';
import { type StepCardProps } from '../_types';

export function StepCard({
  step,
  index,
  onStepClick,
  onMarkComplete,
  isCompleted,
}: StepCardProps) {
  const statusConfig = {
    completed: {
      bg: 'bg-gradient-to-r from-[#ECFDF5] via-[#ECFDF5] to-[#ECFDF5]',
      border: 'border-[#6BDB83]',
      circle: 'bg-gradient-to-br from-[#00A651] to-[#00A651] text-white shadow-[#AAE8B8] shadow-lg',
      title: 'text-[#005A46]',
      desc: 'text-[#00804D]',
      button: 'bg-[#ECFDF5] text-[#00804D] hover:bg-[#AAE8B8]',
      buttonLabel: 'Görüntüle',
      buttonIcon: <Eye className="w-4 h-4" />,
    },
    current: {
      bg: 'bg-gradient-to-r from-[#E6F9FF] via-[#E6F9FF] to-[#E6F9FF]',
      border: 'border-[#5ED6FF]',
      circle: 'bg-gradient-to-br from-[#0078D0] to-[#0078D0] text-white shadow-[#ABEBFF] shadow-lg animate-pulse',
      title: 'text-[#00287F]',
      desc: 'text-[#0049AA]',
      button: 'bg-[#0049AA] text-white hover:bg-[#0049AA] shadow-sm',
      buttonLabel: 'Başla',
      buttonIcon: <Play className="w-4 h-4" />,
    },
    pending: {
      bg: 'bg-[#F5F6F8]/50',
      border: 'border-[#E5E5E5]',
      circle: 'bg-[#E5E5E5] text-[#969696]',
      title: 'text-[#969696]',
      desc: 'text-[#969696]',
      button: 'bg-[#F5F6F8] text-[#969696] cursor-not-allowed',
      buttonLabel: 'Bekliyor',
      buttonIcon: <Clock className="w-4 h-4" />,
    },
  };

  const cfg = statusConfig[step.status];

  const categoryIcons = {
    veri: <FileSpreadsheet className="w-3.5 h-3.5" />,
    hesaplama: <Calculator className="w-3.5 h-3.5" />,
    vergi: <Shield className="w-3.5 h-3.5" />,
    rapor: <FileText className="w-3.5 h-3.5" />,
  };

  const categoryLabels = {
    veri: 'Veri İşleme',
    hesaplama: 'Hesaplama',
    vergi: 'Vergi',
    rapor: 'Raporlama',
  };

  return (
    <div
      className={`
        relative flex items-start gap-4 p-5 rounded-xl border-2
        transition-all duration-300
        ${cfg.bg} ${cfg.border}
        ${step.status !== 'pending' ? 'hover:shadow-lg hover:-translate-y-0.5' : 'opacity-75'}
        animate-slide-up
      `}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Connection Line (except for last item) */}
      {index < 3 && (
        <div className="absolute left-[2.125rem] top-[4.5rem] bottom-[-1rem] w-0.5 bg-gradient-to-b from-[#B4B4B4] to-transparent" />
      )}

      {/* Step Number Circle */}
      <div
        className={`
        w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
        transition-all duration-300
        ${cfg.circle}
      `}
      >
        {step.status === 'completed' ? (
          <CheckCircle2 className="w-6 h-6" />
        ) : (
          <span className="text-lg font-bold">{step.id}</span>
        )}
      </div>

      {/* Step Content */}
      <div className="flex-1 min-w-0">
        {/* Category Badge */}
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
            ${
              step.status === 'completed'
                ? 'bg-[#ECFDF5] text-[#00804D]'
                : step.status === 'current'
                  ? 'bg-[#E6F9FF] text-[#0049AA]'
                  : 'bg-[#F5F6F8] text-[#969696]'
            }
          `}
          >
            {categoryIcons[step.category]}
            {categoryLabels[step.category]}
          </span>
          <span className="text-xs text-[#969696] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {step.estimatedTime}
          </span>
        </div>

        {/* Title & Icon */}
        <div className="flex items-center gap-2">
          <span className={step.status === 'completed' ? 'text-[#00804D]' : 'text-[#5A5A5A]'}>
            {step.icon}
          </span>
          <h3 className={`text-lg font-semibold ${cfg.title}`}>{step.title}</h3>
        </div>

        {/* Description */}
        <p className={`text-sm mt-1 ${cfg.desc}`}>{step.description}</p>

        {/* Detailed Info - Only for current step */}
        {step.status === 'current' && (
          <div className="mt-3 p-3 bg-white/60 rounded-lg border border-[#E6F9FF]">
            <p className="text-xs text-[#0049AA]">{step.detailedInfo}</p>
          </div>
        )}
      </div>

      {/* Action Area */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        {/* Mark Complete Button (only for current, not completed) */}
        {step.status === 'current' && !isCompleted && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkComplete(step.id);
            }}
            className="text-xs text-[#00804D] hover:text-[#00804D] font-medium flex items-center gap-1 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Tamamla
          </button>
        )}

        {/* Main Action Button */}
        <button
          onClick={() => onStepClick(step)}
          disabled={step.status === 'pending'}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
            transition-all duration-200
            ${cfg.button}
          `}
        >
          {cfg.buttonIcon}
          {cfg.buttonLabel}
          {step.status !== 'pending' && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
