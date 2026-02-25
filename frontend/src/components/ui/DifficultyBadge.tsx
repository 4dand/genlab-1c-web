import { clsx } from 'clsx';
import { DIFFICULTY_CONFIG } from '@/config/constants';

interface DifficultyBadgeProps {
  difficulty: string;
  className?: string;
}

export function DifficultyBadge({ difficulty, className }: DifficultyBadgeProps) {
  const config = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.medium;
  return (
    <span className={clsx(
      'px-1.5 py-0.5 text-[9px] font-semibold rounded',
      config.bg,
      config.text,
      className,
    )}>
      {config.label}
    </span>
  );
}
