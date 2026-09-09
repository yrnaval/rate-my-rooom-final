import { useEffect, useState } from 'react';
import { ArrowLeft, Star, MessageSquare, Home, PenLine, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Hostel, Review, University, Page } from '../lib/types';
import ReviewCard from '../components/ReviewCard';
import ReviewForm from '../components/ReviewForm';
import RatingBar from '../components/RatingBar';
import RevealSection from '../components/RevealSection';

interface Props {
  hostelId: string;
  universitySlug: string;
  onNavigate: (page: Page) => void;
  onLoginRequired: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  male: 'Male Only', female: 'Female Only', mixed: 'Mixed',
};

export default function HostelPage({ hostelId, universitySlug, onNavigate, onLoginRequired }: Props) {
  const [hostel,     setHostel]     = useState<Hostel | null>(null);
  const [university, setUniversity] = useState<University | null>(null);
  const [reviews,    setReviews]    = useState<Review[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);

  useEffect(() => { fetchData(); }, [hostelId]);

  async function fetchData() {
    setLoading(true);
    const { data: h } = await supabase
      .from('hostels').select('*').eq('id', hostelId).maybeSingle();
    if (!h) { setLoading(false); return; }
    setHostel(h as Hostel);

    const { data: uni } = await supabase
      .from('universities').select('*').eq('id', h.university_id).maybeSingle();
    if (uni) setUniversity(uni as University);

    await fetchReviews(h);
    setLoading(false);
  }

  async function fetchReviews(h?: Hostel) {
    const target = h || hostel;
    if (!target) return;

    const { data: revData } = await supabase
      .from('reviews').select('*').eq('hostel_id', target.id)
      .order('created_at', { ascending: false });
    if (!revData) return;

    const withPhotos = await Promise.all(
      revData.map(async (r) => {
        const { data: photos } = await supabase
          .from('review_photos').select('*').eq('review_id', r.id);
        return { ...r, photos: photos || [] };
      })
    );
    setReviews(withPhotos as Review[]);

    if (revData.length > 0) {
      const avg = (key: string) =>
        revData.reduce((s: number, r: Record<string, number>) => s + (r[key] || 0), 0) / revData.length;
      setHostel(prev => prev ? {
        ...prev,
        review_count:    revData.length,
        avg_overall:     avg('overall'),
        avg_cleanliness: avg('cleanliness'),
        avg_wifi:        avg('wifi'),
        avg_food:        avg('food'),
        avg_water:       avg('water'),
        avg_security:    avg('security'),
        avg_facilities:  avg('facilities'),
        avg_value:       avg('value'),
      } : prev);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20" style={{ background: 'var(--color-bg)' }}>
        <div className="container-lg py-10 space-y-5">
          <div className="skeleton h-64 rounded-[20px]" />
          <div className="skeleton h-44 rounded-[20px]" />
          <div className="skeleton h-64 rounded-[20px]" />
        </div>
      </div>
    );
  }

  if (!hostel) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center">
          <h2 className="text-2xl font-black text-[#0A0A0A] mb-3">Hostel Not Found</h2>
          <button onClick={() => onNavigate({ name: 'home' })} className="text-[#950606] font-bold hover:underline">
            ← Back to home
          </button>
        </div>
      </div>
    );
  }

  const avg   = hostel.avg_overall ?? 0;
  const count = hostel.review_count ?? 0;

  const ratingBars = [
    { label: 'Cleanliness', value: hostel.avg_cleanliness ?? 0 },
    { label: 'WiFi',        value: hostel.avg_wifi        ?? 0 },
    { label: 'Food',        value: hostel.avg_food        ?? 0 },
    { label: 'Water',       value: hostel.avg_water       ?? 0 },
    { label: 'Security',    value: hostel.avg_security    ?? 0 },
    { label: 'Facilities',  value: hostel.avg_facilities  ?? 0 },
    { label: 'Value',       value: hostel.avg_value       ?? 0 },
  ].filter(r => r.value > 0);

  const overallScore = avg >= 4 ? 'Excellent' : avg >= 3 ? 'Good' : avg >= 2 ? 'Average' : 'Poor';
  const scoreColor   = avg >= 4 ? '#16a34a'   : avg >= 3 ? '#d97706'  : '#dc2626';

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Hero */}
      <div className="relative h-[240px] md:h-[320px] bg-[#0A0A0A] overflow-hidden">
        {hostel.cover_image_url ? (
          <img
            src={hostel.cover_image_url}
            alt={hostel.name}
            className="w-full h-full object-cover opacity-45"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: 'linear-gradient(135deg, #1a0202, #0A0A0A)' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent" />

        <div className="absolute inset-0 container-lg flex flex-col justify-end pb-7 pt-24">
          <button
            onClick={() => onNavigate({ name: 'university', slug: universitySlug })}
            className="flex items-center gap-2 text-white/50 hover:text-white/90 text-[13px] font-semibold mb-4 transition-colors group w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            {university?.short_name || 'University'}
          </button>

          <div className="flex items-start gap-3.5">
            <div
              className="w-11 h-11 bg-[#950606] rounded-xl flex items-center justify-center shrink-0"
              style={{ boxShadow: '0 4px 16px rgba(149,6,6,0.4)' }}
            >
              <Home className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1
                  className="font-black text-white tracking-[-0.03em] leading-tight"
                  style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)' }}
                >
                  {hostel.name}
                </h1>
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-md text-white/70"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                  {TYPE_LABELS[hostel.type]}
                </span>
              </div>
              {avg > 0 && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <Star
                        key={s}
                        className="w-3.5 h-3.5"
                        style={{ fill: s <= Math.round(avg) ? '#f59e0b' : 'rgba(255,255,255,0.15)', color: s <= Math.round(avg) ? '#f59e0b' : 'rgba(255,255,255,0.15)' }}
                      />
                    ))}
                  </div>
                  <span className="text-[13px] font-bold text-white">{avg.toFixed(1)}</span>
                  <span className="text-[12px] text-white/40 font-medium">({count} reviews)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container-lg py-8 space-y-6">

        {/* Rating summary card */}
        {count > 0 && (
          <RevealSection>
            <div
              className="bg-white rounded-[20px] p-6"
              style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="flex flex-col md:flex-row gap-6">
                {/* Big score */}
                <div
                  className="flex flex-col items-center justify-center text-center p-5 rounded-2xl shrink-0 md:w-[140px]"
                  style={{ background: `${scoreColor}0d` }}
                >
                  <span
                    className="text-[52px] font-black leading-none mb-1"
                    style={{ color: scoreColor }}
                  >
                    {avg.toFixed(1)}
                  </span>
                  <div className="flex items-center gap-0.5 mb-1.5">
                    {[1,2,3,4,5].map(s => (
                      <Star
                        key={s}
                        className="w-3 h-3"
                        style={{ fill: s <= Math.round(avg) ? scoreColor : '#e5e7eb', color: s <= Math.round(avg) ? scoreColor : '#e5e7eb' }}
                      />
                    ))}
                  </div>
                  <span className="text-[12px] font-bold" style={{ color: scoreColor }}>{overallScore}</span>
                  <span className="text-[11px] text-[#A3A3A3] mt-1 font-medium">
                    {count} review{count !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Category bars */}
                <div className="flex-1 space-y-3 justify-center flex flex-col">
                  {ratingBars.map(r => (
                    <RatingBar key={r.label} label={r.label} value={r.value} />
                  ))}
                </div>
              </div>
            </div>
          </RevealSection>
        )}

        {/* Description */}
        {hostel.description && (
          <RevealSection>
            <div
              className="bg-white rounded-[20px] p-6"
              style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: 'var(--shadow-sm)' }}
            >
              <h3 className="text-[15px] font-black text-[#0A0A0A] mb-2.5 tracking-[-0.02em]">About This Hostel</h3>
              <p className="text-[14.5px] text-[#525252] leading-relaxed">{hostel.description}</p>
            </div>
          </RevealSection>
        )}

        {/* Write review panel */}
        <RevealSection>
          <div
            className="bg-white rounded-[20px] overflow-hidden"
            style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: 'var(--shadow-sm)' }}
          >
            <button
              onClick={() => setShowForm(!showForm)}
              className="w-full flex items-center justify-between p-6 hover:bg-black/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: showForm ? '#950606' : 'rgba(149,6,6,0.08)', transition: 'background 0.3s ease' }}
                >
                  <PenLine
                    className="w-[18px] h-[18px] transition-colors duration-200"
                    style={{ color: showForm ? '#fff' : '#950606' }}
                  />
                </div>
                <div className="text-left">
                  <p className="text-[15px] font-black text-[#0A0A0A] tracking-[-0.02em]">Write a Review</p>
                  <p className="text-[12.5px] text-[#A3A3A3] font-medium mt-0.5">
                    Help fellow students make informed choices
                  </p>
                </div>
              </div>
              <ChevronUp
                className="w-5 h-5 text-gray-400 transition-transform duration-300"
                style={{ transform: showForm ? 'rotate(0deg)' : 'rotate(180deg)' }}
              />
            </button>

            {/* Form */}
            <div
              style={{
                maxHeight:  showForm ? '2000px' : '0',
                overflow:   'hidden',
                transition: 'max-height 0.5s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              <div className="px-6 pb-6 pt-0">
                <div className="h-px bg-black/5 mb-6" />
                <ReviewForm
                  hostelId={hostelId}
                  onSuccess={() => {
                    setShowForm(false);
                    fetchReviews();
                  }}
                  onLoginRequired={onLoginRequired}
                />
              </div>
            </div>
          </div>
        </RevealSection>

        {/* Reviews list */}
        <RevealSection>
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <MessageSquare className="w-[18px] h-[18px] text-[#950606]" />
              <h2 className="text-[19px] font-black text-[#0A0A0A] tracking-[-0.02em]">
                {count} {count === 1 ? 'Review' : 'Reviews'}
              </h2>
            </div>

            {reviews.length === 0 ? (
              <div
                className="bg-white rounded-[20px] p-12 text-center"
                style={{ border: '1.5px dashed rgba(0,0,0,0.1)' }}
              >
                <MessageSquare className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(0,0,0,0.1)' }} />
                <h3 className="font-black text-[#A3A3A3] text-lg mb-1">No Reviews Yet</h3>
                <p className="text-[13.5px] text-[#A3A3A3] mb-5 font-medium">
                  Be the first to review this hostel!
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="btn-primary px-6 py-2.5 text-[14px]"
                >
                  Write the First Review
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((r, i) => (
                  <RevealSection key={r.id} delay={Math.min(i * 50, 200)}>
                    <ReviewCard review={r} onLoginRequired={onLoginRequired} />
                  </RevealSection>
                ))}
              </div>
            )}
          </div>
        </RevealSection>
      </div>
    </div>
  );
}
