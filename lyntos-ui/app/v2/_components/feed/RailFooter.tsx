'use client';

import React, { useCallback } from 'react';
import { Copy, Check, CheckCircle, Clock } from 'lucide-react';
import { type FeedItem } from './types';

interface RailFooterProps {
  item: FeedItem;
  onResolve: (id: string) => void;
  onSnooze: (id: string, until: Date) => void;
  onClose: () => void;
}

export function RailFooter({ item, onResolve, onSnooze, onClose }: RailFooterProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = useCallback(() => {
    const summary = `[${item.category}] ${item.title}\n${item.summary}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [item]);

  const handleResolve = useCallback(() => {
    onResolve(item.id);
    onClose();
  }, [item.id, onResolve, onClose]);

  const handleSnooze = useCallback(
    (days: number) => {
      const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      onSnooze(item.id, until);
      onClose();
    },
    [item.id, onSnooze, onClose]
  );

  return (
    <div className="flex-shrink-0 border-t border-[#E5E5E5] p-4 space-y-3">
      {/* Resolve Button */}
      <button
        onClick={handleResolve}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#00804D] text-white rounded-lg hover:bg-[#00804D] transition-colors text-sm font-medium"
      >
        <CheckCircle className="w-4 h-4" />
        Çözüldü
      </button>

      {/* Snooze Options - 1g/7g/30g */}
      {item.snoozeable && (
        <div className="flex gap-2">
          <button
            onClick={() => handleSnooze(1)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FFFBEB] text-[#FA841E] rounded-lg hover:bg-[#FFF08C] transition-colors text-xs font-medium"
          >
            <Clock className="w-3.5 h-3.5" />
            1 Gün
          </button>
          <button
            onClick={() => handleSnooze(7)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FFFBEB] text-[#FA841E] rounded-lg hover:bg-[#FFF08C] transition-colors text-xs font-medium"
          >
            <Clock className="w-3.5 h-3.5" />
            7 Gün
          </button>
          <button
            onClick={() => handleSnooze(30)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FFFBEB] text-[#FA841E] rounded-lg hover:bg-[#FFF08C] transition-colors text-xs font-medium"
          >
            <Clock className="w-3.5 h-3.5" />
            30 Gün
          </button>
        </div>
      )}

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#F5F6F8] text-[#5A5A5A] rounded-lg hover:bg-[#E5E5E5] transition-colors text-sm font-medium"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-[#00804D]" />
            Kopyalandı
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Özeti Kopyala
          </>
        )}
      </button>
    </div>
  );
}
