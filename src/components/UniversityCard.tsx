import { useRef, useState, useCallback } from 'react';
import { MapPin, Star, ArrowUpRight, Building2 } from 'lucide-react';
import { University } from '../lib/types';

interface Props {
  university: University;
  onClick: () => void;
}

export default function UniversityCard({ university, onClick }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50, isHovered: false });

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

  const coverImg = university.cover_image_url || university.image_url;
  const avg      = university.avg_overall ?? 0;
  const count    = university.hostel_count ?? 0;

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="spotlight-card text-left w-full group bg-white rounded-[20px] border transition-all duration-500 ease-out"
      style={{
        borderColor: spotlight.isHovered ? 'rgba(149,6,6,0.15)' : 'rgba(0,0,0,0.07)',
        transform: spotlight.isHovered ? 'translateY(-5px) scale(1.015)' : 'translateY(0) scale(1)',
        boxShadow: spotlight.isHovered
          ? '0 4px 6px rgba(0,0,0,0.03), 0 12px 32px rgba(0,0,0,0.07), 0 20px 48px rgba(149,6,6,0.06)'
          : '0 1px 2px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.04)',
        '--spotlight-x': `${spotlight.x}%`,
        '--spotlight-y': `${spotlight.y}%`,
        '--spotlight-opacity': spotlight.isHovered ? 1 : 0,
      } as React.CSSProperties}
    >
      {/* Image */}
      <div className="relative overflow-hidden rounded-t-[19px] h-48 bg-[#f5f5f4]">
        {coverImg ? (
          <img
            src={coverImg}
            alt={university.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 will-change-transform group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(149,6,6,0.06), rgba(149,6,6,0.02))' }}
          >
            <Building2 className="w-14 h-14" style={{ color: 'rgba(149,6,6,0.2)' }} />
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Short name badge */}
        <div
          className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[12px] font-black text-white transition-transform duration-300 group-hover:scale-105"
          style={{
            background: '#950606',
            boxShadow: '0 2px 8px rgba(149,6,6,0.35)',
          }}
        >
          {university.short_name}
        </div>

        {/* Rating badge */}
        {avg > 0 && (
          <div
            className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg transition-transform duration-300 group-hover:scale-105"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            <span className="text-[12px] font-black text-gray-800">{avg.toFixed(1)}</span>
          </div>
        )}

        {/* Arrow on hover */}
        <div
          className="absolute bottom-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center transition-all duration-300 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
        >
          <ArrowUpRight className="w-4 h-4 text-[#950606]" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 p-5">
        <h3 className="font-black text-[16px] text-[#0A0A0A] tracking-[-0.02em] mb-1.5 group-hover:text-[#950606] transition-colors duration-200 line-clamp-2">
          {university.name}
        </h3>

        <div className="flex items-center gap-1.5 text-[13px] text-[#737373] font-medium mb-3.5">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{university.location}, {university.country}</span>
        </div>

        {university.description && (
          <p className="text-[13.5px] text-[#737373] line-clamp-2 leading-relaxed mb-4">
            {university.description}
          </p>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-3.5"
          style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
        >
          <span className="text-[12px] font-bold text-[#A3A3A3] uppercase tracking-[0.05em]">
            {count} {count === 1 ? 'hostel' : 'hostels'}
          </span>
          <span
            className="text-[13px] font-bold text-[#950606] flex items-center gap-1 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-250"
          >
            View hostels <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}
