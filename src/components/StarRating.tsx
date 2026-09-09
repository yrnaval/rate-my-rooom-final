import { Star } from 'lucide-react';
import { useState } from 'react';

interface Props {
  value: number;
  onChange?: (val: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
}

const SIZES = {
  sm: 'w-3.5 h-3.5',
  md: 'w-5   h-5',
  lg: 'w-7   h-7',
};

export default function StarRating({ value, onChange, size = 'md', readonly = false }: Props) {
  const [hovered, setHovered] = useState(0);
  const display = hovered > 0 ? hovered : value;

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          className={readonly ? 'cursor-default' : 'cursor-pointer'}
          style={{
            transform:  !readonly && hovered === star ? 'scale(1.25)' : 'scale(1)',
            transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <Star
            className={SIZES[size]}
            style={{
              fill:       star <= display ? '#950606' : '#e5e7eb',
              color:      star <= display ? '#950606' : '#e5e7eb',
              transition: 'fill 0.1s ease, color 0.1s ease',
            }}
          />
        </button>
      ))}
    </div>
  );
}
