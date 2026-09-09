import { useRef, useState, useCallback, ReactNode, ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function InteractiveButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: Props) {
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

  const sizeClasses = {
    sm: 'px-4 py-2 text-[13px] gap-1.5',
    md: 'px-6 py-3 text-[14px] gap-2',
    lg: 'px-8 py-4 text-[16px] gap-2.5',
  };

  const baseStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    border: 'none',
    cursor: 'pointer',
    overflow: 'hidden',
    isolation: 'isolate',
    transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease, background 0.25s ease',
    '--spotlight-x': `${spotlight.x}%`,
    '--spotlight-y': `${spotlight.y}%`,
    '--spotlight-opacity': spotlight.isHovered ? 1 : 0,
  } as React.CSSProperties;

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      ...baseStyle,
      background: spotlight.isHovered ? '#7a0404' : '#950606',
      color: '#fff',
      borderRadius: '100px',
      boxShadow: spotlight.isHovered
        ? '0 2px 4px rgba(149,6,6,0.2), 0 8px 24px rgba(149,6,6,0.25), 0 16px 48px rgba(149,6,6,0.15)'
        : '0 1px 2px rgba(149,6,6,0.16), 0 6px 20px rgba(149,6,6,0.18)',
      transform: spotlight.isHovered ? 'translateY(-2px) scale(1.025)' : 'translateY(0) scale(1)',
    },
    secondary: {
      ...baseStyle,
      background: spotlight.isHovered ? 'rgba(149,6,6,0.04)' : '#fff',
      color: spotlight.isHovered ? '#950606' : '#0A0A0A',
      borderRadius: '100px',
      boxShadow: spotlight.isHovered
        ? '0 2px 4px rgba(0,0,0,0.04), 0 8px 20px rgba(0,0,0,0.06)'
        : '0 1px 2px rgba(0,0,0,0.04)',
      transform: spotlight.isHovered ? 'translateY(-1px) scale(1.015)' : 'translateY(0) scale(1)',
    },
    ghost: {
      ...baseStyle,
      background: spotlight.isHovered ? 'rgba(149,6,6,0.04)' : 'transparent',
      color: spotlight.isHovered ? '#950606' : '#737373',
      borderRadius: '100px',
      boxShadow: 'none',
      transform: spotlight.isHovered ? 'translateY(-1px) scale(1.015)' : 'translateY(0) scale(1)',
    },
  };

  const variantStyle = variantStyles[variant];

  // Spotlight overlay for primary buttons
  const spotlightOverlay = variant === 'primary' && (
    <>
      <span
        style={{
          position: 'absolute',
          inset: '-60px',
          background: `radial-gradient(300px circle at ${spotlight.x}% ${spotlight.y}%, rgba(122,5,5,0.4), transparent 50%)`,
          opacity: spotlight.isHovered ? 1 : 0,
          transition: 'opacity 0.25s ease',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
      <span
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(180px circle at ${spotlight.x}% ${spotlight.y}%, rgba(255,255,255,0.2), transparent 55%)`,
          opacity: spotlight.isHovered ? 1 : 0,
          transition: 'opacity 0.2s ease',
          pointerEvents: 'none',
          zIndex: 0,
          borderRadius: 'inherit',
        }}
      />
    </>
  );

  const spotlightOverlaySecondary = variant !== 'primary' && (
    <span
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(280px circle at ${spotlight.x}% ${spotlight.y}%, rgba(149,6,6,0.05), transparent 45%)`,
        opacity: spotlight.isHovered ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none',
        zIndex: 0,
        borderRadius: 'inherit',
      }}
    />
  );

  return (
    <button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`${sizeClasses[size]} ${className}`}
      style={{ ...variantStyle, ...baseStyle }}
      {...props}
    >
      {spotlightOverlay}
      {spotlightOverlaySecondary}
      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 'inherit' }}>
        {children}
      </span>
    </button>
  );
}
