import { useState, useEffect, useCallback } from 'react';
import Lenis from 'lenis';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';
import CustomCursor from './components/CustomCursor';
import PageLoader from './components/PageLoader';
import HomePage from './pages/HomePage';
import UniversityPage from './pages/UniversityPage';
import HostelPage from './pages/HostelPage';
import AdminApp from './admin/AdminApp';
import { Page } from './lib/types';

let lenisInstance: Lenis | null = null;

export function scrollToTop(immediate = false) {
  if (lenisInstance) {
    lenisInstance.scrollTo(0, { immediate, duration: immediate ? 0 : 0.8 });
  } else {
    window.scrollTo({ top: 0, behavior: immediate ? 'auto' : 'smooth' });
  }
}

function PublicSite() {
  const [page,      setPage]      = useState<Page>({ name: 'home' });
  const [showLogin, setShowLogin] = useState(false);
  const [loaded,    setLoaded]    = useState(false);
  const [pageKey,   setPageKey]   = useState(0);
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      touchMultiplier: 1.8,
      infinite: false,
    });

    lenisInstance = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);

  useEffect(() => {
    setPageReady(false);
    const t = setTimeout(() => setPageReady(true), 60);
    return () => clearTimeout(t);
  }, [pageKey]);

  useEffect(() => {
    document.body.classList.add('public-site-cursor');
    return () => {
      document.body.classList.remove('public-site-cursor');
    };
  }, []);

  const [authAlert, setAuthAlert] = useState<string | null>(null);

  useEffect(() => {
    const err = sessionStorage.getItem('rmr_auth_error');
    if (err) {
      sessionStorage.removeItem('rmr_auth_error');
      setAuthAlert(err);
      const timer = setTimeout(() => setAuthAlert(null), 6000);
      return () => clearTimeout(timer);
    }
  }, []);

  const navigate = useCallback((p: Page) => {
    setPage(p);
    setPageKey(k => k + 1);
    scrollToTop(true);
  }, []);

  return (
    <>
      <CustomCursor />
      {!loaded && <PageLoader onDone={() => setLoaded(true)} />}

      {authAlert && (
        <div className="fixed bottom-6 right-6 z-[999] max-w-md bg-white border border-red-200 text-[#0A0A0A] p-4 rounded-2xl shadow-xl flex items-start gap-3 animate-slideUp">
          <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <span className="font-bold text-sm">!</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-red-600 mb-0.5">Admin Access Denied</p>
            <p className="text-[12px] text-[#525252] leading-snug">{authAlert}</p>
          </div>
          <button
            onClick={() => setAuthAlert(null)}
            className="text-[#737373] hover:text-[#0A0A0A] text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      <div className="min-h-screen public-site-cursor" style={{ background: 'var(--color-bg)' }}>
        <Navbar onNavigate={navigate} onLoginClick={() => setShowLogin(true)} />

        <main
          key={pageKey}
          style={{
            opacity:    pageReady ? 1 : 0,
            transform:  pageReady ? 'none' : 'translateY(12px)',
            transition: 'opacity 0.45s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {page.name === 'home' && (
            <HomePage onNavigate={navigate} />
          )}
          {page.name === 'university' && (
            <UniversityPage slug={page.slug} onNavigate={navigate} />
          )}
          {page.name === 'hostel' && (
            <HostelPage
              hostelId={page.hostelId}
              universitySlug={page.universitySlug}
              onNavigate={navigate}
              onLoginRequired={() => setShowLogin(true)}
            />
          )}
        </main>

        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </div>
    </>
  );
}

export default function App() {
  const [isAdminPath, setIsAdminPath] = useState(
    () => window.location.pathname.startsWith('/admin'),
  );

  useEffect(() => {
    const onPop = () => setIsAdminPath(window.location.pathname.startsWith('/admin'));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <AuthProvider>
      {isAdminPath ? <AdminApp /> : <PublicSite />}
    </AuthProvider>
  );
}
