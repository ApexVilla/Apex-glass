import { Bell, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {title && (
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar..."
              className="w-64 pl-9 bg-secondary/50 border-0 focus-visible:ring-1"
            />
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive">
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notificações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <span className="font-medium">Estoque baixo</span>
                <span className="text-sm text-muted-foreground">
                  5 produtos precisam de reposição
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <span className="font-medium">Nova OS criada</span>
                <span className="text-sm text-muted-foreground">
                  OS #1234 aguardando atendimento
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <span className="font-medium">Pagamento pendente</span>
                <span className="text-sm text-muted-foreground">
                  Conta vencendo hoje: Fornecedor XYZ
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User greeting */}
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-foreground">
              Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {profile?.role === 'admin' ? 'Administrador' : 
               profile?.role === 'manager' ? 'Gerente' :
               profile?.role === 'seller' ? 'Vendedor' : 'Instalador'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
