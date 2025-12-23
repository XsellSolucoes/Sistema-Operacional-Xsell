import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function Relatorios() {
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState(null);
  const [filtros, setFiltros] = useState({
    data_inicio: '',
    data_fim: ''
  });

  const fetchRelatorio = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim);
      
      const response = await axios.get(`${API}/relatorios/geral?${params.toString()}`, getAuthHeader());
      setRelatorio(response.data);
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelatorio();
  }, []);

  return (
    <div className="space-y-6" data-testid="relatorios-page">
      <div>
        <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">Relatórios</h1>
        <p className="text-muted-foreground mt-2">Análise de dados e indicadores</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading">Filtros</CardTitle>
          <CardDescription>Selecione o período para análise</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filtros.data_inicio}
                onChange={(e) => setFiltros({...filtros, data_inicio: e.target.value})}
                data-testid="data-inicio-input"
              />
            </div>
            <div className="space-y-2 flex-1">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filtros.data_fim}
                onChange={(e) => setFiltros({...filtros, data_fim: e.target.value})}
                data-testid="data-fim-input"
              />
            </div>
            <Button 
              onClick={fetchRelatorio} 
              className="bg-secondary hover:bg-secondary/90"
              data-testid="gerar-relatorio-button"
            >
              Gerar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {relatorio && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm" data-testid="relatorio-faturamento">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Faturamento Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-heading font-bold">
                R$ {relatorio.total_faturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm" data-testid="relatorio-lucro">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Lucro Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-heading font-bold text-green-600">
                R$ {relatorio.lucro_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm" data-testid="relatorio-despesas">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                Total Despesas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-heading font-bold text-red-600">
                R$ {relatorio.total_despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm" data-testid="relatorio-lucro-liquido">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Lucro Líquido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-heading font-bold text-secondary">
                R$ {relatorio.lucro_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
