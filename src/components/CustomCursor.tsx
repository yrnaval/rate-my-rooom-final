import { useEffect } from 'react';

export default function CustomCursor() {
  useEffect(() => {
    // Only track spotlight position on pointer-fine devices (desktop with mouse)
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const onMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return null;
}
