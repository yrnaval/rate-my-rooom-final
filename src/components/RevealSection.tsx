import { useEffect, useRef, CSSProperties, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  delay?: number;
  variant?: 'up' | 'scale' | 'left';
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  threshold?: number;
}

export default function RevealSection({
  children,
  delay = 0,
  variant = 'up',
  className = '',
  as: Tag = 'div',
  threshold = 0.12,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const variantClass =
    variant === 'scale' ? 'reveal-scale' :
    variant === 'left'  ? 'reveal-left'  :
    'reveal';

  const style: CSSProperties = delay > 0 ? { '--reveal-delay': `${delay}ms` } as CSSProperties : {};

  return (
    // @ts-expect-error dynamic tag
    <Tag ref={ref} className={`${variantClass} ${className}`} style={style}>
      {children}
    </Tag>
  );
}
