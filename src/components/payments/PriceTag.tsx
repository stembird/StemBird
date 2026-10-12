'use client';

import { formatKes } from '@/lib/pricing';
import { Badge } from '@/components/ui/badge';

export function PriceTag({
  amount,
  compareAt,
  billingInterval,
  badge,
  className = '',
}: {
  amount: number;
  compareAt?: number | null;
  billingInterval?: 'one_time' | 'month' | null;
  badge?: string | null;
  className?: string;
}) {
  const showCompare = compareAt != null && compareAt > amount;
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {badge && (
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
          {badge}
        </Badge>
      )}
      <div className="flex items-baseline justify-center gap-2">
        {showCompare && (
          <span className="text-sm text-muted-foreground line-through">
            {formatKes(compareAt, billingInterval)}
          </span>
        )}
        <span className="text-lg font-bold text-primary">{formatKes(amount, billingInterval)}</span>
      </div>
    </div>
  );
}
