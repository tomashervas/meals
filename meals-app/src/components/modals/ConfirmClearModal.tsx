import React from 'react';

interface ConfirmClearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmClearModal: React.FC<ConfirmClearModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-center space-y-4">
        <h3 className="text-lg font-bold text-slate-900">¿Reiniciar el registro de hoy?</h3>
        <p className="text-xs text-slate-500">
          Se vaciarán las comidas de hoy, pero tus Platos Habituales IA y tu Menú Semanal se conservarán.
        </p>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
          >
            Sí, vaciar día
          </button>
        </div>
      </div>
    </div>
  );
};
