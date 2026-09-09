import { useRef, useState, useCallback } from 'react';
import { Star, MessageSquare, ArrowUpRight, Home } from 'lucide-react';
import { Hostel } from '../lib/types';

interface Props {
  hostel: Hostel;
  onClick: () => void;
}

const TYPE_CONFIG = {
  male:   { label: 'Male Only',   bg: 'rgba(59,130,246,0.08)',  color: '#2563eb', dot: '#3b82f6' },
  female: { label: 'Female Only', bg: 'rgba(236,72,153,0.08)',  color: '#db2777', dot: '#ec4899' },
  mixed:  { label: 'Mixed',       bg: 'rgba(16,185,129,0.08)',  color: '#059669', dot: '#10b981' },
};

export default function HostelCard({ hostel, onClick }: Props) {
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

  const avg   = hostel.avg_overall ?? 0;
  const count = hostel.review_count ?? 0;
  const type  = TYPE_CONFIG[hostel.type];

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
      <div className="relative overflow-hidden rounded-t-[19px] h-44 bg-[#f5f5f4]">
        {hostel.cover_image_url ? (
          <img
            src={hostel.cover_image_url}
            alt={hostel.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 will-change-transform group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(149,6,6,0.06), rgba(149,6,6,0.02))' }}
          >
            <Home className="w-12 h-12" style={{ color: 'rgba(149,6,6,0.2)' }} />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Type badge */}
        <div
          className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold transition-transform duration-300 group-hover:scale-105"
          style={{ background: type.bg, color: type.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: type.dot }} />
          {type.label}
        </div>

        {/* Rating */}
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

        {/* Arrow */}
        <div
          className="absolute bottom-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center transition-all duration-300 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
        >
          <ArrowUpRight className="w-4 h-4 text-[#950606]" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 p-5">
        <h3 className="font-black text-[16px] text-[#0A0A0A] tracking-[-0.02em] mb-2 group-hover:text-[#950606] transition-colors duration-200">
          {hostel.name}
        </h3>

        {hostel.description && (
          <p className="text-[13.5px] text-[#737373] line-clamp-2 leading-relaxed mb-4">
            {hostel.description}
          </p>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-3.5"
          style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-[13px] text-[#A3A3A3]">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="font-semibold">{count}</span>
              <span className="font-medium">{count === 1 ? 'review' : 'reviews'}</span>
            </div>
            {avg > 0 && (
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star
                    key={s}
                    className="w-2.5 h-2.5"
                    style={{
                      fill: s <= Math.round(avg) ? '#f59e0b' : '#e5e7eb',
                      color: s <= Math.round(avg) ? '#f59e0b' : '#e5e7eb',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          <span
            className="text-[13px] font-bold text-[#950606] flex items-center gap-1 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-250"
          >
            Reviews <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}
