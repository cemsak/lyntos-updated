'use client';

/**
 * Checklist - Dönem sonu kontrol listesi
 */

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { type ChecklistProps } from '../_types';

export function Checklist({ items, effectiveCompletedSteps }: ChecklistProps) {
  return (
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 shadow-sm animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-[#00A651] to-[#00A651] rounded-xl flex items-center justify-center text-white">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#2E2E2E]">Kontrol Listesi</h2>
            <p className="text-sm text-[#969696]">
              {items.filter((item) => effectiveCompletedSteps.includes(item.stepId)).length}
              /{items.length} tamamlandı
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          {items.map((item) => {
            const isComplete = effectiveCompletedSteps.includes(item.stepId);
            return (
              <div
                key={item.id}
                className={`
                  flex items-center gap-3 p-3 rounded-xl transition-all duration-200
                  ${
                    isComplete
                      ? 'bg-[#ECFDF5] border border-[#AAE8B8]'
                      : 'bg-[#F5F6F8] border border-transparent hover:border-[#E5E5E5]'
                  }
                `}
              >
                <div
                  className={`
                  w-6 h-6 rounded-full flex items-center justify-center transition-colors
                  ${isComplete ? 'bg-[#00A651] text-white' : 'bg-[#E5E5E5] text-[#969696]'}
                `}
                >
                  {isComplete ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                </div>
                <span
                  className={`
                  flex-1 text-sm transition-colors
                  ${isComplete ? 'text-[#00804D]' : 'text-[#5A5A5A]'}
                `}
                >
                  {item.text}
                </span>
                <span className={isComplete ? 'text-[#00A651]' : 'text-[#B4B4B4]'}>
                  {item.icon}
                </span>
              </div>
            );
          })}
        </div>
      </div>
  );
}
