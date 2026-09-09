import { useRef, useState, useCallback } from 'react';
import { Star, Calendar, User, Camera, Flag, X } from 'lucide-react';
import { Review } from '../lib/types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  review: Review;
  onLoginRequired?: () => void;
}

const REPORT_REASONS = [
  ['fake', 'Fake Review'],
  ['spam', 'Spam'],
  ['offensive', 'Offensive Content'],
  ['wrong_hostel', 'Wrong Hostel'],
  ['personal_info', 'Personal Information'],
  ['other', 'Other'],
] as const;

const CATEGORIES: { key: keyof Review; label: string }[] = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'wifi',        label: 'WiFi' },
  { key: 'food',        label: 'Food' },
  { key: 'water',       label: 'Water' },
  { key: 'security',    label: 'Security' },
  { key: 'facilities',  label: 'Facilities' },
  { key: 'value',       label: 'Value' },
];

function MiniStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star
          key={s}
          className="w-2.5 h-2.5"
          style={{
            fill:  s <= value ? '#950606' : '#e5e7eb',
            color: s <= value ? '#950606' : '#e5e7eb',
          }}
        />
      ))}
    </div>
  );
}

export default function ReviewCard({ review, onLoginRequired }: Props) {
  const { user } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50, isHovered: false });
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number][0]>('fake');
  const [description, setDescription] = useState('');
  const [reportError, setReportError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSpotlight({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
      isHovered: true,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setSpotlight(prev => ({ ...prev, isHovered: false }));
  }, []);

  const displayName = review.user_name || review.reviewer_name || 'Anonymous';
  const avatar      = review.user_avatar || review.reviewer_avatar;
  const body        = review.comment || review.body;
  const date = new Date(review.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  const overallColor =
    review.overall >= 4 ? '#16a34a' :
    review.overall >= 3 ? '#d97706' : '#dc2626';

  const openReport = () => {
    if (!user) {
      onLoginRequired?.();
      return;
    }
    setReportError(null);
    setShowReport(true);
  };

  const submitReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setReporting(true);
    setReportError(null);
    const { error } = await supabase.from('review_reports').insert({
      review_id: review.id,
      reported_by: user.id,
      reason,
      description: description.trim() || null,
    });
    setReporting(false);

    if (error) {
      setReportError(error.code === '23505'
        ? 'You have already reported this review.'
        : 'Could not send your report. Please try again.');
      return;
    }

    setReported(true);
    setShowReport(false);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="spotlight-panel relative rounded-[20px] p-6 transition-all duration-400 ease-out group"
      style={{
        background: '#fff',
        border: `1px solid ${spotlight.isHovered ? 'rgba(149,6,6,0.12)' : 'rgba(0,0,0,0.07)'}`,
        boxShadow: spotlight.isHovered
          ? '0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.06), 0 12px 40px rgba(149,6,6,0.04)'
          : 'var(--shadow-sm)',
        transform: spotlight.isHovered ? 'translateY(-3px) scale(1.012)' : 'translateY(0) scale(1)',
        '--spotlight-x': `${spotlight.x}%`,
        '--spotlight-y': `${spotlight.y}%`,
        '--spotlight-opacity': spotlight.isHovered ? 1 : 0,
      } as React.CSSProperties}
    >
      {/* Header row */}
      <div className="relative z-10 flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {avatar ? (
            <img
              src={avatar}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-black/5"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(149,6,6,0.08)' }}
            >
              <User className="w-5 h-5 text-[#950606]" />
            </div>
          )}
          <div>
            <p className="text-[14px] font-bold text-[#0A0A0A]">{displayName}</p>
            {review.stay_period && (
              <p className="text-[12px] text-[#A3A3A3] font-medium">{review.stay_period}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* Overall score pill */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-black"
            style={{ background: `${overallColor}14`, color: overallColor }}
          >
            <Star className="w-3 h-3" style={{ fill: overallColor, color: overallColor }} />
            {review.overall}<span style={{ opacity: 0.6 }}>/5</span>
          </div>
          {/* Date */}
          <div className="flex items-center gap-1 text-[11px] text-[#A3A3A3] font-medium">
            <Calendar className="w-3 h-3" />
            {date}
          </div>
        </div>
      </div>

      {/* Review body */}
      {body && (
        <blockquote
          className="relative z-10 text-[14.5px] text-[#404040] leading-relaxed mb-4 pl-3"
          style={{ borderLeft: '2px solid rgba(149,6,6,0.2)', fontStyle: 'italic' }}
        >
          {body}
        </blockquote>
      )}

      {/* Category ratings grid */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
        {CATEGORIES.map(({ key, label }) => {
          const val = review[key] as number | null;
          if (val == null) return null;
          return (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-[12px] text-[#A3A3A3] font-medium w-16 shrink-0">{label}</span>
              <MiniStars value={val} />
            </div>
          );
        })}
      </div>

      {/* Photos */}
      {review.photos && review.photos.length > 0 && (
        <div
          className="relative z-10 flex gap-2 flex-wrap pt-3.5"
          style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-1.5 w-full mb-1.5 text-[12px] font-semibold text-[#A3A3A3]">
            <Camera className="w-3.5 h-3.5" />
            {review.photos.length} photo{review.photos.length > 1 ? 's' : ''}
          </div>
          {review.photos.map((photo) => {
            const src = photo.photo_url || photo.url;
            if (!src) return null;
            return (
              <button
                key={photo.id}
                onClick={() => window.open(src, '_blank')}
                className="group/photo relative overflow-hidden rounded-xl w-[72px] h-[72px] bg-gray-100 transition-all duration-300 hover:scale-105"
                style={{ border: '1.5px solid rgba(0,0,0,0.07)' }}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}

      <div className="relative z-10 flex justify-end pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        {reported ? (
          <span className="text-[12px] font-semibold text-[#737373]">Report submitted</span>
        ) : (
          <button
            type="button"
            onClick={openReport}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#737373] hover:text-[#950606] transition-colors"
          >
            <Flag className="w-3.5 h-3.5" />
            Report review
          </button>
        )}
      </div>

      {showReport && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/40" aria-label="Close report dialog" onClick={() => setShowReport(false)} />
          <form onSubmit={submitReport} className="relative w-full max-w-[440px] rounded-[20px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-[18px] font-black text-[#0A0A0A]">Report review</h3>
                <p className="text-[13px] text-[#737373] mt-1">Tell us what needs attention. Our team will review it.</p>
              </div>
              <button type="button" onClick={() => setShowReport(false)} className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center" aria-label="Close report dialog">
                <X className="w-4 h-4 text-[#737373]" />
              </button>
            </div>
            <label className="block text-[13px] font-bold text-[#0A0A0A] mb-1.5">Reason</label>
            <select value={reason} onChange={event => setReason(event.target.value as typeof reason)} className="w-full rounded-xl px-3 py-2.5 text-[14px] border bg-[#FAFAF9] mb-4" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
              {REPORT_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label className="block text-[13px] font-bold text-[#0A0A0A] mb-1.5">Details <span className="font-normal text-[#A3A3A3]">(optional)</span></label>
            <textarea value={description} onChange={event => setDescription(event.target.value)} rows={3} maxLength={1000} placeholder="Add context to help the review team…" className="w-full rounded-xl px-3 py-2.5 text-[14px] border bg-[#FAFAF9] resize-none" style={{ borderColor: 'rgba(0,0,0,0.1)' }} />
            {reportError && <p className="mt-3 text-[13px] font-medium text-red-700">{reportError}</p>}
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setShowReport(false)} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#525252] hover:bg-black/5">Cancel</button>
              <button type="submit" disabled={reporting} className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#950606] disabled:opacity-60">{reporting ? 'Sending…' : 'Send report'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
