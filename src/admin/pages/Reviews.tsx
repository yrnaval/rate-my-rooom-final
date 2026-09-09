import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Check, Trash2, Star, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ToastContext';
import ConfirmDialog from '../ConfirmDialog';
import { SectionHeader, LoadingState, EmptyState, ErrorState, Pagination, FilterSelect, Card, StatusBadge } from '../components';

interface ReviewRow {
  id: string;
  user_name: string | null;
  reviewer_name: string | null;
  overall: number;
  body: string | null;
  stay_period: string | null;
  created_at: string;
  status: 'pending' | 'approved' | 'hidden';
  hostel_id: string;
  hostel_name?: string;
  university_name?: string;
  report_count?: number;
}

const PAGE_SIZE = 10;

export default function Reviews() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [rating, setRating] = useState('all');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<ReviewRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReviewRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('reviews')
      .select('id, user_name, reviewer_name, overall, body, stay_period, created_at, status, hostel_id, hostels(name, universities(name))')
      .order('created_at', { ascending: false });
    if (error) { setError('Failed to load reviews'); setLoading(false); return; }

    const { data: reports } = await supabase.from('review_reports').select('review_id').eq('status', 'pending');
    const reportCounts: Record<string, number> = {};
    (reports || []).forEach(r => { reportCounts[r.review_id] = (reportCounts[r.review_id] || 0) + 1; });

    const mapped = (data || []).map((r: Record<string, unknown>) => {
      const hostels = r.hostels as { name?: string; universities?: { name?: string } } | null;
      return {
        ...r,
        hostel_name: hostels?.name,
        university_name: hostels?.universities?.name,
        report_count: reportCounts[r.id as string] || 0,
      } as ReviewRow;
    });
    setRows(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (r.user_name || r.reviewer_name || '').toLowerCase().includes(q) ||
      (r.body || '').toLowerCase().includes(q) ||
      (r.hostel_name || '').toLowerCase().includes(q) ||
      (r.university_name || '').toLowerCase().includes(q);
    const matchStatus =
      status === 'all' ? true :
      status === 'reported' ? (r.report_count || 0) > 0 :
      r.status === status;
    const matchRating = rating === 'all' || String(r.overall) === rating;
    return matchSearch && matchStatus && matchRating;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setReviewStatus = async (id: string, next: 'pending' | 'approved' | 'hidden') => {
    const { error } = await supabase.rpc('moderate_review', { p_review_id: id, p_status: next });
    if (error) toast(error.message.includes('Not authorized') ? 'You do not have permission to perform this action' : 'Failed to update review', 'error');
    else {
      toast(next === 'approved' ? 'Review approved' : next === 'hidden' ? 'Review hidden' : 'Review set to pending');
      fetchReviews();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('reviews').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) toast('Failed to delete review. Related reports may need to be cleared first.', 'error');
    else { toast('Review deleted'); setDeleteTarget(null); setViewing(null); fetchReviews(); }
  };

  return (
    <div>
      <SectionHeader title="Reviews" subtitle={`${rows.length} total reviews`} />

      <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
        <input
          type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search reviewer, hostel, comment…"
          className="flex-1 min-w-[200px] max-w-sm px-4 py-2.5 rounded-xl text-[14px] font-medium border bg-white"
          style={{ borderColor: 'rgba(0,0,0,0.08)' }}
        />
        <FilterSelect value={status} onChange={v => { setStatus(v); setPage(1); }} options={[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'hidden', label: 'Hidden' },
          { value: 'reported', label: 'Reported' },
        ]} />
        <FilterSelect value={rating} onChange={v => { setRating(v); setPage(1); }} options={[
          { value: 'all', label: 'All ratings' },
          { value: '5', label: '5 stars' }, { value: '4', label: '4 stars' },
          { value: '3', label: '3 stars' }, { value: '2', label: '2 stars' }, { value: '1', label: '1 star' },
        ]} />
      </div>

      {loading ? <LoadingState label="Loading reviews…" /> : error ? <ErrorState message={error} /> : filtered.length === 0 ? (
        <Card className="py-8"><EmptyState icon={Star} title="No reviews found" /></Card>
      ) : (
        <>
          <div className="space-y-3">
            {paged.map(r => (
              <Card key={r.id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-[14px] font-bold text-[#0A0A0A]">{r.user_name || r.reviewer_name || 'Anonymous'}</p>
                      <StatusBadge status={r.status} />
                      {(r.report_count || 0) > 0 && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-red-50 text-red-700">{r.report_count} report{r.report_count === 1 ? '' : 's'}</span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#737373] font-medium">{r.university_name || '—'} · {r.hostel_name || '—'}</p>
                    <p className="text-[13px] text-[#525252] mt-1.5 line-clamp-2">{r.body || 'No comment'}</p>
                    <p className="text-[12px] text-[#A3A3A3] mt-1.5">
                      {r.stay_period ? `${r.stay_period} · ` : ''}{new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[16px] font-black text-[#950606] mr-2">{r.overall}/5</span>
                    <button onClick={() => setViewing(r)} className="w-9 h-9 rounded-lg hover:bg-black/5 flex items-center justify-center" title="View"><Eye className="w-4 h-4 text-[#525252]" /></button>
                    {r.status !== 'approved' && (
                      <button onClick={() => setReviewStatus(r.id, 'approved')} className="w-9 h-9 rounded-lg hover:bg-green-50 flex items-center justify-center" title="Approve"><Check className="w-4 h-4 text-green-700" /></button>
                    )}
                    {r.status !== 'hidden' && (
                      <button onClick={() => setReviewStatus(r.id, 'hidden')} className="w-9 h-9 rounded-lg hover:bg-black/5 flex items-center justify-center" title="Hide"><EyeOff className="w-4 h-4 text-[#525252]" /></button>
                    )}
                    <button onClick={() => setDeleteTarget(r)} className="w-9 h-9 rounded-lg hover:bg-red-50 flex items-center justify-center" title="Delete"><Trash2 className="w-4 h-4 text-red-600" /></button>
                  </div>
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
          <div className="relative w-full max-w-[560px] bg-white rounded-[24px] p-7">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-[18px] font-black text-[#0A0A0A]">{viewing.user_name || viewing.reviewer_name || 'Anonymous'}</h2>
                <p className="text-[13px] text-[#737373]">{viewing.university_name} · {viewing.hostel_name}</p>
              </div>
              <button onClick={() => setViewing(null)} className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[20px] font-black text-[#950606]">{viewing.overall}/5</span>
              <StatusBadge status={viewing.status} />
            </div>
            <p className="text-[14px] text-[#404040] leading-relaxed mb-6">{viewing.body || 'No comment'}</p>
            <div className="flex flex-wrap gap-2 justify-end">
              <button onClick={() => setReviewStatus(viewing.id, 'approved')} className="px-4 py-2 rounded-xl text-[13px] font-bold bg-green-50 text-green-800">Approve</button>
              <button onClick={() => setReviewStatus(viewing.id, 'hidden')} className="px-4 py-2 rounded-xl text-[13px] font-bold bg-black/5 text-[#525252]">Hide</button>
              <button onClick={() => setDeleteTarget(viewing)} className="px-4 py-2 rounded-xl text-[13px] font-bold bg-red-50 text-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Review?"
        message="This permanently removes the review. Reports on this review will also be removed."
        confirmLabel="Delete Review"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
