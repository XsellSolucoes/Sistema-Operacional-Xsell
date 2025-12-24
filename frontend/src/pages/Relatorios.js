import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, TrendingUp, DollarSign, Users, MapPin, Package, 
  FileText, Calendar, Filter, RefreshCw, Download, PieChart,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const SEGMENTOS_LABELS = {
  'todos': 'Todos',
  'licitacao': 'Licitação',
  'consumidor_final': 'Consumidor Final',
  'revenda': 'Revenda',
  'brindeiros': 'Brindeiros'
};

export default function Relatorios() {
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState(null);
  const [filtrosDisponiveis, setFiltrosDisponiveis] = useState({
    vendedores: [],
    cidades: [],
    segmentos: []
  });
  const [filtros, setFiltros] = useState({
    data_inicio: '',
    data_fim: '',
    segmento: 'todos',
    vendedor: '',
    cidade: ''
  });
  const [filtrosAtivos, setFiltrosAtivos] = useState(false);

  useEffect(() => {
    fetchFiltrosDisponiveis();
    // Set default dates to current month
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    setFiltros(prev => ({
      ...prev,
      data_inicio: inicioMes.toISOString().split('T')[0],
      data_fim: hoje.toISOString().split('T')[0]
    }));
  }, []);

  useEffect(() => {
    if (filtros.data_inicio && filtros.data_fim) {
      fetchRelatorio();
    }
  }, []);

  const fetchFiltrosDisponiveis = async () => {
    try {
      const response = await axios.get(`${API}/relatorios/filtros`, getAuthHeader());
      setFiltrosDisponiveis(response.data);
    } catch (error) {
      console.error('Erro ao carregar filtros:', error);
    }
  };

  const fetchRelatorio = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim);
      if (filtros.segmento && filtros.segmento !== 'todos') params.append('segmento', filtros.segmento);
      if (filtros.vendedor) params.append('vendedor', filtros.vendedor);
      if (filtros.cidade) params.append('cidade', filtros.cidade);
      
      const response = await axios.get(`${API}/relatorios/geral?${params.toString()}`, getAuthHeader());
      setRelatorio(response.data);
      
      // Check if any filter is active
      setFiltrosAtivos(
        filtros.segmento !== 'todos' || 
        filtros.vendedor !== '' || 
        filtros.cidade !== ''
      );
      
      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const limparFiltros = () => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    setFiltros({
      data_inicio: inicioMes.toISOString().split('T')[0],
      data_fim: hoje.toISOString().split('T')[0],
      segmento: 'todos',
      vendedor: '',
      cidade: ''
    });
    setFiltrosAtivos(false);
  };

  const formatCurrency = (value) => {
    return (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const getSegmentoLabel = (segmento) => {
    return SEGMENTOS_LABELS[segmento] || segmento;
  };

  // Quick date filters
  const setQuickDateFilter = (type) => {
    const hoje = new Date();
    let inicio, fim;
    
    switch(type) {
      case 'hoje':
        inicio = fim = hoje;
        break;
      case 'semana':
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - 7);
        fim = hoje;
        break;
      case 'mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim = hoje;
        break;
      case 'trimestre':
        inicio = new Date(hoje);
        inicio.setMonth(hoje.getMonth() - 3);
        fim = hoje;
        break;
      case 'ano':
        inicio = new Date(hoje.getFullYear(), 0, 1);
        fim = hoje;
        break;
      default:
        return;
    }
    
    setFiltros(prev => ({
      ...prev,
      data_inicio: inicio.toISOString().split('T')[0],
      data_fim: fim.toISOString().split('T')[0]
    }));
  };

  return (
    <div className="space-y-6" data-testid="relatorios-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">Relatórios</h1>
          <p className="text-muted-foreground mt-2">Análise completa de dados e indicadores do sistema</p>
        </div>
        {filtrosAtivos && (
          <Badge variant="secondary" className="text-sm">
            <Filter className="h-3 w-3 mr-1" />
            Filtros ativos
          </Badge>
        )}
      </div>

      {/* Filtros */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros Avançados
              </CardTitle>
              <CardDescription>Configure os filtros para análise detalhada</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuickDateFilter('hoje')}>Hoje</Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateFilter('semana')}>7 dias</Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateFilter('mes')}>Mês</Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateFilter('trimestre')}>Trimestre</Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateFilter('ano')}>Ano</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Dates */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Data Início
              </Label>
              <Input
                type="date"
                value={filtros.data_inicio}
                onChange={(e) => setFiltros({...filtros, data_inicio: e.target.value})}
                data-testid="data-inicio-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Data Fim
              </Label>
              <Input
                type="date"
                value={filtros.data_fim}
                onChange={(e) => setFiltros({...filtros, data_fim: e.target.value})}
                data-testid="data-fim-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                Segmento
              </Label>
              <Select value={filtros.segmento} onValueChange={(v) => setFiltros({...filtros, segmento: v})}>
                <SelectTrigger data-testid="segmento-select">
                  <SelectValue placeholder="Todos os segmentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="licitacao">Licitação</SelectItem>
                  <SelectItem value="consumidor_final">Consumidor Final</SelectItem>
                  <SelectItem value="revenda">Revenda</SelectItem>
                  <SelectItem value="brindeiros">Brindeiros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Vendedor
              </Label>
              <Select value={filtros.vendedor || "todos"} onValueChange={(v) => setFiltros({...filtros, vendedor: v === "todos" ? "" : v})}>
                <SelectTrigger data-testid="vendedor-select">
                  <SelectValue placeholder="Todos os vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os vendedores</SelectItem>
                  {filtrosDisponiveis.vendedores.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Row 2: City and Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Cidade
              </Label>
              <Select value={filtros.cidade || "todas"} onValueChange={(v) => setFiltros({...filtros, cidade: v === "todas" ? "" : v})}>
                <SelectTrigger data-testid="cidade-select">
                  <SelectValue placeholder="Todas as cidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as cidades</SelectItem>
                  {filtrosDisponiveis.cidades.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3 flex items-end gap-2">
              <Button 
                onClick={fetchRelatorio} 
                className="bg-secondary hover:bg-secondary/90 flex-1 md:flex-none"
                disabled={loading}
                data-testid="gerar-relatorio-button"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                Gerar Relatório
              </Button>
              <Button 
                variant="outline" 
                onClick={limparFiltros}
                data-testid="limpar-filtros-button"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {relatorio && (
        <>
          {/* Main KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm bg-gradient-to-br from-blue-50 to-white" data-testid="relatorio-faturamento">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  Faturamento Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-heading font-bold text-blue-600">
                  R$ {formatCurrency(relatorio.total_faturado)}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Pedidos: R$ {formatCurrency(relatorio.total_faturado_pedidos)}</span>
                  <span>Licitações: R$ {formatCurrency(relatorio.total_faturado_licitacoes)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm bg-gradient-to-br from-green-50 to-white" data-testid="relatorio-lucro">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Lucro Bruto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-heading font-bold text-green-600">
                  R$ {formatCurrency(relatorio.lucro_total)}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Pedidos: R$ {formatCurrency(relatorio.total_lucro_pedidos)}</span>
                  <span>Licitações: R$ {formatCurrency(relatorio.total_lucro_licitacoes)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm bg-gradient-to-br from-red-50 to-white" data-testid="relatorio-despesas">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                  Total Despesas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-heading font-bold text-red-600">
                  R$ {formatCurrency(relatorio.total_despesas)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Despesas operacionais do período
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm bg-gradient-to-br from-orange-50 to-white" data-testid="relatorio-lucro-liquido">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ArrowUpRight className="h-4 w-4 text-orange-600" />
                  Lucro Líquido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-heading font-bold ${relatorio.lucro_liquido >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                  R$ {formatCurrency(relatorio.lucro_liquido)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Lucro bruto - Despesas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary KPIs */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Resumo de Operações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-3xl font-bold text-primary">{relatorio.quantidade_pedidos}</p>
                    <p className="text-sm text-muted-foreground">Pedidos</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-3xl font-bold text-primary">{relatorio.quantidade_licitacoes}</p>
                    <p className="text-sm text-muted-foreground">Licitações</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Margem de Lucro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">
                      {relatorio.total_faturado > 0 
                        ? ((relatorio.lucro_total / relatorio.total_faturado) * 100).toFixed(1) 
                        : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Margem Bruta</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className={`text-3xl font-bold ${relatorio.lucro_liquido >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                      {relatorio.total_faturado > 0 
                        ? ((relatorio.lucro_liquido / relatorio.total_faturado) * 100).toFixed(1) 
                        : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Margem Líquida</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Tabs */}
          <Tabs defaultValue="segmentos" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="segmentos" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Por Segmento
              </TabsTrigger>
              <TabsTrigger value="vendedores" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Por Vendedor
              </TabsTrigger>
              <TabsTrigger value="cidades" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Por Cidade
              </TabsTrigger>
              <TabsTrigger value="transacoes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Transações Recentes
              </TabsTrigger>
            </TabsList>

            {/* Por Segmento */}
            <TabsContent value="segmentos">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="font-heading">Análise por Segmento</CardTitle>
                  <CardDescription>Distribuição de faturamento e lucro por tipo de venda</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(relatorio.por_segmento || {}).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum dado encontrado para os filtros selecionados</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Segmento</TableHead>
                          <TableHead className="text-center">Quantidade</TableHead>
                          <TableHead className="text-right">Faturamento</TableHead>
                          <TableHead className="text-right">Lucro</TableHead>
                          <TableHead className="text-right">% do Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(relatorio.por_segmento).map(([segmento, dados]) => (
                          <TableRow key={segmento}>
                            <TableCell className="font-medium">
                              <Badge variant="outline">{getSegmentoLabel(segmento)}</Badge>
                            </TableCell>
                            <TableCell className="text-center">{dados.quantidade}</TableCell>
                            <TableCell className="text-right">R$ {formatCurrency(dados.faturamento)}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              R$ {formatCurrency(dados.lucro)}
                            </TableCell>
                            <TableCell className="text-right">
                              {relatorio.total_faturado > 0 
                                ? ((dados.faturamento / relatorio.total_faturado) * 100).toFixed(1) 
                                : 0}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Por Vendedor */}
            <TabsContent value="vendedores">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="font-heading">Análise por Vendedor</CardTitle>
                  <CardDescription>Performance individual de cada vendedor</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(relatorio.por_vendedor || {}).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum dado encontrado para os filtros selecionados</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vendedor</TableHead>
                          <TableHead className="text-center">Qtd Pedidos</TableHead>
                          <TableHead className="text-right">Faturamento</TableHead>
                          <TableHead className="text-right">Lucro Gerado</TableHead>
                          <TableHead className="text-right">Ticket Médio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(relatorio.por_vendedor)
                          .sort((a, b) => b[1].faturamento - a[1].faturamento)
                          .map(([vendedor, dados]) => (
                          <TableRow key={vendedor}>
                            <TableCell className="font-medium">{vendedor}</TableCell>
                            <TableCell className="text-center">{dados.quantidade}</TableCell>
                            <TableCell className="text-right">R$ {formatCurrency(dados.faturamento)}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              R$ {formatCurrency(dados.lucro)}
                            </TableCell>
                            <TableCell className="text-right">
                              R$ {formatCurrency(dados.quantidade > 0 ? dados.faturamento / dados.quantidade : 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Por Cidade */}
            <TabsContent value="cidades">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="font-heading">Análise por Cidade</CardTitle>
                  <CardDescription>Distribuição geográfica das vendas</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(relatorio.por_cidade || {}).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum dado encontrado para os filtros selecionados</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cidade</TableHead>
                          <TableHead className="text-center">Operações</TableHead>
                          <TableHead className="text-right">Faturamento</TableHead>
                          <TableHead className="text-right">Lucro</TableHead>
                          <TableHead className="text-right">% do Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(relatorio.por_cidade)
                          .sort((a, b) => b[1].faturamento - a[1].faturamento)
                          .map(([cidade, dados]) => (
                          <TableRow key={cidade}>
                            <TableCell className="font-medium flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              {cidade}
                            </TableCell>
                            <TableCell className="text-center">{dados.quantidade}</TableCell>
                            <TableCell className="text-right">R$ {formatCurrency(dados.faturamento)}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              R$ {formatCurrency(dados.lucro)}
                            </TableCell>
                            <TableCell className="text-right">
                              {relatorio.total_faturado > 0 
                                ? ((dados.faturamento / relatorio.total_faturado) * 100).toFixed(1) 
                                : 0}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transações Recentes */}
            <TabsContent value="transacoes">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="font-heading">Transações Recentes</CardTitle>
                  <CardDescription>Últimas operações realizadas no período</CardDescription>
                </CardHeader>
                <CardContent>
                  {(relatorio.transacoes_recentes || []).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhuma transação encontrada para os filtros selecionados</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Número</TableHead>
                          <TableHead>Cliente/Órgão</TableHead>
                          <TableHead>Segmento</TableHead>
                          <TableHead>Vendedor</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">Lucro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {relatorio.transacoes_recentes.map((trans, index) => (
                          <TableRow key={index}>
                            <TableCell>{formatDate(trans.data)}</TableCell>
                            <TableCell>
                              <Badge variant={trans.tipo === 'Pedido' ? 'default' : 'secondary'}>
                                {trans.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{trans.numero}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{trans.cliente}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{getSegmentoLabel(trans.segmento)}</Badge>
                            </TableCell>
                            <TableCell>{trans.vendedor}</TableCell>
                            <TableCell className="text-right">R$ {formatCurrency(trans.valor)}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              R$ {formatCurrency(trans.lucro)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Empty State */}
      {!relatorio && !loading && (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum relatório gerado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Selecione os filtros desejados e clique em "Gerar Relatório" para visualizar os dados.
            </p>
            <Button onClick={fetchRelatorio} className="bg-secondary hover:bg-secondary/90">
              <BarChart3 className="h-4 w-4 mr-2" />
              Gerar Primeiro Relatório
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
