import { useCallback, useEffect, useState } from 'react';
import { Users as UsersIcon, Shield, ShieldOff, Star, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ToastContext';
import ConfirmDialog from '../ConfirmDialog';
import { SectionHeader, LoadingState, EmptyState, ErrorState, Pagination, FilterSelect, Card, StatusBadge } from '../components';
import type { Profile } from '../types';

const PAGE_SIZE = 12;

export default function Users() {
  const { toast } = useToast();
  const { user: me } = useAuth();
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [roleTarget, setRoleTarget] = useState<{ profile: Profile; next: 'user' | 'admin' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<Profile | null>(null);
  const [userReviews, setUserReviews] = useState<{ id: string; body: string | null; overall: number; created_at: string }[]>([]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) { setError('Failed to load users'); setLoading(false); return; }

    const enriched = await Promise.all((data || []).map(async (p: Profile) => {
      const { count } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', p.id);
      return { ...p, review_count: count || 0 };
    }));
    setRows(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    const match = !q || (r.name || '').toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    const matchRole = roleFilter === 'all' || r.role === roleFilter;
    return match && matchRole;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const adminCount = rows.filter(r => r.role === 'admin').length;

  const confirmRoleChange = (profile: Profile, next: 'user' | 'admin') => {
    if (next === 'user' && profile.id === me?.id && adminCount <= 1) {
      toast('You cannot remove your own final admin access', 'error');
      return;
    }
    setRoleTarget({ profile, next });
  };

  const applyRole = async () => {
    if (!roleTarget) return;
    setSaving(true);
    const { error } = await supabase.rpc('set_user_role', {
      p_user_id: roleTarget.profile.id,
      p_role: roleTarget.next,
    });
    setSaving(false);
    if (error) {
      const msg = error.message.includes('last admin')
        ? 'Cannot remove the last admin'
        : error.message.includes('Not authorized')
          ? 'You do not have permission to perform this action'
          : 'Failed to update role';
      toast(msg, 'error');
    } else {
      toast(roleTarget.next === 'admin' ? 'User promoted to admin' : 'Admin role removed');
      setRoleTarget(null);
      fetchUsers();
    }
  };

  const openReviews = async (p: Profile) => {
    setViewing(p);
    const { data } = await supabase
      .from('reviews')
      .select('id, body, overall, created_at')
      .eq('user_id', p.id)
      .order('created_at', { ascending: false });
    setUserReviews(data || []);
  };

  return (
    <div>
      <SectionHeader title="Users" subtitle={`${rows.length} accounts · ${adminCount} admins`} />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name or email…"
          className="flex-1 max-w-sm px-4 py-2.5 rounded-xl text-[14px] font-medium border bg-white"
          style={{ borderColor: 'rgba(0,0,0,0.08)' }}
        />
        <FilterSelect value={roleFilter} onChange={v => { setRoleFilter(v); setPage(1); }} options={[
          { value: 'all', label: 'All roles' },
          { value: 'admin', label: 'Admins' },
          { value: 'user', label: 'Users' },
        ]} />
      </div>

      {loading ? <LoadingState label="Loading users…" /> : error ? <ErrorState message={error} /> : filtered.length === 0 ? (
        <Card className="py-8"><EmptyState icon={UsersIcon} title="No users found" /></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paged.map(p => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[#950606] text-white flex items-center justify-center text-[14px] font-bold">
                      {(p.name || p.email)[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-[#0A0A0A] truncate">{p.name || 'Unnamed'}</p>
                    <p className="text-[12px] text-[#737373] truncate">{p.email}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <StatusBadge status={p.role === 'admin' ? 'approved' : 'pending'} />
                      <span className="text-[12px] text-[#A3A3A3]">{p.review_count} reviews</span>
                    </div>
                  </div>
                </div>
                <p className="text-[12px] text-[#A3A3A3] mb-3">Joined {new Date(p.created_at).toLocaleDateString()}</p>
                <div className="flex gap-2">
                  <button onClick={() => openReviews(p)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-black/5 text-[12px] font-bold">
                    <Star className="w-3.5 h-3.5" /> Reviews
                  </button>
                  {p.role === 'admin' ? (
                    <button onClick={() => confirmRoleChange(p, 'user')} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-50 text-[12px] font-bold text-red-700">
                      <ShieldOff className="w-3.5 h-3.5" /> Remove admin
                    </button>
                  ) : (
                    <button onClick={() => confirmRoleChange(p, 'admin')} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold text-white bg-[#950606]">
                      <Shield className="w-3.5 h-3.5" /> Make admin
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}

      {viewing && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewing(null)} />
          <div className="relative w-full max-w-[560px] max-h-[80vh] overflow-y-auto bg-white rounded-[24px] p-7">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-black">Reviews by {viewing.name || viewing.email}</h2>
              <button onClick={() => setViewing(null)} className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            {userReviews.length === 0 ? (
              <p className="text-[14px] text-[#A3A3A3]">No reviews yet</p>
            ) : (
              <div className="space-y-3">
                {userReviews.map(r => (
                  <div key={r.id} className="p-3 rounded-xl bg-[#FAFAF9]">
                    <div className="flex justify-between text-[13px] font-bold mb-1">
                      <span>{r.overall}/5</span>
                      <span className="text-[#A3A3A3] font-medium">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[13px] text-[#525252]">{r.body || 'No comment'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!roleTarget}
        title={roleTarget?.next === 'admin' ? 'Promote to admin?' : 'Remove admin role?'}
        message={
          roleTarget?.next === 'user' && roleTarget.profile.id === me?.id
            ? 'You are about to remove your own admin access. You will lose access to this panel immediately.'
            : roleTarget?.next === 'admin'
              ? `${roleTarget.profile.email} will be able to manage universities, hostels, reviews, and users.`
              : `${roleTarget?.profile.email} will no longer be able to access the admin panel.`
        }
        confirmLabel={roleTarget?.next === 'admin' ? 'Promote' : 'Remove admin'}
        onConfirm={applyRole}
        onCancel={() => setRoleTarget(null)}
        loading={saving}
      />
    </div>
  );
}
