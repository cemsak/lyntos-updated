'use client';

import Link from 'next/link';

// ════════════════════════════════════════════════════════════════════════════
// Button Component - Consistent button styling
// ════════════════════════════════════════════════════════════════════════════

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  variant?: ButtonVariant;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  secondary: 'bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 disabled:text-gray-400',
};

export function Button({
  variant = 'primary',
  href,
  onClick,
  disabled = false,
  loading = false,
  className = '',
  children
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center gap-2 px-4 py-2
    text-sm font-medium rounded-lg transition-colors
    disabled:cursor-not-allowed
    ${variantStyles[variant]}
    ${className}
  `;

  const content = loading ? (
    <>
      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Yukleniyor...
    </>
  ) : children;

  if (href && !disabled) {
    return (
      <Link href={href} className={baseStyles}>
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={baseStyles}
    >
      {content}
    </button>
  );
}

export default Button;
