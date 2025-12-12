import { Button } from '@/components/ui/button';
import { LucideIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  };
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  const ActionIcon = action?.icon || Plus;

  return (
    <div className={cn('flex items-center justify-between mb-6', className)}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick} className={!action.variant ? "btn-gradient" : ""} variant={action.variant}>
          <ActionIcon className="h-4 w-4 mr-2" />
          {action.label}
        </Button>
      )}
    </div>
  );
}
