import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, ThumbsUp, AlertTriangle, Clock, Info, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Report {
  summary: string;
  strengths: string[];
  concerns: string[];
  categories: { name: string; note: string }[];
}

interface Row {
  report: Report;
  review_count: number;
  generated_at: string;
}

interface Props {
  hostelId: string;
  reviewCount: number;
}

const MIN_REVIEWS = 3;

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AIReportCard({ hostelId, reviewCount }: Props) {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [isFreshlyGenerated, setIsFreshlyGenerated] = useState(false);

  // Read the latest saved report straight from the table on mount or hostelId change.
  // NEVER calls Gemini or the Edge Function automatically.
  useEffect(() => {
    let alive = true;
    setReady(false);
    setError('');
    setIsFreshlyGenerated(false);

    supabase
      .from('hostel_ai_reports')
      .select('report,review_count,generated_at')
      .eq('hostel_id', hostelId)
      .maybeSingle()
      .then(
        ({ data, error: fetchErr }) => {
          if (!alive) return;
          if (fetchErr) {
            console.warn('Error reading saved AI report:', fetchErr.message);
          }
          setRow((data as Row) ?? null);
          setReady(true);
        },
        (err: unknown) => {
          if (!alive) return;
          console.warn('Network error reading saved AI report:', err);
          setReady(true);
        }
      );

    return () => {
      alive = false;
    };
  }, [hostelId]);

  // Invoked ONLY when user explicitly clicks "Create AI Summary"
  async function handleCreateSummary() {
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const { data, error: err } = await supabase.functions.invoke('hostel-ai-report', {
        body: { hostel_id: hostelId },
      });

      if (err) {
        let msg = 'Could not generate report. Please try again.';
        if ('context' in err && (err as { context?: unknown }).context instanceof Response) {
          try {
            const body = await ((err as { context: Response }).context.clone().json());
            if (body?.error) msg = body.error;
          } catch (parseErr) {
            console.warn('Could not parse error response:', parseErr);
          }
        } else if (err.message) {
          msg = err.message;
        }
        setError(msg);
      } else if (!data || data.error) {
        setError(data?.error || 'Could not generate report. Please try again.');
      } else {
        setRow(data as Row);
        setIsFreshlyGenerated(true);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not generate report. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const hasEnoughReviews = reviewCount >= MIN_REVIEWS;
  const r = row?.report;

  // While checking the database for an existing saved report
  if (!ready) {
    return (
      <div
        className="bg-white rounded-[20px] p-6 animate-pulse"
        style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black/[0.04]" />
            <div className="space-y-1.5">
              <div className="h-4 w-36 bg-black/[0.08] rounded" />
              <div className="h-3 w-52 bg-black/[0.04] rounded" />
            </div>
          </div>
          <div className="h-10 w-36 bg-black/[0.06] rounded-xl" />
        </div>
        <div className="h-4 w-3/4 bg-black/[0.04] rounded" />
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-[20px] p-6 transition-all"
      style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-start gap-3.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: 'rgba(149,6,6,0.08)' }}
          >
            <Sparkles className="w-[18px] h-[18px]" style={{ color: '#950606' }} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[16px] font-black text-[#0A0A0A] tracking-[-0.02em]">
                AI Review Summary
              </h3>
              {row && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/[0.04] text-[#737373] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#16a34a]" />
                  {row.review_count} approved reviews analyzed
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-[#737373] font-medium mt-0.5">
              AI analyzes actual student feedback to synthesize strengths and concerns.
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="shrink-0 self-start sm:self-center">
          <button
            onClick={handleCreateSummary}
            disabled={loading || !hasEnoughReviews}
            title={
              !hasEnoughReviews
                ? `Requires at least ${MIN_REVIEWS} approved reviews`
                : 'Generate a fresh AI summary from current reviews'
            }
            className="btn-primary px-4 py-2.5 text-[13px] font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing reviews…' : 'Create AI Summary'}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-xl p-3.5 mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200/80">
          <AlertTriangle className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#dc2626] font-medium leading-relaxed">{error}</p>
        </div>
      )}

      {/* Loading state while generating */}
      {loading && (
        <div className="py-6 px-4 my-2 rounded-2xl bg-black/[0.02] border border-black/[0.04] space-y-3">
          <div className="flex items-center gap-2.5 text-[13.5px] font-semibold text-[#0A0A0A]">
            <RefreshCw className="w-4 h-4 animate-spin text-[#950606]" />
            <span>Analyzing reviews and generating fresh summary…</span>
          </div>
          <p className="text-[12.5px] text-[#737373]">
            Consulting Gemini AI to identify recurring patterns, category ratings, and student feedback.
          </p>
          <div className="space-y-2 animate-pulse pt-2">
            <div className="h-3.5 bg-black/[0.06] rounded w-full" />
            <div className="h-3.5 bg-black/[0.06] rounded w-5/6" />
            <div className="h-3.5 bg-black/[0.04] rounded w-2/3" />
          </div>
        </div>
      )}

      {/* When fewer than MIN_REVIEWS exist */}
      {!hasEnoughReviews && !loading && (
        <div className="rounded-xl p-4 bg-amber-50/70 border border-amber-200/60 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13.5px] text-amber-900 font-semibold">
              Minimum review requirement
            </p>
            <p className="text-[13px] text-amber-800/90 mt-0.5 leading-relaxed">
              At least {MIN_REVIEWS} approved reviews are required to generate an AI summary. This hostel currently has {reviewCount} approved review{reviewCount === 1 ? '' : 's'}. Be the next student to write a review below!
            </p>
          </div>
        </div>
      )}

      {/* When enough reviews exist, but no report has been generated yet */}
      {hasEnoughReviews && !r && !loading && !error && (
        <div className="rounded-xl p-4 bg-black/[0.02] border border-black/[0.05] text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[13.5px] font-bold text-[#0A0A0A]">
              No summary generated yet
            </p>
            <p className="text-[13px] text-[#737373] mt-0.5">
              This hostel has {reviewCount} approved reviews ready to be analyzed. Click &quot;Create AI Summary&quot; to synthesize them into a concise report.
            </p>
          </div>
        </div>
      )}

      {/* Displaying generated report */}
      {r && !loading && (
        <div className="space-y-5 mt-2">
          {/* Metadata pill / Earlier generation note */}
          <div className="flex items-center gap-2 text-[12px] text-[#737373] bg-black/[0.02] px-3 py-1.5 rounded-lg border border-black/[0.04] flex-wrap">
            <Clock className="w-3.5 h-3.5 text-[#A3A3A3]" />
            <span>
              {isFreshlyGenerated ? 'Just generated now' : `Generated on ${formatTimestamp(row.generated_at)}`}
            </span>
            <span className="text-black/20">•</span>
            <span>Based on {row.review_count} approved reviews</span>
            {!isFreshlyGenerated && (
              <>
                <span className="text-black/20">•</span>
                <span className="text-[#950606] font-medium">Click &quot;Create AI Summary&quot; anytime to run a fresh analysis</span>
              </>
            )}
          </div>

          {/* Executive summary */}
          <p className="text-[14.5px] text-[#333] leading-relaxed font-normal">
            {r.summary}
          </p>

          {/* Strengths & Concerns Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="rounded-2xl p-4" style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.12)' }}>
              <div className="flex items-center gap-2 mb-2.5">
                <ThumbsUp className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />
                <span className="text-[12px] font-black uppercase tracking-wider" style={{ color: '#16a34a' }}>
                  Positive Patterns & Strengths
                </span>
              </div>
              <ul className="space-y-1.5">
                {r.strengths && r.strengths.length > 0 ? (
                  r.strengths.map((s, i) => (
                    <li key={i} className="text-[13.5px] text-[#374151] flex items-start gap-2">
                      <span className="text-[#16a34a] font-bold">•</span>
                      <span>{s}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-[13px] text-[#6b7280]">No specific recurring strengths noted.</li>
                )}
              </ul>
            </div>

            {/* Concerns */}
            <div className="rounded-2xl p-4" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.12)' }}>
              <div className="flex items-center gap-2 mb-2.5">
                <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#dc2626' }} />
                <span className="text-[12px] font-black uppercase tracking-wider" style={{ color: '#dc2626' }}>
                  Concerns & Caveats
                </span>
              </div>
              <ul className="space-y-1.5">
                {r.concerns && r.concerns.length > 0 ? (
                  r.concerns.map((s, i) => (
                    <li key={i} className="text-[13.5px] text-[#374151] flex items-start gap-2">
                      <span className="text-[#dc2626] font-bold">•</span>
                      <span>{s}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-[13px] text-[#6b7280]">No major recurring concerns noted.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Category Notes Breakdown */}
          {r.categories && r.categories.length > 0 && (
            <div className="rounded-2xl p-4 bg-black/[0.02] border border-black/[0.04]">
              <h4 className="text-[12px] font-black uppercase tracking-wider text-[#737373] mb-3">
                Category Breakdown
              </h4>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {r.categories.map((c) => (
                  <div key={c.name} className="flex items-baseline gap-2 text-[13.5px]">
                    <span className="font-bold text-[#0A0A0A] shrink-0 text-[13px]">
                      {c.name}:
                    </span>
                    <span className="text-[#525252] text-[13px]">{c.note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-[11px] text-[#A3A3A3] font-medium pt-1">
            AI-generated summary synthesized strictly from approved student reviews. Always verify critical details independently.
          </p>
        </div>
      )}
    </div>
  );
}
