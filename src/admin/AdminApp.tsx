import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, ShieldOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from './useAdmin';
import { ToastProvider } from './ToastContext';
import AdminLayout from './AdminLayout';
import Dashboard from './pages/Dashboard';
import Universities from './pages/Universities';
import Hostels from './pages/Hostels';
import Reviews from './pages/Reviews';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import type { AdminSection } from './types';

const SECTION_PATH: Record<AdminSection, string> = {
  dashboard: '/admin',
  universities: '/admin/universities',
  hostels: '/admin/hostels',
  reviews: '/admin/reviews',
  users: '/admin/users',
  reports: '/admin/reports',
  settings: '/admin/settings',
};

function sectionFromPath(pathname: string): AdminSection {
  const p = pathname.replace(/\/+$/, '') || '/';
  const entry = (Object.entries(SECTION_PATH) as [AdminSection, string][])
    .find(([, path]) => path === p);
  return entry?.[0] ?? 'dashboard';
}

export default function AdminApp() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { loading: adminLoading, isAdmin, profile } = useAdmin();
  const [section, setSection] = useState<AdminSection>(() =>
    sectionFromPath(window.location.pathname),
  );

  useEffect(() => {
    const onPop = () => setSection(sectionFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((next: AdminSection) => {
    const path = SECTION_PATH[next];
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setSection(next);
  }, []);

  const backToSite = () => {
    window.location.assign('/');
  };

  // Handle unauthorized users: auto sign-out and redirect to home
  useEffect(() => {
    if (!authLoading && !adminLoading && user && !isAdmin) {
      let isRedirecting = true;
      signOut().finally(() => {
        if (isRedirecting) {
          sessionStorage.setItem('rmr_auth_error', 'Admin access is restricted to authorized accounts. You have been signed out.');
          window.location.replace('/');
        }
      });
      return () => {
        isRedirecting = false;
      };
    }
  }, [authLoading, adminLoading, user, isAdmin, signOut]);

  if (authLoading || (user && adminLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#950606] animate-spin" />
          <p className="text-[14px] font-medium text-[#737373]">Checking administrator access…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAFAF9]">
        <div className="w-full max-w-[420px] bg-white rounded-[24px] p-8 border" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#950606] flex items-center justify-center" style={{ boxShadow: '0 4px 24px rgba(149,6,6,0.25)' }}>
              <Building2 className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-center text-[24px] font-black tracking-[-0.03em] text-[#0A0A0A] mb-2">
            RateMyRoom Admin
          </h1>
          <p className="text-center text-[14px] text-[#737373] mb-8">
            Access is restricted to authorized administrators. Sign in with Google to continue.
          </p>
          <button
            onClick={() => signInWithGoogle(`${window.location.origin}/admin`)}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-[14px] text-[15px] font-medium text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#EBEBF0] transition-all cursor-pointer shadow-sm active:scale-[0.99]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
          <button onClick={backToSite} className="w-full mt-4 text-[13px] font-semibold text-[#737373] hover:text-[#0A0A0A] transition-colors">
            ← Back to RateMyRoom
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAFAF9]">
        <div className="w-full max-w-[440px] bg-white rounded-[24px] p-8 text-center border" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.08)' }}>
            <ShieldOff className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-[24px] font-black tracking-[-0.03em] text-[#0A0A0A] mb-2">Unauthorized Account</h1>
          <p className="text-[14px] text-[#737373] leading-relaxed mb-6">
            Admin access is restricted to authorized administrators. Signing you out and returning to the homepage…
          </p>
          <div className="flex items-center justify-center gap-2 text-[14px] font-semibold text-[#950606]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Redirecting…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <AdminLayout
        active={section}
        onNavigate={navigate}
        onBackToSite={backToSite}
        onSignOut={signOut}
        profile={profile}
      >
        {section === 'dashboard' && <Dashboard />}
        {section === 'universities' && <Universities />}
        {section === 'hostels' && <Hostels />}
        {section === 'reviews' && <Reviews />}
        {section === 'users' && <Users />}
        {section === 'reports' && <Reports />}
        {section === 'settings' && <Settings profile={profile} />}
      </AdminLayout>
    </ToastProvider>
  );
}
