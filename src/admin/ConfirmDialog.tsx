import { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  onConfirm, onCancel, loading,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fadeIn"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-[440px] bg-white rounded-[24px] p-7 animate-scaleIn"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
      >
        <div className="flex items-start gap-4 mb-5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(220,38,38,0.08)' }}
          >
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-[18px] font-black text-[#0A0A0A] tracking-[-0.02em] mb-1.5">{title}</h3>
            <div className="text-[14px] text-[#737373] leading-relaxed">{message}</div>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-[#525252] hover:bg-black/5 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-[14px] font-bold text-white bg-[#950606] hover:bg-[#7a0404] transition-colors disabled:opacity-60"
          >
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
