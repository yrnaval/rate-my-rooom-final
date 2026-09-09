import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; type: ToastType; message: string }

interface ToastContextType { toast: (message: string, type?: ToastType) => void }

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const dismiss = (id: number) => setToasts(t => t.filter(x => x.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-white shadow-lg animate-slideUp"
            style={{
              border: `1px solid ${t.type === 'error' ? 'rgba(220,38,38,0.15)' : t.type === 'info' ? 'rgba(59,130,246,0.15)' : 'rgba(22,163,74,0.15)'}`,
              boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
            }}
          >
            {t.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
            <p className="text-[14px] font-medium text-[#0A0A0A] flex-1 leading-snug">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-[#A3A3A3] hover:text-[#0A0A0A] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
