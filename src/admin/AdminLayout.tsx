import { useState, ReactNode } from 'react';
import {
  LayoutDashboard, Building2, Home, Star, Users, Flag, Settings,
  LogOut, Menu, X, ArrowLeft,
} from 'lucide-react';
import type { AdminSection } from './types';
import type { Profile } from './types';

interface Props {
  active: AdminSection;
  onNavigate: (section: AdminSection) => void;
  onBackToSite: () => void;
  onSignOut: () => void;
  profile: Profile | null;
  children: ReactNode;
}

const NAV_ITEMS: { key: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { key: 'universities', label: 'Universities',  icon: Building2 },
  { key: 'hostels',      label: 'Hostels',       icon: Home },
  { key: 'reviews',      label: 'Reviews',       icon: Star },
  { key: 'users',        label: 'Users',         icon: Users },
  { key: 'reports',      label: 'Reports',       icon: Flag },
  { key: 'settings',     label: 'Settings',      icon: Settings },
];

export default function AdminLayout({ active, onNavigate, onBackToSite, onSignOut, profile, children }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 bg-[#950606] rounded-xl flex items-center justify-center" style={{ boxShadow: '0 4px 16px rgba(149,6,6,0.3)' }}>
          <Building2 className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <span className="font-black text-[15px] tracking-[-0.03em] text-[#0A0A0A] block leading-none">
            Rate<span className="text-[#950606]">MyRoom</span>
          </span>
          <span className="text-[11px] font-bold text-[#A3A3A3] tracking-[0.05em] uppercase">Admin Panel</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { onNavigate(key); setDrawerOpen(false); }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200"
            style={{
              background: active === key ? 'rgba(149,6,6,0.08)' : 'transparent',
              color: active === key ? '#950606' : '#525252',
            }}
          >
            <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active === key ? 2.5 : 2} />
            {label}
          </button>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-3 space-y-1 shrink-0 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <button
          onClick={onBackToSite}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-semibold text-[#525252] hover:bg-black/5 transition-colors"
        >
          <ArrowLeft className="w-[18px] h-[18px]" />
          Back to Website
        </button>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Sign Out
        </button>
      </div>

      {/* User info */}
      {profile && (
        <div className="px-4 py-3 shrink-0 flex items-center gap-2.5 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#950606] flex items-center justify-center text-white text-[12px] font-bold">
              {(profile.name || profile.email)[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#0A0A0A] truncate leading-tight">{profile.name || profile.email}</p>
            <p className="text-[11px] text-[#A3A3A3] truncate">{profile.email}</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: '#FAFAF9' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-[260px] shrink-0 bg-white border-r sticky top-0 h-screen"
        style={{ borderColor: 'rgba(0,0,0,0.06)' }}
      >
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-[200] bg-black/40 lg:hidden" onClick={() => setDrawerOpen(false)} />
          <aside
            className="fixed left-0 top-0 bottom-0 z-[201] w-[280px] bg-white lg:hidden animate-slideDown"
            style={{ animation: 'fadeIn 0.2s ease, slideRight 0.3s ease' }}
          >
            <button onClick={() => setDrawerOpen(false)} className="absolute top-4 right-4 z-10">
              <X className="w-5 h-5 text-[#737373]" />
            </button>
            {sidebar}
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 py-3.5 bg-white border-b sticky top-0 z-[100]"
          style={{ borderColor: 'rgba(0,0,0,0.06)' }}
        >
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-black/5">
            <Menu className="w-5 h-5 text-[#0A0A0A]" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#950606] rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-black text-[14px] tracking-[-0.03em] text-[#0A0A0A]">
              Rate<span className="text-[#950606]">MyRoom</span> Admin
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
