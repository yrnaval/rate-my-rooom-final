import { useState, useEffect } from 'react';
import { Building2, LogIn, LogOut, Menu, X, User, Star, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Page } from '../lib/types';

interface Props {
  onNavigate: (page: Page) => void;
  onLoginClick: () => void;
}

export default function Navbar({ onNavigate, onLoginClick }: Props) {
  const { user, signOut, isAdmin } = useAuth();
  const [scrolled,  setScrolled]  = useState(false);
  const [hidden,    setHidden]    = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [lastY,     setLastY]     = useState(0);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 24);
        setHidden(y > 120 && y > lastY + 8);
        setLastY(y);
        ticking = false;
      });
      ticking = true;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [lastY]);

  const avatarUrl  = user?.user_metadata?.avatar_url  as string | undefined;
  const fullName   = user?.user_metadata?.full_name   as string | undefined;
  const firstName  = fullName?.split(' ')[0];

  const navLinks = [
    { label: 'Universities', action: () => onNavigate({ name: 'home' }) },
    { label: 'How It Works', href: '#how-it-works' },
  ];

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          transform: hidden && !menuOpen ? 'translateY(-110%)' : 'translateY(0)',
          transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Nav container */}
        <div
          className={`transition-all duration-300 ${
            scrolled
              ? 'glass shadow-[0_1px_0_rgba(0,0,0,0.06)]'
              : 'bg-transparent'
          }`}
        >
          <div className="container-xl">
            <div className="flex items-center justify-between h-16 md:h-[68px]">

              {/* Logo */}
              <button
                onClick={() => onNavigate({ name: 'home' })}
                className="flex items-center gap-2.5 group shrink-0"
              >
                <div
                  className="w-8 h-8 bg-[#950606] rounded-[10px] flex items-center justify-center transition-all duration-300 group-hover:rounded-xl group-hover:scale-105"
                  style={{ boxShadow: '0 2px 8px rgba(149,6,6,0.3)' }}
                >
                  <Building2 className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
                </div>
                <span className="font-black text-[17px] tracking-[-0.03em] text-gray-900 group-hover:text-[#950606] transition-colors duration-200">
                  Rate<span className="text-[#950606]">MyRoom</span>
                </span>
              </button>

              {/* Desktop navigation */}
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map(link => (
                  link.action ? (
                    <button
                      key={link.label}
                      onClick={link.action}
                      className="px-4 py-2 text-[14px] font-semibold text-[#525252] hover:text-[#0A0A0A] hover:bg-black/5 rounded-xl transition-all duration-200"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <a
                      key={link.label}
                      href={link.href}
                      className="px-4 py-2 text-[14px] font-semibold text-[#525252] hover:text-[#0A0A0A] hover:bg-black/5 rounded-xl transition-all duration-200"
                    >
                      {link.label}
                    </a>
                  )
                ))}
              </nav>

              {/* Desktop auth */}
              <div className="hidden md:flex items-center gap-3">
                {isAdmin && (
                  <a
                    href="/admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-[#950606] hover:bg-[#950606]/8 rounded-xl transition-all duration-200"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin
                  </a>
                )}
                {user ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2.5 px-3 py-1.5 bg-black/5 rounded-xl">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={fullName}
                          className="w-6 h-6 rounded-full object-cover ring-1 ring-black/10"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#950606]/15 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-[#950606]" />
                        </div>
                      )}
                      <span className="text-[13px] font-semibold text-gray-700">{firstName}</span>
                    </div>
                    <button
                      onClick={signOut}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-800 hover:bg-black/5 rounded-xl transition-all duration-200"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onLoginClick}
                    className="btn-primary text-[13px] py-2.5 px-5 gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign in
                  </button>
                )}
              </div>

              {/* Mobile menu trigger */}
              <button
                className="md:hidden p-2 rounded-xl hover:bg-black/5 transition-colors active:scale-95"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
              >
                <div
                  className="relative w-5 h-5 flex items-center justify-center"
                  style={{ transition: 'transform 0.3s' }}
                >
                  <Menu
                    className="absolute w-5 h-5 text-gray-700 transition-all duration-300"
                    style={{ opacity: menuOpen ? 0 : 1, transform: menuOpen ? 'rotate(90deg) scale(0.5)' : 'none' }}
                  />
                  <X
                    className="absolute w-5 h-5 text-gray-700 transition-all duration-300"
                    style={{ opacity: menuOpen ? 1 : 0, transform: menuOpen ? 'none' : 'rotate(-90deg) scale(0.5)' }}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <div
        className="fixed inset-0 z-40 md:hidden"
        style={{
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
        onClick={() => setMenuOpen(false)}
      >
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      </div>

      <div
        className="fixed top-0 right-0 bottom-0 z-40 w-72 md:hidden flex flex-col"
        style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex items-center justify-between p-5 border-b border-black/6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#950606] rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-black text-[16px] tracking-[-0.03em]">
              Rate<span className="text-[#950606]">MyRoom</span>
            </span>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors"
          >
            <X className="w-[18px] h-[18px] text-gray-500" />
          </button>
        </div>

        <nav className="p-4 flex-1 space-y-1">
          {navLinks.map(link => (
            link.action ? (
              <button
                key={link.label}
                onClick={() => { link.action!(); setMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-xl text-[15px] font-semibold text-gray-700 hover:bg-black/5 hover:text-gray-900 transition-all duration-200 flex items-center gap-3"
              >
                <Building2 className="w-4 h-4 text-gray-400" />
                {link.label}
              </button>
            ) : (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold text-gray-700 hover:bg-black/5 hover:text-gray-900 transition-all duration-200"
              >
                <Star className="w-4 h-4 text-gray-400" />
                {link.label}
              </a>
            )
          ))}
        </nav>

        <div className="p-4 border-t border-black/6">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-3 py-2.5 bg-black/4 rounded-xl">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#950606]/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#950606]" />
                  </div>
                )}
                <div>
                  <p className="text-[13px] font-bold text-gray-900">{fullName}</p>
                  <p className="text-[11px] text-gray-400">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => { signOut(); setMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold text-gray-600 border border-black/8 hover:bg-black/4 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => { onLoginClick(); setMenuOpen(false); }}
              className="w-full btn-primary py-3.5 text-[15px]"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </>
  );
}
