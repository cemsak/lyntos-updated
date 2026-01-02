import React from "react";

export default function Modal({ children, onClose, open }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-lg p-6 min-w-[340px] max-w-[90vw] max-h-[90vh] overflow-auto relative"
        onClick={e => e.stopPropagation()}
      >
        {children}
        <button
          className="mt-4 px-4 py-2 rounded bg-red-600 text-white absolute right-6 top-4"
          onClick={onClose}
          aria-label="Kapat"
        >
          Kapat
        </button>
      </div>
    </div>
  );
}