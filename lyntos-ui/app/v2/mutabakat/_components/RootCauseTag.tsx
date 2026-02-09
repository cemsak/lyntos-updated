'use client';
import React from 'react';
import {
  CheckCircle2,
  FileX,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { Badge } from '../../_components/shared/Badge';
import type { RootCause } from '../_types/cariMutabakat';
import { ROOT_CAUSE_CONFIG } from '../_types/cariMutabakat';

const ICON_MAP: Record<string, React.ReactNode> = {
  CheckCircle2: <CheckCircle2 className="w-3 h-3" />,
  FileX: <FileX className="w-3 h-3" />,
  AlertTriangle: <AlertTriangle className="w-3 h-3" />,
  Clock: <Clock className="w-3 h-3" />,
  ArrowUpDown: <ArrowUpDown className="w-3 h-3" />,
  ShieldAlert: <ShieldAlert className="w-3 h-3" />,
  HelpCircle: <HelpCircle className="w-3 h-3" />,
};

interface RootCauseTagProps {
  neden: RootCause;
  /** Tooltip açıklama göster */
  showTooltip?: boolean;
}

/**
 * Root cause nedenini badge olarak gösteren bileşen.
 */
export function RootCauseTag({ neden, showTooltip = false }: RootCauseTagProps) {
  const config = ROOT_CAUSE_CONFIG[neden];

  return (
    <span title={showTooltip ? config.uzunAciklama : undefined}>
      <Badge
        variant={config.badgeVariant}
        size="sm"
        style="soft"
        icon={ICON_MAP[config.icon]}
      >
        {config.kisaEtiket}
      </Badge>
    </span>
  );
}
