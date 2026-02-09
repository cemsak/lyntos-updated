'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Award } from 'lucide-react';
import { StepCard, KatsayiHesaplayici } from './index';
import type { EnflasyonStep } from '../_types';

interface GenelBakisTabProps {
  steps: EnflasyonStep[];
  completedSteps: number[];
  getStepStatus: (stepNum: number) => 'completed' | 'current' | 'locked';
  onStepClick: (href: string) => void;
  onMarkComplete: (stepNum: number) => void;
}

export function GenelBakisTab({ steps, completedSteps, getStepStatus, onStepClick, onMarkComplete }: GenelBakisTabProps) {
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step, index) => (
          <StepCard
            key={step.step}
            {...step}
            status={getStepStatus(step.step)}
            onStart={() => onStepClick(step.href)}
            onMarkComplete={() => onMarkComplete(step.step)}
            index={index}
          />
        ))}
      </div>

      {completedSteps.length === steps.length && (
        <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-[#ECFDF5] to-[#ECFDF5] border border-[#AAE8B8] rounded-2xl">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00CB50] to-[#00A651] flex items-center justify-center">
            <Award className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-[#005A46] text-lg">Tebrikler!</h4>
            <p className="text-[#00804D]">Yeniden değerleme işlemleri tamamlandı. Raporlarınızı indirebilirsiniz.</p>
          </div>
          <Link
            href="/v2/reports"
            className="px-6 py-3 bg-gradient-to-r from-[#00A651] to-[#00A651] text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
          >
            Raporlara Git
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <KatsayiHesaplayici />
    </div>
  );
}
