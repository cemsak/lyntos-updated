'use client';

// ════════════════════════════════════════════════════════════════════════════
// Card Component - Reusable panel container
// ════════════════════════════════════════════════════════════════════════════

interface CardProps {
  title: string;
  className?: string;
  headerRight?: React.ReactNode;
  headerColor?: 'default' | 'blue' | 'green' | 'amber' | 'red' | 'teal';
  children: React.ReactNode;
}

const headerColors = {
  default: 'bg-gray-50 border-gray-200',
  blue: 'bg-blue-50 border-blue-200',
  green: 'bg-green-50 border-green-200',
  amber: 'bg-amber-50 border-amber-200',
  red: 'bg-red-50 border-red-200',
  teal: 'bg-teal-50 border-teal-200',
};

export function Card({ title, className = '', headerRight, headerColor = 'default', children }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${headerColors[headerColor]}`}>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {headerRight}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

export default Card;
