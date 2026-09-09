import { useRef, useState, useCallback, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

export default function SpotlightCard({ children, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
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

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`spotlight-card relative ${className}`}
      style={{
        background: '#fff',
        border: `1px solid ${spotlight.isHovered ? 'rgba(149,6,6,0.12)' : 'rgba(0,0,0,0.07)'}`,
        borderRadius: '20px',
        transition: 'border-color 0.35s ease, transform 0.45s cubic-bezier(0.16,1,0.3,1), box-shadow 0.45s cubic-bezier(0.16,1,0.3,1)',
        transform: spotlight.isHovered ? 'translateY(-4px) scale(1.018)' : 'translateY(0) scale(1)',
        boxShadow: spotlight.isHovered
          ? '0 4px 6px rgba(0,0,0,0.03), 0 12px 28px rgba(0,0,0,0.06), 0 20px 48px rgba(149,6,6,0.05)'
          : '0 1px 2px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.04)',
        '--spotlight-x': `${spotlight.x}%`,
        '--spotlight-y': `${spotlight.y}%`,
        '--spotlight-opacity': spotlight.isHovered ? 1 : 0,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
