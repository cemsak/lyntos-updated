'use client';

// ════════════════════════════════════════════════════════════════════════════
// Badge Component - Status indicators
// ════════════════════════════════════════════════════════════════════════════

export type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral' | 'info';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
};

export function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span className={`
      inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border
      ${variantStyles[variant]}
      ${className}
    `}>
      {children}
    </span>
  );
}

export default Badge;
