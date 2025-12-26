import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, Users, Package, BarChart3, Wallet, 
  FileText, Receipt, Menu, X, LogOut, Truck, UserCog, CreditCard, CalendarClock 
} from 'lucide-react';
import { toast } from 'sonner';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: BarChart3 },
  { path: '/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { path: '/clientes', label: 'Clientes', icon: Users },
  { path: '/produtos', label: 'Produtos', icon: Package },
  { path: '/fornecedores', label: 'Fornecedores', icon: Truck },
  { path: '/vendedores', label: 'Vendedores', icon: UserCog },
  { path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { path: '/financeiro', label: 'Financeiro', icon: Wallet },
  { path: '/dados-pagamento', label: 'Dados de Pagamento', icon: CreditCard },
  { path: '/licitacoes', label: 'Licitações', icon: FileText },
  { path: '/agenda-licitacoes', label: 'Agenda de Licitações', icon: CalendarClock },
  { path: '/orcamentos', label: 'Orçamentos', icon: Receipt },
];

export default function DashboardLayout({ children, user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    toast.success('Logout realizado com sucesso');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-border flex items-center justify-between px-4 z-30">
        <img 
          src="https://customer-assets.emergentagent.com/job_xsellmanager/artifacts/isjxf46l_logo%20alternativo.png" 
          alt="XSELL Logo" 
          className="h-10"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          data-testid="menu-toggle"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      <aside 
        className={`
          fixed top-0 left-0 h-full w-64 bg-primary text-primary-foreground z-40 transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:translate-x-0
        `}
        data-testid="sidebar"
      >
        <div className="p-6 border-b border-primary-foreground/10">
          <img 
            src="https://customer-assets.emergentagent.com/job_xsellmanager/artifacts/isjxf46l_logo%20alternativo.png" 
            alt="XSELL Logo" 
            className="h-12 mb-4"
          />
          <p className="text-sm text-primary-foreground/70">Sistema de Gestão</p>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-md transition-all duration-200
                  ${isActive 
                    ? 'bg-secondary text-secondary-foreground shadow-md' 
                    : 'text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-primary-foreground/10">
          <div className="px-4 py-2 mb-2">
            <p className="text-sm font-medium text-primary-foreground">{user?.name}</p>
            <p className="text-xs text-primary-foreground/60">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={handleLogout}
            data-testid="logout-button"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sair
          </Button>
        </div>
      </aside>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 md:p-8 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}