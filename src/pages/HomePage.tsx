import { useEffect, useState, useRef } from 'react';
import { Search, Star, Shield, Camera, ChevronDown, Building2, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { University, Page } from '../lib/types';
import UniversityCard from '../components/UniversityCard';
import RevealSection from '../components/RevealSection';
import InteractiveButton from '../components/InteractiveButton';
import SpotlightCard from '../components/SpotlightCard';

interface Props {
  onNavigate: (page: Page) => void;
}

const HERO_WORDS = ['WIFI', 'FOOD', 'WATER', 'SAFETY', 'VALUE'];

export default function HomePage({ onNavigate }: Props) {
  const [universities, setUniversities] = useState<University[]>([]);
  const [filtered,     setFiltered]     = useState<University[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [query,        setQuery]        = useState('');
  const [country,      setCountry]      = useState('All');
  const [wordIdx,      setWordIdx]      = useState(0);
  const [wordVisible,  setWordVisible]  = useState(true);
  const heroSearchRef = useRef<HTMLInputElement>(null);

  // Cycling hero word
  useEffect(() => {
    const cycle = () => {
      setWordVisible(false);
      setTimeout(() => {
        setWordIdx(i => (i + 1) % HERO_WORDS.length);
        setWordVisible(true);
      }, 350);
    };
    const id = setInterval(cycle, 2200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { fetchUniversities(); }, []);

  useEffect(() => {
    const q = query.toLowerCase();
    setFiltered(
      universities.filter(u =>
        (country === 'All' || u.country === country) &&
        (u.name.toLowerCase().includes(q) ||
         u.location.toLowerCase().includes(q) ||
         u.short_name.toLowerCase().includes(q))
      )
    );
  }, [query, country, universities]);

  async function fetchUniversities() {
    setLoading(true);
    const { data, error } = await supabase.from('universities').select('*').order('name');
    if (error) { setLoading(false); return; }

    const enriched = await Promise.all(
      (data || []).map(async (uni) => {
        const { data: hostels } = await supabase
          .from('hostels').select('id').eq('university_id', uni.id);
        const hostelIds = (hostels || []).map(h => h.id);
        let avgOverall = 0;
        if (hostelIds.length) {
          const { data: revs } = await supabase
            .from('reviews').select('overall').in('hostel_id', hostelIds);
          if (revs?.length) avgOverall = revs.reduce((s, r) => s + r.overall, 0) / revs.length;
        }
        return { ...uni, hostel_count: hostelIds.length, avg_overall: avgOverall } as University;
      })
    );
    setUniversities(enriched);
    setFiltered(enriched);
    setLoading(false);
  }

  const countries    = ['All', ...Array.from(new Set(universities.map(u => u.country)))];
  const totalHostels = universities.reduce((s, u) => s + (u.hostel_count || 0), 0);

  const scrollToUniversities = () => {
    document.getElementById('universities')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="overflow-x-hidden">

      {/* ─── HERO ─────────────────────────────────── */}
      <section className="spotlight relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-10 overflow-hidden bg-[#FAFAF9]">

        {/* Ambient blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-1/3 right-0 w-[600px] h-[600px] rounded-full opacity-[0.35]"
            style={{
              background: 'radial-gradient(circle, rgba(149,6,6,0.07) 0%, transparent 70%)',
              transform: 'translate(30%, -30%)',
            }}
          />
          <div
            className="absolute bottom-1/4 left-0 w-[500px] h-[500px] rounded-full opacity-[0.3]"
            style={{
              background: 'radial-gradient(circle, rgba(149,6,6,0.05) 0%, transparent 70%)',
              transform: 'translate(-30%, 30%)',
            }}
          />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: 'linear-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">

          {/* Eyebrow badge */}
          <div
            className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full text-[13px] font-semibold"
            style={{
              background: 'rgba(149,6,6,0.06)',
              border: '1px solid rgba(149,6,6,0.12)',
              color: '#950606',
              opacity: 0,
              animation: 'slideUp 0.7s 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Real reviews from real students
            <span className="w-1.5 h-1.5 rounded-full bg-[#950606] animate-pulse" />
          </div>

          {/* Main headline */}
          <div
            style={{
              opacity: 0,
              animation: 'slideUp 0.8s 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
            }}
          >
            <h1
              className="font-black tracking-[-0.05em] text-[#0A0A0A] leading-[0.95]"
              style={{ fontSize: 'clamp(3.8rem, 10vw, 9rem)' }}
            >
              RATE
            </h1>
            <h1
              className="font-black tracking-[-0.05em] text-[#950606] leading-[0.95]"
              style={{ fontSize: 'clamp(3.8rem, 10vw, 9rem)' }}
            >
              MY ROOM
            </h1>
          </div>

          {/* Subtitle with cycling word */}
          <div
            className="mt-7 mb-10"
            style={{
              opacity: 0,
              animation: 'slideUp 0.8s 0.55s cubic-bezier(0.16,1,0.3,1) forwards',
            }}
          >
            <p className="text-xl md:text-2xl font-medium text-[#525252] leading-relaxed max-w-2xl mx-auto">
              Check{' '}
              <span
                className="inline-block font-black text-[#950606] min-w-[4.5ch] text-center"
                style={{
                  opacity:    wordVisible ? 1 : 0,
                  transform:  wordVisible ? 'translateY(0)' : 'translateY(8px)',
                  transition: 'opacity 0.3s ease, transform 0.3s ease',
                }}
              >
                {HERO_WORDS[wordIdx]}
              </span>
              {' '}before you sign your hostel contract.
            </p>
          </div>

          {/* Search bar */}
          <div
            className="max-w-lg mx-auto"
            style={{
              opacity: 0,
              animation: 'slideUp 0.8s 0.65s cubic-bezier(0.16,1,0.3,1) forwards',
            }}
          >
            <div
              className="flex items-center gap-3 p-2 rounded-2xl bg-white"
              style={{
                boxShadow: '0 2px 6px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.07)',
              }}
            >
              <div className="flex-1 flex items-center gap-3 pl-3">
                <Search className="w-[18px] h-[18px] text-gray-400 shrink-0" strokeWidth={2} />
                <input
                  ref={heroSearchRef}
                  type="text"
                  placeholder="Search university or city…"
                  value={query}
                  onChange={e => { setQuery(e.target.value); scrollToUniversities(); }}
                  className="flex-1 bg-transparent text-[15px] font-medium text-gray-800 placeholder-gray-400 focus:outline-none py-2"
                />
              </div>
              <button
                onClick={scrollToUniversities}
                className="btn-primary px-6 py-3 text-[14px] rounded-xl gap-1.5 shrink-0"
              >
                Explore
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Trust badges */}
          <div
            className="flex flex-wrap items-center justify-center gap-4 mt-8"
            style={{
              opacity: 0,
              animation: 'slideUp 0.8s 0.75s cubic-bezier(0.16,1,0.3,1) forwards',
            }}
          >
            {[
              'Free to browse',
              'No sign-up required',
              'Student-verified reviews',
            ].map(text => (
              <div key={text} className="flex items-center gap-1.5 text-[13px] font-medium text-[#737373]">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <button
          onClick={scrollToUniversities}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <span className="text-[11px] font-bold text-gray-500 tracking-[0.12em] uppercase">Scroll</span>
          <div className="w-6 h-10 rounded-full border-2 border-gray-400 flex justify-center pt-2">
            <div
              className="w-1 h-2 bg-gray-400 rounded-full"
              style={{ animation: 'float 2s ease-in-out infinite' }}
            />
          </div>
        </button>
      </section>

      {/* ─── STATS TICKER ─────────────────────────── */}
      <RevealSection>
        <section className="border-y overflow-hidden" style={{ borderColor: 'rgba(0,0,0,0.07)', background: '#fff' }}>
          <div className="container-xl py-10">
            <div className="grid grid-cols-3 gap-4 md:gap-8 text-center">
              {[
                { value: universities.length, suffix: '+', label: 'Universities' },
                { value: totalHostels,        suffix: '+', label: 'Hostels listed' },
                { value: 100,                 suffix: '%', label: 'Student powered' },
              ].map(({ value, suffix, label }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <span className="stat-number text-[#950606]">
                    {value}{suffix}
                  </span>
                  <span className="text-[13px] font-medium text-[#737373] text-balance">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ─── HOW IT WORKS ─────────────────────────── */}
      <section id="how-it-works" className="section-pad bg-[#FAFAF9]">
        <div className="container-xl">
          <RevealSection className="text-center mb-16">
            <p className="text-[13px] font-bold text-[#950606] tracking-[0.1em] uppercase mb-4">Process</p>
            <h2
              className="font-black tracking-[-0.04em] text-[#0A0A0A] mb-4"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}
            >
              HOW IT <span className="text-[#950606]">WORKS</span>
            </h2>
            <p className="text-[17px] text-[#737373] max-w-lg mx-auto leading-relaxed font-medium">
              Simple, transparent, and completely student-powered.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Search,
                step: '01',
                title: 'Find Your University',
                desc: 'Browse our list of universities and explore their available hostels with full details.',
                delay: 0,
              },
              {
                icon: Star,
                step: '02',
                title: 'Read Honest Reviews',
                desc: 'See ratings on cleanliness, WiFi, food, water, security and value from real students.',
                delay: 100,
              },
              {
                icon: Camera,
                step: '03',
                title: 'Share Your Experience',
                desc: 'Sign in with Google and write your review — with photos — to help future students decide.',
                delay: 200,
              },
            ].map(({ icon: Icon, step, title, desc, delay }) => (
              <RevealSection key={step} delay={delay} variant="scale">
                <SpotlightCard className="p-7 h-full group cursor-default">
                  <div className="relative z-10 flex items-start justify-between mb-5">
                    <div
                      className="w-11 h-11 rounded-[14px] flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                      style={{ background: 'rgba(149,6,6,0.08)' }}
                    >
                      <Icon className="w-5 h-5 text-[#950606]" strokeWidth={2} />
                    </div>
                    <span
                      className="text-5xl font-black tracking-[-0.05em] leading-none select-none transition-colors duration-300 group-hover:text-[#950606]/15"
                      style={{ color: 'rgba(0,0,0,0.06)' }}
                    >
                      {step}
                    </span>
                  </div>
                  <h3 className="relative z-10 text-[17px] font-black text-[#0A0A0A] mb-2.5 tracking-[-0.02em]">{title}</h3>
                  <p className="relative z-10 text-[14.5px] text-[#737373] leading-relaxed">{desc}</p>
                </SpotlightCard>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── UNIVERSITIES GRID ────────────────────── */}
      <section id="universities" className="section-pad bg-white">
        <div className="container-xl">
          {/* Header + filters */}
          <RevealSection className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-[13px] font-bold text-[#950606] tracking-[0.1em] uppercase mb-3">Browse</p>
              <h2
                className="font-black tracking-[-0.04em] text-[#0A0A0A] mb-2"
                style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}
              >
                <span className="text-[#950606]">{filtered.length}</span> UNIVERSIT{filtered.length === 1 ? 'Y' : 'IES'}
              </h2>
              <p className="text-[15px] text-[#737373] font-medium">
                Select a university to see hostels and student reviews
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Country filter */}
              <div className="relative">
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="appearance-none bg-white text-[14px] font-semibold text-[#404040] border rounded-xl px-4 py-2.5 pr-8 cursor-pointer focus:outline-none transition-all"
                  style={{ borderColor: 'rgba(0,0,0,0.1)' }}
                >
                  {countries.map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="bg-white text-[14px] font-medium text-gray-700 border rounded-xl pl-9 pr-4 py-2.5 w-44 transition-all focus:outline-none"
                  style={{ borderColor: 'rgba(0,0,0,0.1)' }}
                />
              </div>
            </div>
          </RevealSection>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-72 rounded-[20px]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <RevealSection className="text-center py-24">
              <Building2 className="w-14 h-14 mx-auto mb-4" style={{ color: 'rgba(0,0,0,0.1)' }} />
              <h3 className="text-xl font-black text-[#A3A3A3] mb-1">No universities found</h3>
              <p className="text-[14px] text-[#A3A3A3]">Try adjusting your search or filter</p>
            </RevealSection>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((uni, i) => (
                <RevealSection key={uni.id} delay={Math.min(i * 60, 300)} variant="scale">
                  <UniversityCard
                    university={uni}
                    onClick={() => onNavigate({ name: 'university', slug: uni.slug })}
                  />
                </RevealSection>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────── */}
      <RevealSection>
        <section
          className="section-pad relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0A0A0A 0%, #1a0202 50%, #0A0A0A 100%)',
          }}
        >
          {/* Crimson glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 opacity-30 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(149,6,6,0.6) 0%, transparent 70%)' }}
          />

          <div className="container-lg text-center relative z-10">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-white/8 border border-white/10 text-[13px] font-semibold text-white/60">
              <Shield className="w-3.5 h-3.5" />
              Pay it forward
            </div>
            <h2
              className="font-black tracking-[-0.04em] text-white mb-5"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
            >
              HELPED BY A<br />
              <span className="text-[#950606]">REVIEW?</span>
            </h2>
            <p className="text-[17px] text-white/50 mb-10 max-w-md mx-auto leading-relaxed font-medium">
              Share your honest experience and help the next student make the right choice before they commit.
            </p>
            <InteractiveButton
              variant="secondary"
              size="lg"
              onClick={() => {
                document.getElementById('universities')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Write a Review
              <ArrowRight className="w-[18px] h-[18px]" />
            </InteractiveButton>
          </div>
        </section>
      </RevealSection>

      {/* ─── FOOTER ──────────────────────────────── */}
      <footer className="bg-[#0A0A0A] py-10">
        <div className="container-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#950606] rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-black text-[16px] tracking-[-0.03em] text-white">
                Rate<span className="text-[#950606]">MyRoom</span>
              </span>
            </div>

            <p className="text-[13px] text-white/25 text-center leading-relaxed">
              Made by Yr Nav 
            </p>

            <p className="text-[12px] text-white/20">© {new Date().getFullYear()} RateMyRoom</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
