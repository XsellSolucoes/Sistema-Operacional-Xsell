import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Users, Package, DollarSign } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function Dashboard() {
  const [stats, setStats] = useState({
    pedidos: 0,
    clientes: 0,
    produtos: 0,
    faturamento: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [pedidosRes, clientesRes, produtosRes, relatorioRes] = await Promise.all([
        axios.get(`${API}/pedidos`, getAuthHeader()),
        axios.get(`${API}/clientes`, getAuthHeader()),
        axios.get(`${API}/produtos`, getAuthHeader()),
        axios.get(`${API}/relatorios/geral`, getAuthHeader())
      ]);

      setStats({
        pedidos: pedidosRes.data.length,
        clientes: clientesRes.data.length,
        produtos: produtosRes.data.length,
        faturamento: relatorioRes.data.total_faturado || 0
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total de Pedidos',
      value: stats.pedidos,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Clientes',
      value: stats.clientes,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Produtos',
      value: stats.produtos,
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Faturamento Total',
      value: `R$ ${stats.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-secondary',
      bgColor: 'bg-orange-50'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div>
        <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Visão geral do sistema</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className="shadow-sm hover:shadow-md transition-shadow duration-200" data-testid={`stat-card-${idx}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`${card.bgColor} p-2 rounded-md`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-heading font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading">Bem-vindo ao Sistema XSELL</CardTitle>
          <CardDescription>
            Gerencie seus pedidos, licitações, clientes e finanças de forma eficiente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use o menu lateral para navegar entre as diferentes seções do sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}