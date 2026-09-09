import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';

interface Props {
  onDone: () => void;
}

export default function PageLoader({ onDone }: Props) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 100);
    const t2 = setTimeout(() => setPhase('exit'), 1100);
    const t3 = setTimeout(() => onDone(), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-[#0A0A0A] transition-all"
      style={{
        opacity:    phase === 'exit' ? 0 : 1,
        transform:  phase === 'exit' ? 'scale(1.015)' : 'scale(1)',
        transition: phase === 'exit'
          ? 'opacity 0.55s cubic-bezier(0.4,0,0.2,1), transform 0.55s cubic-bezier(0.4,0,0.2,1)'
          : 'none',
        pointerEvents: phase === 'exit' ? 'none' : 'auto',
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          opacity:    phase === 'enter' ? 0 : 1,
          transform:  phase === 'enter' ? 'translateY(16px) scale(0.92)' : 'translateY(0) scale(1)',
          transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)',
        }}
        className="flex flex-col items-center gap-5"
      >
        <div className="relative">
          <div className="w-16 h-16 bg-[#950606] rounded-[18px] flex items-center justify-center shadow-[0_8px_32px_rgba(149,6,6,0.4)]">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          {/* Animated ring */}
          <div
            className="absolute inset-0 rounded-[18px] border-2 border-[#950606]/40"
            style={{ animation: 'pulse-glow 2s ease infinite' }}
          />
        </div>

        <div className="text-center">
          <p className="text-2xl font-black text-white tracking-[-0.04em]">
            Rate<span className="text-[#950606]">MyRoom</span>
          </p>
          <p className="text-sm text-white/30 font-medium mt-1 tracking-wide">
            Honest student reviews
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-40 h-[2px] bg-white/8 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-[#950606] rounded-full"
            style={{ animation: 'loaderBar 1s cubic-bezier(0.4,0,0.2,1) 0.15s forwards', width: 0 }}
          />
        </div>
      </div>
    </div>
  );
}
