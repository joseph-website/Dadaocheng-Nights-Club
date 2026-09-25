import React, { useEffect, useState } from 'react';
import { ToastMessage, toastService } from '../../utils/toast';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export const CasinoToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = toastService.subscribe((toast) => {
      setToasts((prev) => [...prev.slice(-3), toast]); // Keep at most 4 active toasts

      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== toast.id));
      }, toast.duration || 3000);
    });

    return unsubscribe;
  }, []);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      id="casino-toast-container"
      className="fixed top-6 sm:top-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2.5 max-w-md w-[92vw] sm:w-[420px] pointer-events-none select-none"
    >
      {toasts.map((toast) => {
        const isWarning = toast.type === 'warning';
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            onClick={() => handleDismiss(toast.id)}
            title="點擊框框即可直接關閉通知"
            className={`w-full pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.85)] border backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-top-3 zoom-in-95 fade-in cursor-pointer hover:scale-[1.02] active:scale-[0.98] group ${
              isError
                ? 'bg-gradient-to-r from-rose-950/95 via-rose-900/90 to-rose-950/95 border-rose-500/80 text-rose-100 hover:border-rose-400'
                : isWarning
                ? 'bg-gradient-to-r from-amber-950/95 via-[#1f1606]/95 to-amber-950/95 border-amber-500/80 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:border-amber-400'
                : isSuccess
                ? 'bg-gradient-to-r from-emerald-950/95 via-emerald-900/90 to-emerald-950/95 border-emerald-500/80 text-emerald-100 hover:border-emerald-400'
                : 'bg-gradient-to-r from-cyan-950/95 via-slate-900/90 to-cyan-950/95 border-cyan-500/80 text-cyan-100 hover:border-cyan-400'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border transition-transform group-hover:scale-105 ${
                isError
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  : isWarning
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : isSuccess
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}
            >
              {isError ? (
                <AlertCircle className="w-4 h-4" />
              ) : isWarning ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Info className="w-4 h-4 text-cyan-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="text-xs font-black tracking-wide text-white flex items-center gap-1.5">
                  <span>{toast.title}</span>
                </h4>
              )}
              <p className="text-xs font-medium text-stone-200 mt-0.5 leading-relaxed break-words">
                {toast.message}
              </p>
            </div>

            <div
              className="text-stone-400 group-hover:text-white p-1 rounded-lg group-hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
