import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const variantStyles = {
  default: {
    icon: 'bg-primary/10 text-primary',
    border: 'border-l-primary',
  },
  primary: {
    icon: 'bg-primary/10 text-primary',
    border: 'border-l-primary',
  },
  success: {
    icon: 'bg-success/10 text-success',
    border: 'border-l-success',
  },
  warning: {
    icon: 'bg-warning/10 text-warning',
    border: 'border-l-warning',
  },
  danger: {
    icon: 'bg-destructive/10 text-destructive',
    border: 'border-l-destructive',
  },
  info: {
    icon: 'bg-info/10 text-info',
    border: 'border-l-info',
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-card p-6 border-l-4 shadow-card hover:shadow-card-hover transition-shadow duration-200',
        styles.border,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <p
              className={cn(
                'mt-2 text-sm font-medium flex items-center gap-1',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}
            >
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}% vs mês anterior</span>
            </p>
          )}
        </div>
        <div className={cn('rounded-xl p-3', styles.icon)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
