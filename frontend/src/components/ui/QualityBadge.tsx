import { clsx } from 'clsx';

interface QualityBadgeProps {
  value: number;
  precision?: number;
  prefix?: string;
  className?: string;
}

export function QualityBadge({ value, precision = 1, prefix, className }: QualityBadgeProps) {
  return (
    <span className={clsx(
      'text-xs font-mono px-1 rounded',
      value >= 8 ? 'bg-smop-excellent/20 text-smop-excellent' :
      value >= 5 ? 'bg-smop-acceptable/20 text-smop-acceptable' :
      'bg-smop-bad/20 text-smop-bad',
      className,
    )}>
      {prefix}{value.toFixed(precision)}
    </span>
  );
}
