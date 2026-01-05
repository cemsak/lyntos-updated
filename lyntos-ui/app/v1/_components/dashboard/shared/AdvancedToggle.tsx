'use client';

// ════════════════════════════════════════════════════════════════════════════
// AdvancedToggle - "Gelismis (Teknik)" mode toggle
// When OFF: hides SRC-IDs, trust_score numbers, hashes, scraper_status
// When ON: shows all technical details
// ════════════════════════════════════════════════════════════════════════════

interface AdvancedToggleProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
}

export function AdvancedToggle({ checked, onChange, label = 'Gelismis' }: AdvancedToggleProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        className={`
          relative w-10 h-5 rounded-full transition-colors duration-200
          ${checked ? 'bg-blue-600' : 'bg-gray-300'}
        `}
        onClick={onChange}
      >
        <div className={`
          absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `} />
      </div>
      <span className="text-sm text-gray-600">{label}</span>
      {checked && (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )}
    </label>
  );
}

export default AdvancedToggle;
