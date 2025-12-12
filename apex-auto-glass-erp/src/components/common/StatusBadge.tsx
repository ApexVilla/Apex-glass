import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusType = 'success' | 'warning' | 'danger' | 'info' | 'default';

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  success: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
  danger: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
  info: 'bg-info/10 text-info border-info/20 hover:bg-info/20',
  default: 'bg-muted text-muted-foreground border-border hover:bg-muted',
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', statusStyles[status], className)}
    >
      {label}
    </Badge>
  );
}

// Helper functions for common status mappings
export function getServiceOrderStatus(status: string): { type: StatusType; label: string } {
  const statusMap: Record<string, { type: StatusType; label: string }> = {
    open: { type: 'info', label: 'Aberta' },
    in_progress: { type: 'warning', label: 'Em Andamento' },
    completed: { type: 'success', label: 'Concluída' },
    cancelled: { type: 'danger', label: 'Cancelada' },
  };
  return statusMap[status] || { type: 'default', label: status };
}

export function getPaymentStatus(status: string): { type: StatusType; label: string } {
  const statusMap: Record<string, { type: StatusType; label: string }> = {
    pending: { type: 'warning', label: 'Pendente' },
    paid: { type: 'success', label: 'Pago' },
    overdue: { type: 'danger', label: 'Vencido' },
    cancelled: { type: 'default', label: 'Cancelado' },
  };
  return statusMap[status] || { type: 'default', label: status };
}

export function getStockStatus(quantity: number, minQuantity: number): { type: StatusType; label: string } {
  if (quantity === 0) {
    return { type: 'danger', label: 'Sem Estoque' };
  }
  if (quantity <= minQuantity) {
    return { type: 'warning', label: 'Estoque Baixo' };
  }
  return { type: 'success', label: 'Em Estoque' };
}
