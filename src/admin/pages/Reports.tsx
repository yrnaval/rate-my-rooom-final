import { useCallback, useEffect, useState } from 'react';
import { Flag, Eye, EyeOff, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ToastContext';
import ConfirmDialog from '../ConfirmDialog';
import { SectionHeader, LoadingState, EmptyState, ErrorState, Pagination, FilterSelect, Card, StatusBadge } from '../components';

const REASON_LABELS: Record<string, string> = {
  fake: 'Fake Review',
  spam: 'Spam',
  offensive: 'Offensive Content',
  wrong_hostel: 'Wrong Hostel',
  personal_info: 'Personal Information',
  other: 'Other',
};

interface ReportRow {
  id: string;
  review_id: string;
  reported_by: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'dismissed' | 'resolved';
  created_at: string;
  reporter_email?: string;
  review_body?: string | null;
  review_overall?: number;
  hostel_name?: string;
  university_name?: string;
}

const PAGE_SIZE = 10;

export default function Reports() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<ReportRow | null>(null);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('review_reports')
      .select('*, reviews(id, body, overall, hostels(name, universities(name)))')
      .order('created_at', { ascending: false });
    if (error) { setError('Failed to load reports'); setLoading(false); return; }

    const reporterIds = Array.from(new Set((data || []).map((r: { reported_by: string }) => r.reported_by)));
    const { data: profiles } = reporterIds.length
      ? await supabase.from('profiles').select('id, email, name').in('id', reporterIds)
      : { data: [] };
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    setRows((data || []).map((r: Record<string, unknown>) => {
      const review = r.reviews as {
        body?: string; overall?: number;
        hostels?: { name?: string; universities?: { name?: string } };
      } | null;
      const reporter = profileMap[r.reported_by as string];
      return {
        id: r.id as string,
        review_id: r.review_id as string,
        reported_by: r.reported_by as string,
        reason: r.reason as string,
        description: r.description as string | null,
        status: r.status as ReportRow['status'],
        created_at: r.created_at as string,
        reporter_email: reporter?.email || reporter?.name,
        review_body: review?.body,
        review_overall: review?.overall,
        hostel_name: review?.hostels?.name,
        university_name: review?.hostels?.universities?.name,
      };
    }));
    setLoading(false);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const filtered = rows.filter(r => status === 'all' || r.status === status);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setReportStatus = async (id: string, next: 'dismissed' | 'resolved') => {
    const { error } = await supabase.from('review_reports').update({ status: next }).eq('id', id);
    if (error) toast('You do not have permission to perform this action', 'error');
    else {
      toast(next === 'dismissed' ? 'Report dismissed' : 'Report resolved');
      setViewing(null);
      fetchReports();
    }
  };

  const hideReview = async (report: ReportRow) => {
    const { error } = await supabase.rpc('moderate_review', { p_review_id: report.review_id, p_status: 'hidden' });
    if (error) { toast('Failed to hide review', 'error'); return; }
    await supabase.from('review_reports').update({ status: 'resolved' }).eq('id', report.id);
    toast('Review hidden and report resolved');
    setViewing(null);
    fetchReports();
  };

  const handleDeleteReview = async () => {
    if (!deleteReviewId) return;
    setWorking(true);
    await supabase.from('review_reports').delete().eq('review_id', deleteReviewId);
    const { error } = await supabase.from('reviews').delete().eq('id', deleteReviewId);
    setWorking(false);
    if (error) toast('Failed to delete review. Remove related hostels/reports first if needed.', 'error');
    else {
      toast('Review deleted');
      setDeleteReviewId(null);
      setViewing(null);
      fetchReports();
    }
  };

  return (
    <div>
      <SectionHeader title="Reports" subtitle="User-submitted review reports" />

      <div className="mb-5">
        <FilterSelect value={status} onChange={v => { setStatus(v); setPage(1); }} options={[
          { value: 'pending', label: 'Pending' },
          { value: 'dismissed', label: 'Dismissed' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'all', label: 'All' },
        ]} />
      </div>

      {loading ? <LoadingState label="Loading reports…" /> : error ? <ErrorState message={error} /> : filtered.length === 0 ? (
        <Card className="py-8"><EmptyState icon={Flag} title="No reports" message="Reported reviews will appear here" /></Card>
      ) : (
        <>
          <div className="space-y-3">
            {paged.map(r => (
              <Card key={r.id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[13px] font-black text-[#950606]">{REASON_LABELS[r.reason] || r.reason}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-[13px] text-[#737373]">{r.university_name || '—'} · {r.hostel_name || '—'}</p>
                    <p className="text-[13px] text-[#525252] mt-1 line-clamp-2">{r.review_body || 'Review unavailable'}</p>
                    <p className="text-[12px] text-[#A3A3A3] mt-1">
                      Reported by {r.reporter_email || 'a user'} · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setViewing(r)} className="w-9 h-9 rounded-lg hover:bg-black/5 flex items-center justify-center" title="View"><Eye className="w-4 h-4" /></button>
                    {r.status === 'pending' && (
                      <>
                        <button onClick={() => setReportStatus(r.id, 'dismissed')} className="px-3 py-2 rounded-lg text-[12px] font-bold bg-black/5">Dismiss</button>
                        <button onClick={() => hideReview(r)} className="w-9 h-9 rounded-lg hover:bg-black/5 flex items-center justify-center" title="Hide review"><EyeOff className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteReviewId(r.review_id)} className="w-9 h-9 rounded-lg hover:bg-red-50 flex items-center justify-center" title="Delete review"><Trash2 className="w-4 h-4 text-red-600" /></button>
                      </>
                    )}
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
            <div className="flex justify-between mb-4">
              <h2 className="text-[18px] font-black">Report details</h2>
              <button onClick={() => setViewing(null)} className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-[13px] font-bold text-[#950606] mb-2">{REASON_LABELS[viewing.reason]}</p>
            {viewing.description && <p className="text-[14px] text-[#525252] mb-4">{viewing.description}</p>}
            <div className="p-4 rounded-xl bg-[#FAFAF9] mb-5">
              <p className="text-[12px] text-[#A3A3A3] mb-1">{viewing.university_name} · {viewing.hostel_name} · {viewing.review_overall}/5</p>
              <p className="text-[14px] text-[#404040]">{viewing.review_body || 'Review unavailable'}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <button onClick={() => setReportStatus(viewing.id, 'dismissed')} className="px-4 py-2 rounded-xl text-[13px] font-bold bg-black/5">Dismiss Report</button>
              <button onClick={() => hideReview(viewing)} className="px-4 py-2 rounded-xl text-[13px] font-bold bg-black/5">Hide Review</button>
              <button onClick={() => setDeleteReviewId(viewing.review_id)} className="px-4 py-2 rounded-xl text-[13px] font-bold bg-red-50 text-red-700">Delete Review</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteReviewId}
        title="Delete Review?"
        message="This permanently deletes the reported review."
        confirmLabel="Delete Review"
        onConfirm={handleDeleteReview}
        onCancel={() => setDeleteReviewId(null)}
        loading={working}
      />
    </div>
  );
}
