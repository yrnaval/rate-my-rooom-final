import { ReactNode } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

// ─── Stat Card ───────────────────────────────
export function StatCard({
  icon: Icon, label, value, color = '#950606', delay = 0,
}: {
  icon: typeof Loader2; label: string; value: number | string; color?: string; delay?: number;
}) {
  return (
    <div
      className="bg-white rounded-2xl p-5 border animate-slideUp"
      style={{ borderColor: 'rgba(0,0,0,0.06)', animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}0d` }}
        >
          <Icon className="w-5 h-5" style={{ color }} strokeWidth={2} />
        </div>
      </div>
      <p className="text-[28px] font-black text-[#0A0A0A] tracking-[-0.03em] leading-none mb-1">{value}</p>
      <p className="text-[13px] font-medium text-[#737373]">{label}</p>
    </div>
  );
}

// ─── Section Header ──────────────────────────
export function SectionHeader({
  title, subtitle, action,
}: {
  title: string; subtitle?: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-[24px] font-black text-[#0A0A0A] tracking-[-0.03em] leading-tight">{title}</h1>
        {subtitle && <p className="text-[14px] text-[#737373] font-medium mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Loading State ───────────────────────────
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-[#950606] animate-spin" />
        <p className="text-[14px] font-medium text-[#737373]">{label}</p>
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────
export function EmptyState({ icon: Icon, title, message }: { icon: typeof Inbox; title: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(0,0,0,0.04)' }}>
        <Icon className="w-7 h-7 text-[#A3A3A3]" />
      </div>
      <h3 className="text-[16px] font-black text-[#0A0A0A] mb-1">{title}</h3>
      {message && <p className="text-[14px] text-[#A3A3A3] font-medium">{message}</p>}
    </div>
  );
}

// ─── Error State ─────────────────────────────
export function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-4 rounded-2xl"
      style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.12)' }}
    >
      <Inbox className="w-5 h-5 text-red-600 shrink-0" />
      <p className="text-[14px] font-medium text-red-700">{message}</p>
    </div>
  );
}

// ─── Pagination ──────────────────────────────
export function Pagination({
  page, totalPages, onPage,
}: {
  page: number; totalPages: number; onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page === 1}
        className="w-9 h-9 rounded-lg flex items-center justify-center border border-[rgba(0,0,0,0.08)] disabled:opacity-40 hover:bg-black/5 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-[14px] font-semibold text-[#525252] px-3">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="w-9 h-9 rounded-lg flex items-center justify-center border border-[rgba(0,0,0,0.08)] disabled:opacity-40 hover:bg-black/5 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Status Badge ────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    approved: { bg: 'rgba(22,163,74,0.08)', color: '#15803d', label: 'Approved' },
    pending:  { bg: 'rgba(217,119,6,0.08)', color: '#b45309', label: 'Pending' },
    hidden:   { bg: 'rgba(107,114,128,0.08)', color: '#4b5563', label: 'Hidden' },
    dismissed:{ bg: 'rgba(107,114,128,0.08)', color: '#4b5563', label: 'Dismissed' },
    resolved: { bg: 'rgba(22,163,74,0.08)', color: '#15803d', label: 'Resolved' },
  };
  const c = config[status] || { bg: 'rgba(0,0,0,0.05)', color: '#525252', label: status };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold"
      style={{ background: c.bg, color: c.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}

// ─── Search Input ────────────────────────────
export function SearchInput({
  value, onChange, placeholder = 'Search…',
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full sm:w-64 px-4 py-2.5 rounded-xl text-[14px] font-medium border bg-white"
      style={{ borderColor: 'rgba(0,0,0,0.08)' }}
    />
  );
}

// ─── Filter Select ───────────────────────────
export function FilterSelect({
  value, onChange, options,
}: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-4 py-2.5 rounded-xl text-[14px] font-semibold border bg-white cursor-pointer"
      style={{ borderColor: 'rgba(0,0,0,0.08)' }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── Card Container ──────────────────────────
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white rounded-2xl border ${className}`}
      style={{ borderColor: 'rgba(0,0,0,0.06)' }}
    >
      {children}
    </div>
  );
}
