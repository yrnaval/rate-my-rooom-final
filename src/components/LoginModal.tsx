import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Props { onClose: () => void }

const PERKS = [
  'Rate cleanliness, WiFi & food',
  'Upload photos of your room',
  'Help students choose better',
];

export default function LoginModal({ onClose }: Props) {
  const { signInWithGoogle } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 350);
  };

  const handleSignIn = async () => {
    await signInWithGoogle();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.32)',
          backdropFilter: isVisible ? 'blur(12px) saturate(180%)' : 'blur(4px) saturate(100%)',
          WebkitBackdropFilter: isVisible ? 'blur(12px) saturate(180%)' : 'blur(4px) saturate(100%)',
          opacity: isVisible ? 1 : 0,
        }}
        onClick={handleClose}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-[420px] bg-white rounded-[24px] overflow-hidden"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.04)',
          transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(16px)',
          opacity: isVisible ? 1 : 0,
          transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-black/5"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="#86868B" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="px-8 pt-10 pb-9">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-[20px] bg-[#950606] flex items-center justify-center" style={{ boxShadow: '0 4px 24px rgba(149,6,6,0.25)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
          </div>

          {/* Headline */}
          <h2
            className="text-center text-[28px] font-semibold tracking-[-0.02em] text-[#1D1D1F] mb-2"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}
          >
            Sign in to RateMyRoom
          </h2>
          <p className="text-center text-[15px] text-[#86868B] leading-relaxed mb-8">
            Share your hostel experience and help others find their perfect room.
          </p>

          {/* Perks */}
          <div className="space-y-3 mb-8">
            {PERKS.map((text) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#F5F5F7] flex items-center justify-center shrink-0">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#950606" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-[14px] text-[#424245] font-normal">{text}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#E5E5EA]" />
            <span className="text-[12px] font-medium text-[#86868B] tracking-wide">Continue with</span>
            <div className="flex-1 h-px bg-[#E5E5EA]" />
          </div>

          {/* Google Sign In Button - Apple-style */}
          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-[14px] text-[15px] font-medium text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#EBEBF0] active:scale-[0.98] transition-all duration-200"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>

          {/* Footer */}
          <p className="text-center text-[12px] text-[#86868B] mt-6 leading-relaxed">
            No account required to browse. Sign in only to write reviews.
          </p>
        </div>
      </div>
    </div>
  );
}
