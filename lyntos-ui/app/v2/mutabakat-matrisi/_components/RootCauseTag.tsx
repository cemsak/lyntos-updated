'use client';

import React from 'react';
import { Badge } from '../../_components/shared/Badge';
import type { RootCause } from '../_types/crossCheck';
import { ROOT_CAUSE_CONFIG } from '../_types/crossCheck';

interface RootCauseTagProps {
  neden: RootCause;
}

export function RootCauseTag({ neden }: RootCauseTagProps) {
  const config = ROOT_CAUSE_CONFIG[neden];
  return (
    <Badge variant={config.badgeVariant} size="xs" style="soft">
      {config.label}
    </Badge>
  );
}
