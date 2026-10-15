import React from 'react';
import { Check } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 transition">
      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};
