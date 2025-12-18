import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  Search,
  ShoppingCart,
  DollarSign,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BarChart3,
  Shield,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', permission: 'dashboard.view' },
  { icon: Users, label: 'Clientes', path: '/customers', permission: 'customers.view' },
  { icon: Building2, label: 'Fornecedores', path: '/suppliers', permission: 'suppliers.view' },
  { icon: Package, label: 'Estoque', path: '/inventory', permission: 'inventory.view' },
  { icon: Search, label: 'Consulta Produtos', path: '/product-consultation', permission: 'products.view' },
  { icon: ShoppingCart, label: 'Vendas', path: '/sales', permission: 'sales.view' },
  { icon: DollarSign, label: 'Financeiro', path: '/financial', permission: 'financial.view' },
  { icon: FileText, label: 'Notas de Saída', path: '/fiscal/saida', permission: 'fiscal.view' },
  { icon: FileText, label: 'Notas de Entrada', path: '/fiscal/entrada', permission: 'fiscal.view' },
  { icon: CheckCircle2, label: 'Verificação NF-e', path: '/fiscal/verificacao', permission: 'fiscal.view' },
  { icon: BarChart3, label: 'Relatórios', path: '/reports', permission: 'reports.view' },
  { icon: Shield, label: 'Usuários', path: '/users', permission: 'users.view' },
  { icon: Settings, label: 'Configurações', path: '/settings', permission: 'settings.view' },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, company, signOut, checkPermission } = useAuth();
  const location = useLocation();

  const filteredMenu = menuItems.filter(item => {
    // Se não tiver permissão definida, mostrar (ou ocultar por padrão? Vamos ocultar por segurança)
    // Mas para itens públicos/comuns, podemos deixar null.
    // Aqui todos têm permissão definida.
    if (!item.permission) return true;

    const [module, action] = item.permission.split('.');
    return checkPermission(module, action);
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen sidebar-gradient border-r border-sidebar-border transition-all duration-300 flex flex-col',
        collapsed ? 'w-[70px]' : 'w-[260px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <span className="text-sidebar-foreground font-semibold text-lg whitespace-nowrap animate-fade-in">
            Apex-Glass
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 sidebar-scroll">
        <ul className="space-y-1">
          {filteredMenu.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            const linkContent = (
              <NavLink
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                )}
              </NavLink>
            );

            return (
              <li key={item.path}>
                {collapsed ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  linkContent
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs">
                {profile?.full_name ? getInitials(profile.full_name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || 'Usuário'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {company?.name || 'Empresa'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={signOut}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sair</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Collapse button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground shadow-sm"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </aside>
  );
}
