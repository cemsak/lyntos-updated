import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  headerAction?: React.ReactNode;
  className?: string;
  accent?: boolean; // Left accent bar
  noPadding?: boolean; // Remove content padding
}

export function Card({
  children,
  title,
  subtitle,
  headerAction,
  className = '',
  accent = false,
  noPadding = false,
}: CardProps) {
  return (
    <div
      className={`
        relative bg-lyntos-bg-card border border-lyntos-border rounded-xl overflow-hidden
        ${accent ? 'pl-1' : ''}
        ${className}
      `}
    >
      {/* Accent Bar */}
      {accent && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-lyntos-accent" />
      )}

      {/* Header */}
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-lyntos-border">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-lyntos-text-primary">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-lyntos-text-muted mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      {/* Content */}
      <div className={noPadding ? '' : 'p-4'}>{children}</div>
    </div>
  );
}
