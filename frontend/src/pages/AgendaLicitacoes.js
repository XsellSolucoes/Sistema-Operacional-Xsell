import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, Eye, Pencil, Trash2, Calendar, Clock, MapPin, Building2, 
  FileText, AlertTriangle, CheckCircle, X, Search, Filter, 
  Download, Upload, History, Bell, CircleDot, ChevronRight, Trophy, XCircle, Hourglass
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

// Formatar data - preserva a data exatamente como cadastrada
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  // Parse the date and format without timezone conversion
  const date = new Date(dateStr);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

// Formatar data e hora
const formatDateTime = (dateStr, horario) => {
  if (!dateStr) return '-';
  const data = formatDate(dateStr);
  return horario ? `${data} às ${horario}` : data;
};

// Formatar moeda
const formatCurrency = (value) => {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Badge de status
const getStatusBadge = (status) => {
  const config = {
    'agendada': { label: 'Agendada', className: 'bg-blue-500 text-white' },
    'em_andamento': { label: 'Em Andamento', className: 'bg-yellow-500 text-white' },
    'ganha': { label: 'VENCEMOS', className: 'bg-green-500 text-white' },
    'perdida': { label: 'NÃO GANHAMOS', className: 'bg-red-500 text-white' },
    'aguardando': { label: 'AGUARDANDO RESULTADO', className: 'bg-orange-500 text-white' },
    'cancelada': { label: 'Cancelada', className: 'bg-gray-500 text-white' }
  };
  const { label, className } = config[status] || config.agendada;
  return <Badge className={className}>{label}</Badge>;
};

// Badge de resultado para o dropdown STATUS
const getResultadoBadge = (status) => {
  const config = {
    'ganha': { label: 'VENCEMOS', icon: Trophy, className: 'text-green-600' },
    'perdida': { label: 'NÃO GANHAMOS', icon: XCircle, className: 'text-red-600' },
    'aguardando': { label: 'AGUARDANDO RESULTADO', icon: Hourglass, className: 'text-orange-600' }
  };
  return config[status] || null;
};

// Badge de status do evento
const getEventoStatusBadge = (status) => {
  const config = {
    'pendente': { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
    'concluido': { label: 'Concluído', className: 'bg-green-100 text-green-800' },
    'atrasado': { label: 'Atrasado', className: 'bg-red-100 text-red-800' }
  };
  const { label, className } = config[status] || config.pendente;
  return <Badge variant="outline" className={className}>{label}</Badge>;
};

// Tipos de eventos predefinidos
const tiposEvento = [
  { value: 'proposta', label: 'Prazo para envio de proposta' },
  { value: 'esclarecimento', label: 'Pedido de esclarecimento' },
  { value: 'impugnacao', label: 'Impugnação' },
  { value: 'sessao', label: 'Sessão pública' },
  { value: 'julgamento', label: 'Julgamento' },
  { value: 'recurso', label: 'Recursos' },
  { value: 'homologacao', label: 'Homologação' },
  { value: 'outro', label: 'Outro' }
];

// Portais predefinidos
const portaisPredefinidos = [
  'Bolsa de Licitações do Brasil (BLL)',
  'BBMNET (Bolsa Brasileira)',
  'Licitações-E',
  'Compras.Gov',
  'Portal de Compras Públicas',
  'BNC',
  'Banrisul',
  'Outros'
];

export default function AgendaLicitacoes() {
  const [licitacoes, setLicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [eventoDialogOpen, setEventoDialogOpen] = useState(false);
  const [selectedLicitacao, setSelectedLicitacao] = useState(null);
  const [editingLicitacao, setEditingLicitacao] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCidade, setFiltroCidade] = useState('todos');
  const [filtroPortal, setFiltroPortal] = useState('todos');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(null);

  // Estado do formulário
  const [formData, setFormData] = useState({
    data_disputa: '',
    horario_disputa: '',
    numero_licitacao: '',
    portal: '',
    cidade: '',
    estado: '',
    produtos: '',
    objeto: '',
    valor_estimado: '',
    observacoes: ''
  });

  // Estado do formulário de evento
  const [eventoForm, setEventoForm] = useState({
    data: '',
    horario: '',
    tipo: 'outro',
    descricao: '',
    status: 'pendente'
  });

  useEffect(() => {
    fetchLicitacoes();
  }, []);

  const fetchLicitacoes = async () => {
    try {
      const response = await axios.get(`${API}/agenda-licitacoes`, getAuthHeader());
      setLicitacoes(response.data);
    } catch (error) {
      toast.error('Erro ao carregar agenda de licitações');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      data_disputa: '',
      horario_disputa: '',
      numero_licitacao: '',
      portal: '',
      cidade: '',
      estado: '',
      produtos: '',
      objeto: '',
      valor_estimado: '',
      observacoes: ''
    });
    setEditingLicitacao(null);
  };

  // Salvar licitação
  const handleSalvar = async (e) => {
    e.preventDefault();

    if (!formData.data_disputa || !formData.horario_disputa || !formData.numero_licitacao) {
      toast.error('Preencha os campos obrigatórios: Data, Horário e Número da Licitação');
      return;
    }

    try {
      // Criar data com hora 12:00 para evitar problemas de timezone
      const [year, month, day] = formData.data_disputa.split('-');
      const dataDisputa = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0));
      
      const payload = {
        data_disputa: dataDisputa.toISOString(),
        horario_disputa: formData.horario_disputa,
        numero_licitacao: formData.numero_licitacao,
        portal: formData.portal,
        cidade: formData.cidade,
        estado: formData.estado,
        produtos: formData.produtos ? formData.produtos.split(',').map(p => p.trim()) : [],
        objeto: formData.objeto,
        valor_estimado: formData.valor_estimado ? parseFloat(formData.valor_estimado) : null,
        observacoes: formData.observacoes
      };

      if (editingLicitacao) {
        await axios.put(`${API}/agenda-licitacoes/${editingLicitacao.id}`, payload, getAuthHeader());
        toast.success('Licitação atualizada com sucesso!');
      } else {
        await axios.post(`${API}/agenda-licitacoes`, payload, getAuthHeader());
        toast.success('Licitação cadastrada com sucesso!');
      }

      setDialogOpen(false);
      resetForm();
      fetchLicitacoes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar licitação');
    }
  };

  // Editar licitação
  const handleEditar = (licitacao) => {
    setEditingLicitacao(licitacao);
    setFormData({
      data_disputa: licitacao.data_disputa ? new Date(licitacao.data_disputa).toISOString().split('T')[0] : '',
      horario_disputa: licitacao.horario_disputa || '',
      numero_licitacao: licitacao.numero_licitacao || '',
      portal: licitacao.portal || '',
      cidade: licitacao.cidade || '',
      estado: licitacao.estado || '',
      produtos: (licitacao.produtos || []).join(', '),
      objeto: licitacao.objeto || '',
      valor_estimado: licitacao.valor_estimado?.toString() || '',
      observacoes: licitacao.observacoes || ''
    });
    setDialogOpen(true);
  };

  // Excluir licitação
  const handleExcluir = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta licitação?')) return;

    try {
      await axios.delete(`${API}/agenda-licitacoes/${id}`, getAuthHeader());
      toast.success('Licitação excluída com sucesso!');
      fetchLicitacoes();
    } catch (error) {
      toast.error('Erro ao excluir licitação');
    }
  };

  // Visualizar licitação
  const handleVisualizar = (licitacao) => {
    setSelectedLicitacao(licitacao);
    setViewDialogOpen(true);
  };

  // Alterar status
  const handleAlterarStatus = async (id, novoStatus) => {
    try {
      await axios.put(`${API}/agenda-licitacoes/${id}/status?status=${novoStatus}`, {}, getAuthHeader());
      toast.success('Status atualizado!');
      fetchLicitacoes();
      if (selectedLicitacao && selectedLicitacao.id === id) {
        const response = await axios.get(`${API}/agenda-licitacoes/${id}`, getAuthHeader());
        setSelectedLicitacao(response.data);
      }
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  // Alterar resultado (VENCEMOS/NÃO GANHAMOS/AGUARDANDO)
  const handleAlterarResultado = async (id, resultado) => {
    try {
      await axios.put(`${API}/agenda-licitacoes/${id}/status?status=${resultado}`, {}, getAuthHeader());
      
      const mensagens = {
        'ganha': '🏆 VENCEMOS! Parabéns!',
        'perdida': '❌ Resultado registrado: Não ganhamos',
        'aguardando': '⏳ Aguardando resultado...'
      };
      
      toast.success(mensagens[resultado] || 'Resultado atualizado!');
      setStatusDropdownOpen(null);
      fetchLicitacoes();
    } catch (error) {
      toast.error('Erro ao atualizar resultado');
    }
  };

  // Adicionar evento
  const handleAdicionarEvento = async () => {
    if (!eventoForm.data || !eventoForm.descricao) {
      toast.error('Preencha a data e descrição do evento');
      return;
    }

    try {
      await axios.post(
        `${API}/agenda-licitacoes/${selectedLicitacao.id}/eventos`,
        {
          data: new Date(eventoForm.data).toISOString(),
          horario: eventoForm.horario,
          tipo: eventoForm.tipo,
          descricao: eventoForm.descricao,
          status: eventoForm.status
        },
        getAuthHeader()
      );
      toast.success('Evento adicionado!');
      setEventoDialogOpen(false);
      setEventoForm({ data: '', horario: '', tipo: 'outro', descricao: '', status: 'pendente' });
      
      // Atualizar licitação selecionada
      const response = await axios.get(`${API}/agenda-licitacoes/${selectedLicitacao.id}`, getAuthHeader());
      setSelectedLicitacao(response.data);
      fetchLicitacoes();
    } catch (error) {
      toast.error('Erro ao adicionar evento');
    }
  };

  // Alterar status do evento
  const handleAlterarStatusEvento = async (eventoId, novoStatus) => {
    try {
      await axios.put(
        `${API}/agenda-licitacoes/${selectedLicitacao.id}/eventos/${eventoId}/status?status=${novoStatus}`,
        {},
        getAuthHeader()
      );
      toast.success('Status do evento atualizado!');
      const response = await axios.get(`${API}/agenda-licitacoes/${selectedLicitacao.id}`, getAuthHeader());
      setSelectedLicitacao(response.data);
      fetchLicitacoes();
    } catch (error) {
      toast.error('Erro ao atualizar status do evento');
    }
  };

  // Excluir evento
  const handleExcluirEvento = async (eventoId) => {
    if (!window.confirm('Excluir este evento?')) return;
    
    try {
      await axios.delete(`${API}/agenda-licitacoes/${selectedLicitacao.id}/eventos/${eventoId}`, getAuthHeader());
      toast.success('Evento excluído!');
      const response = await axios.get(`${API}/agenda-licitacoes/${selectedLicitacao.id}`, getAuthHeader());
      setSelectedLicitacao(response.data);
      fetchLicitacoes();
    } catch (error) {
      toast.error('Erro ao excluir evento');
    }
  };

  // Filtrar e ordenar licitações - prioriza as que vão acontecer primeiro
  const licitacoesFiltradas = useMemo(() => {
    const filtradas = licitacoes.filter(lic => {
      const matchSearch = searchTerm === '' || 
        lic.numero_licitacao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lic.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lic.portal?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = filtroStatus === 'todos' || lic.status === filtroStatus;
      const matchCidade = filtroCidade === 'todos' || lic.cidade === filtroCidade;
      const matchPortal = filtroPortal === 'todos' || lic.portal === filtroPortal;
      
      return matchSearch && matchStatus && matchCidade && matchPortal;
    });

    // Ordenar: licitações futuras primeiro (por data crescente), depois as passadas
    const agora = new Date();
    return filtradas.sort((a, b) => {
      const dataA = new Date(a.data_disputa);
      const dataB = new Date(b.data_disputa);
      const isFuturaA = dataA >= agora;
      const isFuturaB = dataB >= agora;

      // Se uma é futura e outra não, a futura vem primeiro
      if (isFuturaA && !isFuturaB) return -1;
      if (!isFuturaA && isFuturaB) return 1;

      // Ambas futuras: ordem crescente (mais próxima primeiro)
      // Ambas passadas: ordem decrescente (mais recente primeiro)
      if (isFuturaA) {
        return dataA - dataB;
      } else {
        return dataB - dataA;
      }
    });
  }, [licitacoes, searchTerm, filtroStatus, filtroCidade, filtroPortal]);

  // Separar licitações por período
  const licitacoesHoje = useMemo(() => {
    const hoje = new Date().toDateString();
    return licitacoesFiltradas.filter(lic => 
      new Date(lic.data_disputa).toDateString() === hoje
    );
  }, [licitacoesFiltradas]);

  const licitacoesProximas = useMemo(() => {
    const agora = new Date();
    const em48h = new Date(agora.getTime() + 48 * 60 * 60 * 1000);
    const hoje = agora.toDateString();
    
    return licitacoesFiltradas.filter(lic => {
      const data = new Date(lic.data_disputa);
      return data > agora && data <= em48h && data.toDateString() !== hoje;
    });
  }, [licitacoesFiltradas]);

  // Obter cidades e portais únicos para filtros
  const cidadesUnicas = [...new Set(licitacoes.map(l => l.cidade).filter(Boolean))];
  const portaisUnicos = [...new Set(licitacoes.map(l => l.portal).filter(Boolean))];

  // Estatísticas de participação
  const estatisticas = useMemo(() => {
    const totalParticipacoes = licitacoes.length;
    const licitacoesGanhas = licitacoes.filter(l => l.status === 'ganha');
    const licitacoesNaoGanhas = licitacoes.filter(l => l.status === 'perdida');
    const licitacoesAguardando = licitacoes.filter(l => l.status === 'aguardando');
    
    const quantidadeGanhas = licitacoesGanhas.length;
    const quantidadeNaoGanhas = licitacoesNaoGanhas.length;
    const quantidadeAguardando = licitacoesAguardando.length;
    
    // Somar valor estimado das licitações ganhas
    const valorTotalGanhas = licitacoesGanhas.reduce((acc, lic) => {
      return acc + (lic.valor_estimado || 0);
    }, 0);
    
    // Taxa de sucesso (considerando apenas finalizadas: ganhas + perdidas)
    const finalizadas = quantidadeGanhas + quantidadeNaoGanhas;
    const taxaSucesso = finalizadas > 0 ? (quantidadeGanhas / finalizadas) * 100 : 0;
    
    return {
      totalParticipacoes,
      quantidadeGanhas,
      quantidadeNaoGanhas,
      quantidadeAguardando,
      valorTotalGanhas,
      taxaSucesso
    };
  }, [licitacoes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="agenda-licitacoes-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">
            <Calendar className="inline-block h-8 w-8 mr-2 mb-1" />
            Agenda de Licitações
          </h1>
          <p className="text-muted-foreground mt-2">Dashboard central de controle e acompanhamento de licitações</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary/90" data-testid="add-licitacao-agenda-button">
              <Plus className="h-4 w-4 mr-2" />
              Nova Licitação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLicitacao ? 'Editar Licitação' : 'Nova Licitação'}</DialogTitle>
              <DialogDescription>Cadastre os dados da licitação</DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSalvar} className="space-y-4">
              {/* Data e Horário */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data da Disputa *</Label>
                  <Input
                    type="date"
                    value={formData.data_disputa}
                    onChange={(e) => setFormData({...formData, data_disputa: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horário *</Label>
                  <Input
                    type="time"
                    value={formData.horario_disputa}
                    onChange={(e) => setFormData({...formData, horario_disputa: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Número e Portal */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número da Licitação *</Label>
                  <Input
                    value={formData.numero_licitacao}
                    onChange={(e) => setFormData({...formData, numero_licitacao: e.target.value})}
                    placeholder="PE-001/2025"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Portal</Label>
                  <Select value={formData.portal} onValueChange={(v) => setFormData({...formData, portal: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o portal" />
                    </SelectTrigger>
                    <SelectContent>
                      {portaisPredefinidos.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cidade e Estado */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={formData.cidade}
                    onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                    placeholder="São Paulo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input
                    value={formData.estado}
                    onChange={(e) => setFormData({...formData, estado: e.target.value})}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>

              {/* Produtos */}
              <div className="space-y-2">
                <Label>Produtos (separados por vírgula)</Label>
                <Input
                  value={formData.produtos}
                  onChange={(e) => setFormData({...formData, produtos: e.target.value})}
                  placeholder="Produto A, Produto B, Produto C"
                />
              </div>

              {/* Objeto */}
              <div className="space-y-2">
                <Label>Objeto da Licitação</Label>
                <Textarea
                  value={formData.objeto}
                  onChange={(e) => setFormData({...formData, objeto: e.target.value})}
                  placeholder="Descrição do objeto..."
                  rows={3}
                />
              </div>

              {/* Valor Estimado */}
              <div className="space-y-2">
                <Label>Valor Estimado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_estimado}
                  onChange={(e) => setFormData({...formData, valor_estimado: e.target.value})}
                  placeholder="0,00"
                />
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  placeholder="Observações adicionais..."
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-secondary hover:bg-secondary/90">
                  {editingLicitacao ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alertas do Dia */}
      {licitacoesHoje.length > 0 && (
        <Alert className="border-red-500 bg-red-50">
          <Bell className="h-4 w-4 text-red-500" />
          <AlertTitle className="text-red-700">🔴 Licitações Hoje!</AlertTitle>
          <AlertDescription className="text-red-600">
            Você tem {licitacoesHoje.length} licitação(ões) agendada(s) para hoje:
            {licitacoesHoje.map(l => (
              <span key={l.id} className="ml-2 font-medium">{l.numero_licitacao} às {l.horario_disputa}</span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {licitacoesProximas.length > 0 && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-700">🟡 Próximas 48h</AlertTitle>
          <AlertDescription className="text-yellow-600">
            {licitacoesProximas.length} licitação(ões) nas próximas 48 horas
          </AlertDescription>
        </Alert>
      )}

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">Busca Rápida</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Número, cidade ou portal..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-40">
              <Label className="text-xs">Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="ganha">Vencemos</SelectItem>
                  <SelectItem value="perdida">Não Ganhamos</SelectItem>
                  <SelectItem value="aguardando">Aguardando Resultado</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Label className="text-xs">Cidade</Label>
              <Select value={filtroCidade} onValueChange={setFiltroCidade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {cidadesUnicas.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Label className="text-xs">Portal</Label>
              <Select value={filtroPortal} onValueChange={setFiltroPortal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {portaisUnicos.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Licitações */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Licitações Agendadas</CardTitle>
          <CardDescription>{licitacoesFiltradas.length} licitação(ões) encontrada(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {licitacoesFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Nenhuma licitação encontrada</p>
              <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar primeira licitação
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-bold">Data/Hora</TableHead>
                  <TableHead className="font-bold">Nº Licitação</TableHead>
                  <TableHead className="font-bold">Portal</TableHead>
                  <TableHead className="font-bold">Local</TableHead>
                  <TableHead className="font-bold">Produtos</TableHead>
                  <TableHead className="font-bold text-center">Status</TableHead>
                  <TableHead className="font-bold text-center">Resultado</TableHead>
                  <TableHead className="font-bold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licitacoesFiltradas.map((lic) => {
                  const hoje = new Date().toDateString();
                  const dataLic = new Date(lic.data_disputa).toDateString();
                  const isHoje = dataLic === hoje;
                  const isPast = new Date(lic.data_disputa) < new Date() && !isHoje;
                  
                  return (
                    <TableRow 
                      key={lic.id} 
                      className={`${isHoje ? 'bg-red-50' : isPast ? 'bg-gray-50' : ''}`}
                      data-testid={`agenda-row-${lic.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className={`h-4 w-4 ${isHoje ? 'text-red-500' : 'text-muted-foreground'}`} />
                          <div>
                            <p className={`font-medium ${isHoje ? 'text-red-600' : ''}`}>
                              {formatDate(lic.data_disputa)}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {lic.horario_disputa}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-primary">{lic.numero_licitacao}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{lic.portal || '-'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{lic.cidade}/{lic.estado}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-32 truncate" title={(lic.produtos || []).join(', ')}>
                          {(lic.produtos || []).slice(0, 2).join(', ')}
                          {(lic.produtos || []).length > 2 && '...'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(lic.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="relative">
                          <Button
                            variant={lic.status === 'ganha' ? 'default' : lic.status === 'perdida' ? 'destructive' : 'outline'}
                            size="sm"
                            className={`min-w-[100px] ${
                              lic.status === 'ganha' ? 'bg-green-600 hover:bg-green-700' : 
                              lic.status === 'perdida' ? 'bg-red-600 hover:bg-red-700' :
                              lic.status === 'aguardando' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''
                            }`}
                            onClick={() => setStatusDropdownOpen(statusDropdownOpen === lic.id ? null : lic.id)}
                          >
                            {lic.status === 'ganha' ? (
                              <><Trophy className="h-3 w-3 mr-1" /> VENCEMOS</>
                            ) : lic.status === 'perdida' ? (
                              <><XCircle className="h-3 w-3 mr-1" /> NÃO GANHAMOS</>
                            ) : lic.status === 'aguardando' ? (
                              <><Hourglass className="h-3 w-3 mr-1" /> AGUARDANDO</>
                            ) : (
                              'STATUS'
                            )}
                          </Button>
                          
                          {/* Dropdown Menu */}
                          {statusDropdownOpen === lic.id && (
                            <div className="absolute z-50 mt-1 right-0 w-48 bg-white border rounded-lg shadow-lg">
                              <div className="py-1">
                                <button
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 flex items-center gap-2 text-green-700"
                                  onClick={() => handleAlterarResultado(lic.id, 'ganha')}
                                >
                                  <Trophy className="h-4 w-4" />
                                  VENCEMOS
                                </button>
                                <button
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-700"
                                  onClick={() => handleAlterarResultado(lic.id, 'perdida')}
                                >
                                  <XCircle className="h-4 w-4" />
                                  NÃO GANHAMOS
                                </button>
                                <button
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-orange-50 flex items-center gap-2 text-orange-700"
                                  onClick={() => handleAlterarResultado(lic.id, 'aguardando')}
                                >
                                  <Hourglass className="h-4 w-4" />
                                  AGUARDANDO RESULTADO
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleVisualizar(lic)} title="Visualizar">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditar(lic)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleExcluir(lic.id)} title="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes da Licitação
            </DialogTitle>
            <DialogDescription>
              {selectedLicitacao?.numero_licitacao} - {selectedLicitacao?.cidade}/{selectedLicitacao?.estado}
            </DialogDescription>
          </DialogHeader>

          {selectedLicitacao && (
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="timeline">
                  Andamento ({(selectedLicitacao.eventos || []).length})
                </TabsTrigger>
                <TabsTrigger value="anexos">
                  Anexos ({(selectedLicitacao.anexos || []).length})
                </TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>

              {/* Aba Dados */}
              <TabsContent value="dados">
                <ScrollArea className="h-[50vh]">
                  <div className="space-y-4 p-2">
                    {/* Alertas */}
                    {(selectedLicitacao.alertas || []).length > 0 && (
                      <Alert className="border-yellow-500 bg-yellow-50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {selectedLicitacao.alertas.join(' | ')}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Status com ações */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Status atual:</p>
                        <div className="mt-1">{getStatusBadge(selectedLicitacao.status)}</div>
                      </div>
                      <Select 
                        value={selectedLicitacao.status} 
                        onValueChange={(v) => handleAlterarStatus(selectedLicitacao.id, v)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agendada">Agendada</SelectItem>
                          <SelectItem value="em_andamento">Em Andamento</SelectItem>
                          <SelectItem value="ganha">Vencemos</SelectItem>
                          <SelectItem value="perdida">Não Ganhamos</SelectItem>
                          <SelectItem value="aguardando">Aguardando Resultado</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Informações principais */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <p className="text-xs text-muted-foreground">Data da Disputa</p>
                        <p className="text-lg font-bold text-primary">
                          {formatDateTime(selectedLicitacao.data_disputa, selectedLicitacao.horario_disputa)}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Portal</p>
                        <p className="text-lg font-bold text-blue-600">{selectedLicitacao.portal || '-'}</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Número da Licitação</p>
                        <p className="font-medium">{selectedLicitacao.numero_licitacao}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Local</p>
                        <p className="font-medium">{selectedLicitacao.cidade}/{selectedLicitacao.estado}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor Estimado</p>
                        <p className="font-medium">{formatCurrency(selectedLicitacao.valor_estimado)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Produtos</p>
                        <p className="font-medium">{(selectedLicitacao.produtos || []).join(', ') || '-'}</p>
                      </div>
                    </div>

                    {selectedLicitacao.objeto && (
                      <div>
                        <p className="text-sm text-muted-foreground">Objeto</p>
                        <p className="text-sm mt-1 p-2 bg-slate-50 rounded">{selectedLicitacao.objeto}</p>
                      </div>
                    )}

                    {selectedLicitacao.observacoes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Observações</p>
                        <p className="text-sm mt-1 p-2 bg-slate-50 rounded">{selectedLicitacao.observacoes}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Aba Timeline/Andamento */}
              <TabsContent value="timeline">
                <ScrollArea className="h-[50vh]">
                  <div className="space-y-4 p-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">Agenda de Acontecimentos</h4>
                      <Button size="sm" onClick={() => setEventoDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Novo Evento
                      </Button>
                    </div>

                    {(selectedLicitacao.eventos || []).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CircleDot className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>Nenhum evento cadastrado</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedLicitacao.eventos.map((evento, idx) => (
                          <div key={evento.id || idx} className="flex gap-3 p-3 border rounded-lg">
                            <div className="flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full ${
                                evento.status === 'concluido' ? 'bg-green-500' :
                                evento.status === 'atrasado' ? 'bg-red-500' : 'bg-yellow-500'
                              }`} />
                              {idx < selectedLicitacao.eventos.length - 1 && (
                                <div className="w-0.5 h-full bg-gray-200 mt-1" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{evento.descricao}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(evento.data)} {evento.horario && `às ${evento.horario}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getEventoStatusBadge(evento.status)}
                                  <Select 
                                    value={evento.status} 
                                    onValueChange={(v) => handleAlterarStatusEvento(evento.id, v)}
                                  >
                                    <SelectTrigger className="w-28 h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pendente">Pendente</SelectItem>
                                      <SelectItem value="concluido">Concluído</SelectItem>
                                      <SelectItem value="atrasado">Atrasado</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={() => handleExcluirEvento(evento.id)}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {tiposEvento.find(t => t.value === evento.tipo)?.label || evento.tipo}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Aba Anexos */}
              <TabsContent value="anexos">
                <ScrollArea className="h-[50vh]">
                  <div className="space-y-4 p-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">Documentos Anexados</h4>
                    </div>

                    {/* Upload de arquivo */}
                    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Arraste um arquivo ou clique para selecionar
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Formatos aceitos: PDF, DOC, DOCX, JPG, PNG
                      </p>
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const formData = new FormData();
                          formData.append('file', file);
                          
                          try {
                            await axios.post(
                              `${API}/agenda-licitacoes/${selectedLicitacao.id}/upload`,
                              formData,
                              {
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                  'Content-Type': 'multipart/form-data'
                                }
                              }
                            );
                            toast.success('Arquivo enviado com sucesso!');
                            // Recarregar licitação
                            const response = await axios.get(`${API}/agenda-licitacoes/${selectedLicitacao.id}`, getAuthHeader());
                            setSelectedLicitacao(response.data);
                            fetchLicitacoes();
                          } catch (error) {
                            toast.error(error.response?.data?.detail || 'Erro ao enviar arquivo');
                          }
                          e.target.value = '';
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Selecionar Arquivo
                      </Button>
                    </div>

                    {(selectedLicitacao.anexos || []).length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>Nenhum anexo cadastrado</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedLicitacao.anexos.map((anexo, idx) => (
                          <div key={anexo.id || idx} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className={`h-5 w-5 ${anexo.tipo?.includes('pdf') ? 'text-red-500' : 'text-blue-500'}`} />
                              <div>
                                <p className="font-medium">{anexo.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(anexo.uploaded_at)} • {((anexo.tamanho || 0) / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  window.open(`${API}/agenda-licitacoes/${selectedLicitacao.id}/anexos/${anexo.id}/download`, '_blank');
                                }}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Baixar
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8"
                                onClick={async () => {
                                  if (!window.confirm('Excluir este anexo?')) return;
                                  try {
                                    await axios.delete(`${API}/agenda-licitacoes/${selectedLicitacao.id}/anexos/${anexo.id}`, getAuthHeader());
                                    toast.success('Anexo excluído!');
                                    const response = await axios.get(`${API}/agenda-licitacoes/${selectedLicitacao.id}`, getAuthHeader());
                                    setSelectedLicitacao(response.data);
                                    fetchLicitacoes();
                                  } catch (error) {
                                    toast.error('Erro ao excluir anexo');
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Aba Histórico */}
              <TabsContent value="historico">
                <ScrollArea className="h-[50vh]">
                  <div className="space-y-2 p-2">
                    {(selectedLicitacao.historico || []).length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Nenhum registro no histórico</p>
                    ) : (
                      selectedLicitacao.historico.map((h, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 text-sm border-l-2 border-primary/30">
                          <History className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p>{h.acao}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(h.data)} - {h.usuario}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Adicionar Evento */}
      <Dialog open={eventoDialogOpen} onOpenChange={setEventoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Evento</DialogTitle>
            <DialogDescription>Cadastre um novo evento na timeline</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={eventoForm.data}
                  onChange={(e) => setEventoForm({...eventoForm, data: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={eventoForm.horario}
                  onChange={(e) => setEventoForm({...eventoForm, horario: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Evento</Label>
              <Select value={eventoForm.tipo} onValueChange={(v) => setEventoForm({...eventoForm, tipo: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposEvento.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={eventoForm.descricao}
                onChange={(e) => setEventoForm({...eventoForm, descricao: e.target.value})}
                placeholder="Descrição do evento..."
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={eventoForm.status} onValueChange={(v) => setEventoForm({...eventoForm, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEventoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdicionarEvento}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
