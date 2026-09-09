import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Building2, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { University, Hostel, Page } from '../lib/types';
import HostelCard from '../components/HostelCard';
import RevealSection from '../components/RevealSection';

interface Props {
  slug: string;
  onNavigate: (page: Page) => void;
}

type TypeFilter = 'all' | 'male' | 'female' | 'mixed';

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all',    label: 'All' },
  { key: 'male',   label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'mixed',  label: 'Mixed' },
];

export default function UniversityPage({ slug, onNavigate }: Props) {
  const [university, setUniversity] = useState<University | null>(null);
  const [hostels,    setHostels]    = useState<Hostel[]>([]);
  const [filtered,   setFiltered]   = useState<Hostel[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState<TypeFilter>('all');

  useEffect(() => { fetchData(); }, [slug]);

  useEffect(() => {
    setFiltered(filter === 'all' ? hostels : hostels.filter(h => h.type === filter));
  }, [filter, hostels]);

  async function fetchData() {
    setLoading(true);
    const { data: uni } = await supabase
      .from('universities').select('*').eq('slug', slug).maybeSingle();
    if (!uni) { setLoading(false); return; }
    setUniversity(uni as University);

    const { data: hostelData } = await supabase
      .from('hostels').select('*').eq('university_id', uni.id).order('name');
    if (!hostelData) { setLoading(false); return; }

    const enriched = await Promise.all(
      hostelData.map(async (h) => {
        const { data: revs } = await supabase
          .from('reviews')
          .select('overall, cleanliness, wifi, food, water, security, value')
          .eq('hostel_id', h.id);
        if (!revs?.length) return { ...h, review_count: 0 } as Hostel;
        const avg = (key: string) =>
          revs.reduce((s: number, r: Record<string, number>) => s + (r[key] || 0), 0) / revs.length;
        return {
          ...h,
          review_count:    revs.length,
          avg_overall:     avg('overall'),
          avg_cleanliness: avg('cleanliness'),
          avg_wifi:        avg('wifi'),
          avg_food:        avg('food'),
          avg_water:       avg('water'),
          avg_security:    avg('security'),
          avg_value:       avg('value'),
        } as Hostel;
      })
    );
    setHostels(enriched);
    setFiltered(enriched);
    setLoading(false);
  }

  const coverImg = university?.cover_image_url || university?.image_url;

  if (loading) {
    return (
      <div className="min-h-screen pt-20" style={{ background: 'var(--color-bg)' }}>
        <div className="container-xl py-10 space-y-6">
          <div className="skeleton h-72 rounded-[20px]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map(i => <div key={i} className="skeleton h-64 rounded-[20px]" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!university) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center">
          <h2 className="text-2xl font-black text-[#0A0A0A] mb-3">University Not Found</h2>
          <button onClick={() => onNavigate({ name: 'home' })} className="text-[#950606] font-bold hover:underline">
            ← Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Hero */}
      <div className="relative h-[280px] md:h-[360px] bg-[#0A0A0A] overflow-hidden">
        {coverImg && (
          <img
            src={coverImg}
            alt={university.name}
            className="w-full h-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />

        <div className="absolute inset-0 container-xl flex flex-col justify-end pb-8 pt-24">
          <button
            onClick={() => onNavigate({ name: 'home' })}
            className="flex items-center gap-2 text-white/50 hover:text-white/90 text-[13px] font-semibold mb-5 transition-colors group w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            All Universities
          </button>

          <div className="flex items-end gap-4">
            <div
              className="w-12 h-12 bg-[#950606] rounded-2xl flex items-center justify-center shrink-0"
              style={{ boxShadow: '0 4px 20px rgba(149,6,6,0.4)' }}
            >
              <span className="font-black text-white text-[13px]">{university.short_name.slice(0, 3)}</span>
            </div>
            <div>
              <h1
                className="font-black text-white tracking-[-0.03em] leading-tight"
                style={{ fontSize: 'clamp(1.6rem, 4vw, 2.5rem)' }}
              >
                {university.name}
              </h1>
              <div className="flex items-center gap-1.5 text-white/50 text-[13px] font-medium mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {university.location}, {university.country}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-xl py-10">
        {university.description && (
          <RevealSection>
            <p className="text-[15px] text-[#525252] leading-relaxed mb-8 max-w-2xl font-medium">
              {university.description}
            </p>
          </RevealSection>
        )}

        {/* Filters row */}
        <RevealSection className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8">
          <div>
            <h2 className="text-[22px] font-black text-[#0A0A0A] tracking-[-0.03em]">
              <span className="text-[#950606]">{filtered.length}</span>{' '}
              Hostel{filtered.length !== 1 ? 's' : ''}
            </h2>
            <p className="text-[13px] text-[#A3A3A3] mt-0.5 font-medium">
              Click any hostel to read reviews
            </p>
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#A3A3A3]" />
            <div
              className="flex gap-1.5 p-1 rounded-xl"
              style={{ background: 'rgba(0,0,0,0.05)' }}
            >
              {TYPE_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className="px-3.5 py-1.5 rounded-lg text-[13px] font-bold capitalize transition-all duration-200"
                  style={{
                    background: filter === key ? '#950606'            : 'transparent',
                    color:      filter === key ? '#fff'               : '#737373',
                    boxShadow:  filter === key ? '0 1px 4px rgba(149,6,6,0.3)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* Grid */}
        {filtered.length === 0 ? (
          <RevealSection className="text-center py-20">
            <Building2 className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(0,0,0,0.1)' }} />
            <h3 className="font-black text-[#A3A3A3] text-lg">No hostels match this filter</h3>
          </RevealSection>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((hostel, i) => (
              <RevealSection key={hostel.id} delay={Math.min(i * 70, 280)} variant="scale">
                <HostelCard
                  hostel={hostel}
                  onClick={() => onNavigate({
                    name: 'hostel',
                    hostelId: hostel.id,
                    universitySlug: slug,
                  })}
                />
              </RevealSection>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
