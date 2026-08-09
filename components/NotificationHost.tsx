import React, { useEffect, useState } from 'react';
import { ToastKind } from '../services/notifications';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ConfirmState {
  message: string;
  resolve: (result: boolean) => void;
}

const toastStyles: Record<ToastKind, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-500 text-white',
  info: 'bg-slate-800 text-white'
};

const NotificationHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  useEffect(() => {
    let nextId = 0;

    const onToast = (e: Event) => {
      const { message, kind } = (e as CustomEvent).detail;
      const item: ToastItem = { id: ++nextId, message, kind: kind || 'success' };
      setToasts(prev => [...prev, item]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== item.id));
      }, 3500);
    };

    const onConfirm = (e: Event) => {
      const { message, resolve } = (e as CustomEvent).detail;
      setConfirmState({ message, resolve });
    };

    window.addEventListener('app-toast', onToast);
    window.addEventListener('app-confirm', onConfirm);
    return () => {
      window.removeEventListener('app-toast', onToast);
      window.removeEventListener('app-confirm', onConfirm);
    };
  }, []);

  const closeConfirm = (result: boolean) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  return (
    <>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] space-y-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            className={`${toastStyles[t.kind]} px-4 py-3 rounded-2xl shadow-lg text-[11px] font-black uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-2`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {confirmState && (
        <div
          className="fixed inset-0 z-[190] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="bg-white w-full max-w-xs rounded-[28px] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <p className="text-sm font-black text-slate-800 leading-relaxed text-center">{confirmState.message}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => closeConfirm(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => closeConfirm(true)}
                className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationHost;
