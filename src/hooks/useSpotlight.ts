import { useRef, useState, useCallback } from 'react';

interface SpotlightState {
  x: number;
  y: number;
  isHovered: boolean;
}

export function useSpotlight<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [spotlight, setSpotlight] = useState<SpotlightState>({ x: 50, y: 50, isHovered: false });

  const handleMouseMove = useCallback((e: React.MouseEvent<T>) => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setSpotlight({ x, y, isHovered: true });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setSpotlight(prev => ({ ...prev, isHovered: true }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setSpotlight(prev => ({ ...prev, isHovered: false }));
  }, []);

  const style = {
    '--spotlight-x': `${spotlight.x}%`,
    '--spotlight-y': `${spotlight.y}%`,
    '--spotlight-opacity': spotlight.isHovered ? 1 : 0,
  } as React.CSSProperties;

  return {
    ref,
    style,
    spotlightProps: {
      onMouseMove: handleMouseMove,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
    isHovered: spotlight.isHovered,
  };
}
