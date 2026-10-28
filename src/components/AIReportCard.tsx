import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, ThumbsUp, AlertTriangle } from 'lucide-react';
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
const STALE_AFTER = 5;

export default function AIReportCard({ hostelId, reviewCount }: Props) {
  const [row, setRow]         = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady]     = useState(false);
  const [error, setError]     = useState('');

  // Read cached report straight from the table. No Gemini call.
  useEffect(() => {
    let alive = true;
    setReady(false);
    setError('');
    supabase
      .from('hostel_ai_reports')
      .select('report,review_count,generated_at')
      .eq('hostel_id', hostelId)
      .maybeSingle()
      .then(
        ({ data, error: fetchErr }) => {
          if (!alive) return;
          if (fetchErr) {
            console.error('Error fetching cached AI report:', fetchErr);
          }
          setRow((data as Row) ?? null);
          setReady(true);
        },
        (err: unknown) => {
          if (!alive) return;
          console.error('AI report cache fetch failed:', err);
          setReady(true);
        }
      );
    return () => { alive = false; };
  }, [hostelId]);

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase.functions.invoke('hostel-ai-report', {
        body: { hostel_id: hostelId },
      });

      if (err) {
        let msg = 'Could not generate report. Try again later.';
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
        setError(data?.error || 'Could not generate report. Try again later.');
      } else {
        setRow(data as Row);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not generate report. Try again later.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (reviewCount < MIN_REVIEWS) return null;

  if (!ready) {
    return (
      <div
        className="bg-white rounded-[20px] p-6 animate-pulse"
        style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-black/[0.04]"
            />
            <div className="space-y-1.5">
              <div className="h-4 w-36 bg-black/[0.08] rounded" />
              <div className="h-3 w-48 bg-black/[0.04] rounded" />
            </div>
          </div>
          <div className="h-9 w-32 bg-black/[0.06] rounded-xl" />
        </div>
        <div className="h-4 w-3/4 bg-black/[0.04] rounded" />
      </div>
    );
  }

  const stale = row ? reviewCount - row.review_count >= STALE_AFTER : false;
  const r = row?.report;

  return (
    <div
      className="bg-white rounded-[20px] p-6"
      style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(149,6,6,0.08)' }}
          >
            <Sparkles className="w-[18px] h-[18px]" style={{ color: '#950606' }} />
          </div>
          <div>
            <h3 className="text-[15px] font-black text-[#0A0A0A] tracking-[-0.02em]">AI Review Summary</h3>
            <p className="text-[12px] text-[#A3A3A3] font-medium">
              Based on {row?.review_count ?? reviewCount} student reviews
            </p>
          </div>
        </div>

        {(!row || stale) && (
          <button
            onClick={generate}
            disabled={loading}
            className="btn-primary px-4 py-2 text-[13px] flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analysing…' : row ? 'Update Summary' : 'Generate Summary'}
          </button>
        )}
      </div>

      {error && <p className="text-[13px] text-[#dc2626] font-medium mb-3">{error}</p>}

      {!r && !loading && !error && (
        <p className="text-[13.5px] text-[#737373]">
          Get a short AI analysis of what students say about this hostel.
        </p>
      )}

      {loading && !r && (
        <div className="py-2 space-y-2">
          <p className="text-[13.5px] text-[#737373] flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#950606]" />
            Analyzing reviews and generating summary with Gemini…
          </p>
        </div>
      )}

      {r && (
        <div className="space-y-5">
          <p className="text-[14.5px] text-[#525252] leading-relaxed">{r.summary}</p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl p-4" style={{ background: 'rgba(220,38,38,0.06)' }}>
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUp className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />
                <span className="text-[12px] font-black uppercase tracking-wide" style={{ color: '#16a34a' }}>
                  Strengths
                </span>
              </div>
              <ul className="space-y-1.5">
                {r.strengths.map((s, i) => (
                  <li key={i} className="text-[13.5px] text-[#525252]">• {s}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'rgba(220,38,38,0.06)' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#dc2626' }} />
                <span className="text-[12px] font-black uppercase tracking-wide" style={{ color: '#dc2626' }}>
                  Concerns
                </span>
              </div>
              <ul className="space-y-1.5">
                {r.concerns.map((s, i) => (
                  <li key={i} className="text-[13.5px] text-[#525252]">• {s}</li>
                ))}
              </ul>
            </div>
          </div>

          {r.categories.length > 0 && (
            <div className="space-y-2">
              {r.categories.map(c => (
                <div key={c.name} className="flex gap-3 text-[13.5px]">
                  <span className="w-24 shrink-0 font-bold text-[#0A0A0A]">{c.name}</span>
                  <span className="text-[#737373]">{c.note}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-[#A3A3A3] font-medium">
            AI-generated from reviews. May contain mistakes.
          </p>
        </div>
      )}
    </div>
  );
}
