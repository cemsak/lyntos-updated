'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { RISK_LEVELS, type RiskLevel } from '@/lib/ui/design-tokens';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  size = 'md',
  showIcon = true,
  className,
}) => {
  const config = RISK_LEVELS[level];

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full border',
        config.color.bg,
        config.color.border,
        config.color.text,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <span>{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
};

export default RiskBadge;
