import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Eye, Pencil, Trash2, FileText, Package, Truck, AlertTriangle, CheckCircle, X, DollarSign, Calendar, MapPin, Building2, ClipboardList, Receipt, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

// Função para formatar moeda
const formatCurrency = (value) => {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Função para formatar data
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

// Badge de status do contrato
const getStatusBadge = (status) => {
  const config = {
    'ativo': { variant: 'default', label: 'Ativo', className: 'bg-green-500' },
    'finalizado': { variant: 'default', label: 'Finalizado', className: 'bg-blue-500' },
    'vencido': { variant: 'destructive', label: 'Vencido', className: 'bg-red-500' },
    'pendente': { variant: 'secondary', label: 'Pendente', className: '' }
  };
  const { label, className } = config[status] || config.pendente;
  return <Badge className={className}>{label}</Badge>;
};

export default function Licitacoes() {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [fornecimentoDialogOpen, setFornecimentoDialogOpen] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState(null);
  const [editingContrato, setEditingContrato] = useState(null);

  // Estado do formulário de contrato
  const [contratoForm, setContratoForm] = useState({
    cidade: '',
    estado: '',
    numero_contrato: '',
    data_inicio: '',
    data_termino: '',
    valor_total_contrato: ''
  });

  // Estado dos produtos contratados
  const [produtosContratados, setProdutosContratados] = useState([]);
  const [novoProduto, setNovoProduto] = useState({
    descricao: '',
    preco_venda: '',
    preco_compra: '',
    quantidade_contratada: ''
  });

  // Estado do formulário de fornecimento
  const [fornecimentoForm, setFornecimentoForm] = useState({
    data_nota_empenho: '',
    numero_nota_empenho: '',
    data_fornecimento: new Date().toISOString().split('T')[0],
    numero_nota_fiscal: '',
    itens: [], // [{produto_id, quantidade, despesas: [{descricao, valor}]}]
    despesasGerais: [] // Despesas gerais do fornecimento
  });

  // Estado para nova despesa
  const [novaDespesa, setNovaDespesa] = useState({ descricao: '', valor: '' });

  useEffect(() => {
    fetchContratos();
  }, []);

  const fetchContratos = async () => {
    try {
      const response = await axios.get(`${API}/licitacoes`, getAuthHeader());
      setContratos(response.data);
    } catch (error) {
      toast.error('Erro ao carregar contratos');
    } finally {
      setLoading(false);
    }
  };

  // Reset forms
  const resetContratoForm = () => {
    setContratoForm({
      cidade: '',
      estado: '',
      numero_contrato: '',
      data_inicio: '',
      data_termino: '',
      valor_total_contrato: ''
    });
    setProdutosContratados([]);
    setNovoProduto({
      descricao: '',
      preco_venda: '',
      preco_compra: '',
      quantidade_contratada: ''
    });
    setEditingContrato(null);
  };

  const resetFornecimentoForm = () => {
    setFornecimentoForm({
      data_nota_empenho: '',
      numero_nota_empenho: '',
      data_fornecimento: new Date().toISOString().split('T')[0],
      numero_nota_fiscal: '',
      itens: [],
      despesasGerais: []
    });
    setNovaDespesa({ descricao: '', valor: '' });
  };

  // Adicionar produto ao contrato
  const adicionarProduto = () => {
    if (!novoProduto.descricao || !novoProduto.quantidade_contratada || !novoProduto.preco_venda || !novoProduto.preco_compra) {
      toast.error('Preencha todos os campos do produto');
      return;
    }

    const qtd = parseFloat(novoProduto.quantidade_contratada) || 0;
    const precoVenda = parseFloat(novoProduto.preco_venda) || 0;
    const precoCompra = parseFloat(novoProduto.preco_compra) || 0;
    const margemLucro = precoVenda - precoCompra;

    const produto = {
      id: Date.now().toString(),
      descricao: novoProduto.descricao,
      preco_venda: precoVenda,
      preco_compra: precoCompra,
      quantidade_contratada: qtd,
      quantidade_fornecida: 0,
      quantidade_restante: qtd,
      margem_lucro_unitaria: margemLucro,
      valor_total: precoVenda * qtd
    };

    setProdutosContratados([...produtosContratados, produto]);
    setNovoProduto({
      descricao: '',
      preco_venda: '',
      preco_compra: '',
      quantidade_contratada: ''
    });
    toast.success('Produto adicionado!');
  };

  // Remover produto (apenas se não tiver fornecimento)
  const removerProduto = (produtoId) => {
    const produto = produtosContratados.find(p => p.id === produtoId);
    if (produto && produto.quantidade_fornecida > 0) {
      toast.error('Não é possível remover produto com fornecimento vinculado');
      return;
    }
    setProdutosContratados(produtosContratados.filter(p => p.id !== produtoId));
  };

  // Calcular totais do contrato
  const calcularTotaisContrato = () => {
    const qtdTotalContratada = produtosContratados.reduce((acc, p) => acc + p.quantidade_contratada, 0);
    const qtdTotalFornecida = produtosContratados.reduce((acc, p) => acc + (p.quantidade_fornecida || 0), 0);
    const qtdTotalRestante = qtdTotalContratada - qtdTotalFornecida;
    const valorTotalContrato = produtosContratados.reduce((acc, p) => acc + p.valor_total, 0);
    const lucroEstimado = produtosContratados.reduce((acc, p) => acc + (p.margem_lucro_unitaria * p.quantidade_contratada), 0);

    return {
      qtdTotalContratada,
      qtdTotalFornecida,
      qtdTotalRestante,
      valorTotalContrato,
      lucroEstimado
    };
  };

  // Salvar contrato
  const handleSalvarContrato = async (e) => {
    e.preventDefault();

    // Validações obrigatórias
    if (!contratoForm.cidade || !contratoForm.estado || !contratoForm.numero_contrato || 
        !contratoForm.data_inicio || !contratoForm.data_termino) {
      toast.error('Preencha todos os campos obrigatórios do contrato');
      return;
    }

    if (produtosContratados.length === 0) {
      toast.error('Adicione pelo menos um produto ao contrato');
      return;
    }

    const totais = calcularTotaisContrato();

    try {
      const payload = {
        numero_contrato: contratoForm.numero_contrato,
        data_inicio_contrato: new Date(contratoForm.data_inicio).toISOString(),
        data_fim_contrato: new Date(contratoForm.data_termino).toISOString(),
        numero_licitacao: contratoForm.numero_contrato,
        cidade: contratoForm.cidade,
        estado: contratoForm.estado,
        orgao_publico: contratoForm.cidade,
        numero_empenho: contratoForm.numero_contrato,
        data_empenho: new Date(contratoForm.data_inicio).toISOString(),
        numero_nota_empenho: '',
        produtos: produtosContratados.map(p => ({
          descricao: p.descricao,
          quantidade_contratada: p.quantidade_contratada,
          preco_compra: p.preco_compra,
          preco_venda: p.preco_venda,
          quantidade_fornecida: p.quantidade_fornecida || 0
        })),
        frete: 0,
        impostos: 0,
        outras_despesas: 0
      };

      if (editingContrato) {
        await axios.put(`${API}/licitacoes/${editingContrato.id}`, payload, getAuthHeader());
        toast.success('Contrato atualizado com sucesso!');
      } else {
        await axios.post(`${API}/licitacoes`, payload, getAuthHeader());
        toast.success('Contrato cadastrado com sucesso!');
      }

      setDialogOpen(false);
      resetContratoForm();
      fetchContratos();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Erro ao salvar contrato');
    }
  };

  // Abrir modal de edição
  const handleEditarContrato = (contrato) => {
    setEditingContrato(contrato);
    setContratoForm({
      cidade: contrato.cidade || '',
      estado: contrato.estado || '',
      numero_contrato: contrato.contrato?.numero_contrato || contrato.numero_licitacao || '',
      data_inicio: contrato.contrato?.data_inicio ? new Date(contrato.contrato.data_inicio).toISOString().split('T')[0] : '',
      data_termino: contrato.contrato?.data_fim ? new Date(contrato.contrato.data_fim).toISOString().split('T')[0] : '',
      valor_total_contrato: contrato.valor_total_venda?.toString() || ''
    });

    const produtosConvertidos = (contrato.produtos || []).map(p => ({
      id: p.id || Date.now().toString() + Math.random(),
      descricao: p.descricao,
      preco_venda: p.preco_venda || 0,
      preco_compra: p.preco_compra || 0,
      quantidade_contratada: p.quantidade_contratada || p.quantidade_empenhada || 0,
      quantidade_fornecida: p.quantidade_fornecida || 0,
      quantidade_restante: (p.quantidade_contratada || 0) - (p.quantidade_fornecida || 0),
      margem_lucro_unitaria: (p.preco_venda || 0) - (p.preco_compra || 0),
      valor_total: (p.preco_venda || 0) * (p.quantidade_contratada || 0)
    }));

    setProdutosContratados(produtosConvertidos);
    setDialogOpen(true);
  };

  // Abrir modal de visualização
  const handleVisualizarContrato = (contrato) => {
    setSelectedContrato(contrato);
    setViewDialogOpen(true);
  };

  // Excluir contrato
  const handleExcluirContrato = async (contratoId) => {
    const contrato = contratos.find(c => c.id === contratoId);
    if (contrato && (contrato.fornecimentos || []).length > 0) {
      toast.error('Não é possível excluir contrato com fornecimentos vinculados');
      return;
    }

    if (!window.confirm('Tem certeza que deseja excluir este contrato?')) return;

    try {
      await axios.delete(`${API}/licitacoes/${contratoId}`, getAuthHeader());
      toast.success('Contrato excluído com sucesso!');
      fetchContratos();
    } catch (error) {
      toast.error('Erro ao excluir contrato');
    }
  };

  // Abrir modal de fornecimento
  const handleAbrirFornecimento = (contrato) => {
    setSelectedContrato(contrato);
    resetFornecimentoForm();
    
    // Inicializar itens com produtos disponíveis
    const itensDisponiveis = (contrato.produtos || [])
      .filter(p => {
        const qtdContratada = p.quantidade_contratada || p.quantidade_empenhada || 0;
        const qtdFornecida = p.quantidade_fornecida || 0;
        return qtdContratada > qtdFornecida;
      })
      .map(p => ({
        produto_id: p.id,
        descricao: p.descricao,
        quantidade_disponivel: (p.quantidade_contratada || p.quantidade_empenhada || 0) - (p.quantidade_fornecida || 0),
        quantidade: '',
        preco_venda: p.preco_venda || 0,
        preco_compra: p.preco_compra || 0
      }));

    setFornecimentoForm(prev => ({ ...prev, itens: itensDisponiveis }));
    setFornecimentoDialogOpen(true);
  };

  // Atualizar quantidade de fornecimento por item
  const handleQuantidadeFornecimento = (produtoId, quantidade) => {
    setFornecimentoForm(prev => ({
      ...prev,
      itens: prev.itens.map(item => 
        item.produto_id === produtoId 
          ? { ...item, quantidade: quantidade }
          : item
      )
    }));
  };

  // Calcular valores do fornecimento
  const calcularValoresFornecimento = () => {
    const itensComQuantidade = fornecimentoForm.itens.filter(item => parseFloat(item.quantidade) > 0);
    
    const totalVenda = itensComQuantidade.reduce((acc, item) => {
      return acc + (parseFloat(item.quantidade) * item.preco_venda);
    }, 0);

    const totalCompra = itensComQuantidade.reduce((acc, item) => {
      return acc + (parseFloat(item.quantidade) * item.preco_compra);
    }, 0);

    const totalDespesas = fornecimentoForm.despesasGerais.reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);

    const lucro = totalVenda - totalCompra - totalDespesas;

    return { totalVenda, totalCompra, totalDespesas, lucro };
  };

  // Adicionar despesa ao fornecimento
  const adicionarDespesa = () => {
    if (!novaDespesa.descricao || !novaDespesa.valor) {
      toast.error('Preencha a descrição e valor da despesa');
      return;
    }
    setFornecimentoForm(prev => ({
      ...prev,
      despesasGerais: [...prev.despesasGerais, { 
        id: Date.now().toString(),
        descricao: novaDespesa.descricao, 
        valor: parseFloat(novaDespesa.valor) || 0 
      }]
    }));
    setNovaDespesa({ descricao: '', valor: '' });
  };

  // Remover despesa
  const removerDespesa = (despesaId) => {
    setFornecimentoForm(prev => ({
      ...prev,
      despesasGerais: prev.despesasGerais.filter(d => d.id !== despesaId)
    }));
  };

  // Registrar fornecimento
  const handleRegistrarFornecimento = async () => {
    const itensComQuantidade = fornecimentoForm.itens.filter(item => parseFloat(item.quantidade) > 0);

    if (itensComQuantidade.length === 0) {
      toast.error('Informe a quantidade de pelo menos um produto');
      return;
    }

    if (!fornecimentoForm.data_fornecimento || !fornecimentoForm.numero_nota_fiscal) {
      toast.error('Preencha a data e número da nota fiscal');
      return;
    }

    // Validar quantidades
    for (const item of itensComQuantidade) {
      const qtd = parseFloat(item.quantidade);
      if (qtd > item.quantidade_disponivel) {
        toast.error(`Quantidade de "${item.descricao}" excede o disponível (${item.quantidade_disponivel})`);
        return;
      }
    }

    try {
      // Registrar cada item como fornecimento com despesas rateadas
      const despesasPorItem = fornecimentoForm.despesasGerais.length > 0 && itensComQuantidade.length > 0
        ? fornecimentoForm.despesasGerais.map(d => ({
            descricao: d.descricao,
            valor: d.valor / itensComQuantidade.length // Ratear despesas
          }))
        : [];

      for (const item of itensComQuantidade) {
        await axios.post(
          `${API}/licitacoes/${selectedContrato.id}/fornecimentos`,
          {
            produto_contrato_id: item.produto_id,
            quantidade: parseFloat(item.quantidade),
            data_fornecimento: new Date(fornecimentoForm.data_fornecimento).toISOString(),
            numero_nota_fornecimento: fornecimentoForm.numero_nota_fiscal,
            numero_nota_empenho: fornecimentoForm.numero_nota_empenho || null,
            observacao: `NE: ${fornecimentoForm.numero_nota_empenho || 'N/A'}`,
            despesas: despesasPorItem
          },
          getAuthHeader()
        );
      }

      toast.success('Fornecimento registrado com sucesso!');
      setFornecimentoDialogOpen(false);
      resetFornecimentoForm();
      fetchContratos();

      // Atualizar contrato selecionado se modal de visualização estiver aberto
      if (viewDialogOpen) {
        const response = await axios.get(`${API}/licitacoes/${selectedContrato.id}`, getAuthHeader());
        setSelectedContrato(response.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar fornecimento');
    }
  };

  // Calcular status automático do contrato
  const calcularStatusContrato = (contrato) => {
    const hoje = new Date();
    const dataFim = contrato.contrato?.data_fim ? new Date(contrato.contrato.data_fim) : null;
    const qtdContratada = contrato.quantidade_total_contratada || 0;
    const qtdFornecida = contrato.quantidade_total_fornecida || 0;

    if (qtdContratada > 0 && qtdFornecida >= qtdContratada) {
      return 'finalizado';
    }
    if (dataFim && hoje > dataFim) {
      return 'vencido';
    }
    return 'ativo';
  };

  const totaisFormulario = calcularTotaisContrato();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="licitacoes-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">Licitações / Contratos</h1>
          <p className="text-muted-foreground mt-2">Gestão completa de contratos e fornecimentos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetContratoForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary/90" data-testid="add-contrato-button">
              <Plus className="h-4 w-4 mr-2" />
              Novo Contrato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>{editingContrato ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
              <DialogDescription>Preencha os dados do contrato e adicione os produtos</DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSalvarContrato}>
              <ScrollArea className="h-[70vh] pr-4">
                {/* Layout de 3 colunas como na referência */}
                <div className="grid grid-cols-3 gap-4">
                  
                  {/* COLUNA 1: CONTRATO */}
                  <Card className="border-2 border-primary">
                    <CardHeader className="bg-primary/10 py-3">
                      <CardTitle className="flex items-center gap-2 text-primary text-lg">
                        <FileText className="h-5 w-5" />
                        CONTRATO
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Cidade *</Label>
                          <Input
                            value={contratoForm.cidade}
                            onChange={(e) => setContratoForm({...contratoForm, cidade: e.target.value})}
                            placeholder="São Paulo"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Estado *</Label>
                          <Input
                            value={contratoForm.estado}
                            onChange={(e) => setContratoForm({...contratoForm, estado: e.target.value})}
                            placeholder="SP"
                            maxLength={2}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Número do Contrato *</Label>
                        <Input
                          value={contratoForm.numero_contrato}
                          onChange={(e) => setContratoForm({...contratoForm, numero_contrato: e.target.value})}
                          placeholder="CT-2025/001"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Início do Contrato *</Label>
                        <Input
                          type="date"
                          value={contratoForm.data_inicio}
                          onChange={(e) => setContratoForm({...contratoForm, data_inicio: e.target.value})}
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Término *</Label>
                        <Input
                          type="date"
                          value={contratoForm.data_termino}
                          onChange={(e) => setContratoForm({...contratoForm, data_termino: e.target.value})}
                          required
                        />
                      </div>

                      <Separator className="my-3" />

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-primary">VALOR TOTAL DO CONTRATO</Label>
                        <div className="text-2xl font-bold text-primary">
                          {formatCurrency(totaisFormulario.valorTotalContrato)}
                        </div>
                      </div>

                      <Separator className="my-3" />

                      {/* Produtos Contratados */}
                      <div className="space-y-3">
                        <Label className="text-xs font-semibold">PRODUTOS CONTRATADOS:</Label>
                        
                        {/* Form para adicionar produto */}
                        <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                          <Input
                            placeholder="Produto"
                            value={novoProduto.descricao}
                            onChange={(e) => setNovoProduto({...novoProduto, descricao: e.target.value})}
                            className="h-8 text-sm"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Preço Venda</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                value={novoProduto.preco_venda}
                                onChange={(e) => setNovoProduto({...novoProduto, preco_venda: e.target.value})}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Preço Compra</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                value={novoProduto.preco_compra}
                                onChange={(e) => setNovoProduto({...novoProduto, preco_compra: e.target.value})}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              placeholder="Qtd"
                              value={novoProduto.quantidade_contratada}
                              onChange={(e) => setNovoProduto({...novoProduto, quantidade_contratada: e.target.value})}
                              className="h-8 text-sm flex-1"
                            />
                            <Button type="button" size="sm" onClick={adicionarProduto} className="h-8">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Lista de produtos */}
                        {produtosContratados.length > 0 && (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {produtosContratados.map((produto, idx) => (
                              <div key={produto.id} className="flex items-center justify-between p-2 bg-white border rounded text-xs">
                                <div className="flex-1">
                                  <p className="font-medium">{produto.descricao}</p>
                                  <p className="text-muted-foreground">
                                    Qtd: {produto.quantidade_contratada} | Venda: {formatCurrency(produto.preco_venda)} | Compra: {formatCurrency(produto.preco_compra)}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => removerProduto(produto.id)}
                                >
                                  <X className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Separator className="my-3" />

                      {/* Execução */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">EXECUÇÃO</Label>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="p-2 bg-green-50 rounded">
                            <p className="text-xs text-muted-foreground">QTD FORNECIDA</p>
                            <p className="font-bold text-green-600">{totaisFormulario.qtdTotalFornecida}</p>
                          </div>
                          <div className="p-2 bg-orange-50 rounded">
                            <p className="text-xs text-muted-foreground">QTD RESTANTE</p>
                            <p className="font-bold text-orange-600">{totaisFormulario.qtdTotalRestante}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* COLUNA 2: FORNECIMENTO (apenas visualização no form) */}
                  <Card className="border-2 border-blue-400">
                    <CardHeader className="bg-blue-50 py-3">
                      <CardTitle className="flex items-center gap-2 text-blue-600 text-lg">
                        <Truck className="h-5 w-5" />
                        FORNECIMENTO
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="text-center py-8 text-muted-foreground">
                        <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Os fornecimentos serão registrados após salvar o contrato.</p>
                        <p className="text-xs mt-2">Use o botão &quot;Fornecer&quot; na lista de contratos.</p>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">VALORES (Previsão)</Label>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between p-2 bg-slate-50 rounded">
                            <span>Total por nota de Empenho</span>
                            <span className="font-medium">-</span>
                          </div>
                          <div className="flex justify-between p-2 bg-slate-50 rounded">
                            <span>Total de compras</span>
                            <span className="font-medium">-</span>
                          </div>
                          <div className="flex justify-between p-2 bg-slate-50 rounded">
                            <span>Total de Lucros</span>
                            <span className="font-medium">-</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* COLUNA 3: FINANCEIRO */}
                  <Card className="border-2 border-green-500">
                    <CardHeader className="bg-green-50 py-3">
                      <CardTitle className="flex items-center gap-2 text-green-600 text-lg">
                        <DollarSign className="h-5 w-5" />
                        FINANCEIRO
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="space-y-3">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <p className="text-xs text-muted-foreground">Total do Contrato</p>
                          <p className="text-xl font-bold text-primary">{formatCurrency(totaisFormulario.valorTotalContrato)}</p>
                        </div>

                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-xs text-muted-foreground">TOTAL FORNECIDO</p>
                          <p className="text-xl font-bold text-green-600">{formatCurrency(0)}</p>
                        </div>

                        <Separator />

                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Total de Compras</p>
                          <p className="text-lg font-bold text-blue-600">{formatCurrency(0)}</p>
                        </div>

                        <div className="p-3 bg-emerald-100 rounded-lg">
                          <p className="text-xs text-muted-foreground">Total de Lucros do Contrato</p>
                          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totaisFormulario.lucroEstimado)}</p>
                          <p className="text-xs text-muted-foreground">(Estimado)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>

              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetContratoForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-secondary hover:bg-secondary/90">
                  {editingContrato ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Contratos */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading">Contratos Cadastrados</CardTitle>
          <CardDescription>Visão geral de todos os contratos de licitação</CardDescription>
        </CardHeader>
        <CardContent>
          {contratos.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Nenhum contrato cadastrado</p>
              <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro contrato
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-bold">Contrato</TableHead>
                  <TableHead className="font-bold">Local</TableHead>
                  <TableHead className="font-bold">Vigência</TableHead>
                  <TableHead className="font-bold text-center">Execução</TableHead>
                  <TableHead className="font-bold text-right">Valor Total</TableHead>
                  <TableHead className="font-bold text-right">Fornecido</TableHead>
                  <TableHead className="font-bold text-right">Lucro</TableHead>
                  <TableHead className="font-bold text-center">Status</TableHead>
                  <TableHead className="font-bold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map((contrato) => {
                  const status = calcularStatusContrato(contrato);
                  const percentual = contrato.percentual_executado || 0;
                  const totalFornecido = (contrato.produtos || []).reduce((acc, p) => {
                    return acc + ((p.quantidade_fornecida || 0) * (p.preco_venda || 0));
                  }, 0);
                  const totalCompras = (contrato.produtos || []).reduce((acc, p) => {
                    return acc + ((p.quantidade_fornecida || 0) * (p.preco_compra || 0));
                  }, 0);
                  const lucroRealizado = totalFornecido - totalCompras;

                  return (
                    <TableRow key={contrato.id} data-testid={`contrato-row-${contrato.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-bold text-primary">{contrato.contrato?.numero_contrato || contrato.numero_licitacao}</p>
                          <p className="text-xs text-muted-foreground">{(contrato.produtos || []).length} produto(s)</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{contrato.cidade}/{contrato.estado}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{formatDate(contrato.contrato?.data_inicio || contrato.data_empenho)}</p>
                          <p className="text-muted-foreground">até {formatDate(contrato.contrato?.data_fim)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 w-24">
                          <Progress value={percentual} className="h-2" />
                          <div className="flex justify-between text-xs">
                            <span className="text-green-600">{contrato.quantidade_total_fornecida || 0}</span>
                            <span className="text-muted-foreground">/</span>
                            <span>{contrato.quantidade_total_contratada || 0}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-bold">{formatCurrency(contrato.valor_total_venda)}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="text-green-600 font-medium">{formatCurrency(totalFornecido)}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="text-emerald-600 font-bold">{formatCurrency(lucroRealizado)}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          {getStatusBadge(status)}
                          {(contrato.alertas || []).length > 0 && (
                            <div className="text-xs text-orange-600">
                              {contrato.alertas[0]}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleVisualizarContrato(contrato)} title="Visualizar">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleAbrirFornecimento(contrato)} title="Fornecer" className="text-green-600 hover:text-green-700">
                            <Truck className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditarContrato(contrato)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleExcluirContrato(contrato.id)} title="Excluir">
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

      {/* Modal de Visualização - Layout de 3 colunas */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Detalhes do Contrato</DialogTitle>
            <DialogDescription>Visualização completa do contrato, fornecimentos e financeiro</DialogDescription>
          </DialogHeader>

          {selectedContrato && (
            <ScrollArea className="h-[75vh]">
              {/* Alertas */}
              {(selectedContrato.alertas || []).length > 0 && (
                <div className="mb-4 space-y-2">
                  {selectedContrato.alertas.map((alerta, idx) => (
                    <Alert key={idx} variant={alerta.includes('VENCIDO') ? 'destructive' : 'default'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Atenção</AlertTitle>
                      <AlertDescription>{alerta}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                {/* COLUNA 1: CONTRATO */}
                <Card className="border-2 border-primary">
                  <CardHeader className="bg-primary/10 py-3">
                    <CardTitle className="flex items-center gap-2 text-primary text-lg">
                      <FileText className="h-5 w-5" />
                      CONTRATO
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Cidade</p>
                        <p className="font-medium">{selectedContrato.cidade}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Estado</p>
                        <p className="font-medium">{selectedContrato.estado}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Número do Contrato</p>
                      <p className="font-bold text-lg text-primary">{selectedContrato.contrato?.numero_contrato || selectedContrato.numero_licitacao}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Início</p>
                        <p className="font-medium">{formatDate(selectedContrato.contrato?.data_inicio)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Término</p>
                        <p className="font-medium">{formatDate(selectedContrato.contrato?.data_fim)}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-primary/10 rounded-lg">
                      <p className="text-xs text-muted-foreground">VALOR TOTAL DO CONTRATO</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(selectedContrato.valor_total_venda)}</p>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-xs font-semibold mb-2">PRODUTOS CONTRATADOS:</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(selectedContrato.produtos || []).map((produto, idx) => {
                          const qtdContratada = produto.quantidade_contratada || produto.quantidade_empenhada || 0;
                          const qtdFornecida = produto.quantidade_fornecida || 0;
                          const qtdRestante = qtdContratada - qtdFornecida;
                          
                          return (
                            <div key={idx} className="p-2 bg-slate-50 rounded text-xs">
                              <p className="font-medium">{produto.descricao}</p>
                              <div className="grid grid-cols-3 gap-1 mt-1">
                                <span>Venda: {formatCurrency(produto.preco_venda)}</span>
                                <span>Compra: {formatCurrency(produto.preco_compra)}</span>
                                <span>Qtd: {qtdContratada}</span>
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <Progress value={(qtdFornecida / qtdContratada) * 100} className="h-1 flex-1" />
                                <span className="text-xs">{qtdFornecida}/{qtdContratada}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-xs font-semibold mb-2">EXECUÇÃO</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-green-50 rounded text-center">
                          <p className="text-xs text-muted-foreground">FORNECIDA</p>
                          <p className="text-xl font-bold text-green-600">{selectedContrato.quantidade_total_fornecida || 0}</p>
                        </div>
                        <div className="p-2 bg-orange-50 rounded text-center">
                          <p className="text-xs text-muted-foreground">RESTANTE</p>
                          <p className="text-xl font-bold text-orange-600">{selectedContrato.quantidade_total_restante || 0}</p>
                        </div>
                      </div>
                      <Progress value={selectedContrato.percentual_executado || 0} className="h-3 mt-2" />
                      <p className="text-center text-xs mt-1">{(selectedContrato.percentual_executado || 0).toFixed(1)}% executado</p>
                    </div>
                  </CardContent>
                </Card>

                {/* COLUNA 2: FORNECIMENTO */}
                <Card className="border-2 border-blue-400">
                  <CardHeader className="bg-blue-50 py-3">
                    <CardTitle className="flex items-center gap-2 text-blue-600 text-lg">
                      <Truck className="h-5 w-5" />
                      FORNECIMENTO
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4 text-sm">
                    {(selectedContrato.fornecimentos || []).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>Nenhum fornecimento registrado</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3"
                          onClick={() => {
                            setViewDialogOpen(false);
                            handleAbrirFornecimento(selectedContrato);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Registrar Fornecimento
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {selectedContrato.fornecimentos.map((forn, idx) => {
                            const produto = (selectedContrato.produtos || []).find(p => p.id === forn.produto_contrato_id);
                            return (
                              <div key={idx} className="p-3 bg-blue-50/50 border border-blue-100 rounded">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-medium text-sm">{produto?.descricao || 'Produto'}</p>
                                    <p className="text-xs text-muted-foreground">NF: {forn.numero_nota_fornecimento || '-'}</p>
                                  </div>
                                  <Badge variant="outline" className="text-xs">{formatDate(forn.data_fornecimento)}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">Quantidade:</span>
                                    <span className="font-bold ml-1">{forn.quantidade}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Valor:</span>
                                    <span className="font-bold ml-1">{formatCurrency(forn.quantidade * (produto?.preco_venda || 0))}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setViewDialogOpen(false);
                            handleAbrirFornecimento(selectedContrato);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Novo Fornecimento
                        </Button>
                      </>
                    )}

                    <Separator />

                    <div>
                      <p className="text-xs font-semibold mb-2">VALORES</p>
                      {(() => {
                        const totalVendaFornecido = (selectedContrato.fornecimentos || []).reduce((acc, f) => {
                          const prod = (selectedContrato.produtos || []).find(p => p.id === f.produto_contrato_id);
                          return acc + (f.quantidade * (prod?.preco_venda || 0));
                        }, 0);
                        const totalCompraFornecido = (selectedContrato.fornecimentos || []).reduce((acc, f) => {
                          const prod = (selectedContrato.produtos || []).find(p => p.id === f.produto_contrato_id);
                          return acc + (f.quantidade * (prod?.preco_compra || 0));
                        }, 0);
                        const lucroFornecimentos = totalVendaFornecido - totalCompraFornecido;

                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between p-2 bg-slate-50 rounded">
                              <span className="text-xs">Total por nota de Empenho</span>
                              <span className="font-medium">{formatCurrency(totalVendaFornecido)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-slate-50 rounded">
                              <span className="text-xs">Total de compras</span>
                              <span className="font-medium">{formatCurrency(totalCompraFornecido)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-green-50 rounded">
                              <span className="text-xs font-semibold">Total de Lucros</span>
                              <span className="font-bold text-green-600">{formatCurrency(lucroFornecimentos)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* COLUNA 3: FINANCEIRO */}
                <Card className="border-2 border-green-500">
                  <CardHeader className="bg-green-50 py-3">
                    <CardTitle className="flex items-center gap-2 text-green-600 text-lg">
                      <DollarSign className="h-5 w-5" />
                      FINANCEIRO
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {(() => {
                      const totalFornecido = (selectedContrato.produtos || []).reduce((acc, p) => {
                        return acc + ((p.quantidade_fornecida || 0) * (p.preco_venda || 0));
                      }, 0);
                      const totalCompras = (selectedContrato.produtos || []).reduce((acc, p) => {
                        return acc + ((p.quantidade_fornecida || 0) * (p.preco_compra || 0));
                      }, 0);
                      const totalDespesas = (selectedContrato.fornecimentos || []).reduce((acc, f) => {
                        return acc + (f.total_despesas || 0);
                      }, 0);
                      const lucroRealizado = totalFornecido - totalCompras - totalDespesas;
                      const lucroEstimado = (selectedContrato.produtos || []).reduce((acc, p) => {
                        const qtd = p.quantidade_contratada || p.quantidade_empenhada || 0;
                        return acc + ((p.preco_venda || 0) - (p.preco_compra || 0)) * qtd;
                      }, 0);

                      // Agrupar fornecimentos por nota de empenho
                      const fornecimentosPorEmpenho = {};
                      (selectedContrato.fornecimentos || []).forEach(f => {
                        const ne = f.numero_nota_empenho || f.numero_nota_fornecimento || 'S/N';
                        if (!fornecimentosPorEmpenho[ne]) {
                          fornecimentosPorEmpenho[ne] = {
                            nota: ne,
                            data: f.data_fornecimento,
                            itens: [],
                            totalVenda: 0,
                            totalCompra: 0,
                            totalDespesas: 0
                          };
                        }
                        const prod = (selectedContrato.produtos || []).find(p => p.id === f.produto_contrato_id);
                        const venda = f.quantidade * (prod?.preco_venda || 0);
                        const compra = f.quantidade * (prod?.preco_compra || 0);
                        fornecimentosPorEmpenho[ne].itens.push({ ...f, produto: prod });
                        fornecimentosPorEmpenho[ne].totalVenda += venda;
                        fornecimentosPorEmpenho[ne].totalCompra += compra;
                        fornecimentosPorEmpenho[ne].totalDespesas += (f.total_despesas || 0);
                      });

                      return (
                        <>
                          <div className="p-4 bg-primary/10 rounded-lg text-center">
                            <p className="text-xs text-muted-foreground">Total do Contrato</p>
                            <p className="text-3xl font-bold text-primary">{formatCurrency(selectedContrato.valor_total_venda)}</p>
                          </div>

                          <div className="p-4 bg-green-100 rounded-lg text-center">
                            <p className="text-xs text-muted-foreground">TOTAL FORNECIDO</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalFornecido)}</p>
                          </div>

                          <Separator />

                          {/* Detalhes por Nota de Empenho */}
                          {Object.keys(fornecimentosPorEmpenho).length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-green-700">DETALHES POR EMPENHO:</p>
                              <div className="max-h-40 overflow-y-auto space-y-2">
                                {Object.values(fornecimentosPorEmpenho).map((emp, idx) => {
                                  const lucroEmp = emp.totalVenda - emp.totalCompra - emp.totalDespesas;
                                  return (
                                    <div key={idx} className="p-2 bg-white border border-green-200 rounded text-xs">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-green-700">NE: {emp.nota}</span>
                                        <Badge variant="outline" className="text-xs">{formatDate(emp.data)}</Badge>
                                      </div>
                                      <div className="grid grid-cols-2 gap-1">
                                        <div>Venda: <span className="font-medium">{formatCurrency(emp.totalVenda)}</span></div>
                                        <div>Compra: <span className="font-medium">{formatCurrency(emp.totalCompra)}</span></div>
                                        <div className="text-red-600">Despesas: <span className="font-medium">{formatCurrency(emp.totalDespesas)}</span></div>
                                        <div className="text-emerald-600">Lucro: <span className="font-bold">{formatCurrency(lucroEmp)}</span></div>
                                      </div>
                                      {emp.itens.some(i => (i.despesas || []).length > 0) && (
                                        <div className="mt-1 pt-1 border-t text-xs text-red-600">
                                          {emp.itens.flatMap(i => i.despesas || []).map((d, di) => (
                                            <div key={di}>• {d.descricao}: {formatCurrency(d.valor)}</div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <Separator />

                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Total de Compras</p>
                            <p className="text-xl font-bold text-blue-600">{formatCurrency(totalCompras)}</p>
                          </div>

                          <div className="p-3 bg-red-50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Total de Despesas</p>
                            <p className="text-xl font-bold text-red-600">{formatCurrency(totalDespesas)}</p>
                          </div>

                          <div className="p-4 bg-emerald-100 rounded-lg text-center">
                            <p className="text-xs text-muted-foreground">Total de Lucros do Contrato</p>
                            <p className="text-3xl font-bold text-emerald-600">{formatCurrency(lucroRealizado)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Estimado total: {formatCurrency(lucroEstimado)}
                            </p>
                          </div>

                          <Separator />

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">% Executado</span>
                              <span className="font-bold">{(selectedContrato.percentual_executado || 0).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">% Lucro/Contrato</span>
                              <span className="font-bold">
                                {selectedContrato.valor_total_venda > 0 
                                  ? ((lucroRealizado / selectedContrato.valor_total_venda) * 100).toFixed(1) 
                                  : 0}%
                              </span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fechar
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setViewDialogOpen(false);
                handleAbrirFornecimento(selectedContrato);
              }}
            >
              <Truck className="h-4 w-4 mr-2" />
              Registrar Fornecimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Fornecimento */}
      <Dialog open={fornecimentoDialogOpen} onOpenChange={setFornecimentoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Registrar Fornecimento
            </DialogTitle>
            <DialogDescription>
              Contrato: {selectedContrato?.contrato?.numero_contrato || selectedContrato?.numero_licitacao}
            </DialogDescription>
          </DialogHeader>

          {selectedContrato && (
            <div className="space-y-4">
              {/* Dados do Fornecimento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data da Nota de Empenho</Label>
                  <Input
                    type="date"
                    value={fornecimentoForm.data_nota_empenho}
                    onChange={(e) => setFornecimentoForm({...fornecimentoForm, data_nota_empenho: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nº Nota de Empenho</Label>
                  <Input
                    value={fornecimentoForm.numero_nota_empenho}
                    onChange={(e) => setFornecimentoForm({...fornecimentoForm, numero_nota_empenho: e.target.value})}
                    placeholder="NE-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data do Fornecimento *</Label>
                  <Input
                    type="date"
                    value={fornecimentoForm.data_fornecimento}
                    onChange={(e) => setFornecimentoForm({...fornecimentoForm, data_fornecimento: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nº Nota Fiscal *</Label>
                  <Input
                    value={fornecimentoForm.numero_nota_fiscal}
                    onChange={(e) => setFornecimentoForm({...fornecimentoForm, numero_nota_fiscal: e.target.value})}
                    placeholder="NF-001234"
                    required
                  />
                </div>
              </div>

              <Separator />

              {/* Produtos para Fornecer */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Produtos a Fornecer</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {fornecimentoForm.itens.map((item, idx) => (
                    <div key={item.produto_id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{item.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            Disponível: <span className="font-bold text-green-600">{item.quantidade_disponivel}</span> unidades
                          </p>
                        </div>
                        <div className="text-right text-xs">
                          <p>Venda: {formatCurrency(item.preco_venda)}</p>
                          <p>Compra: {formatCurrency(item.preco_compra)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Qtd a Fornecer:</Label>
                        <Input
                          type="number"
                          min="0"
                          max={item.quantidade_disponivel}
                          value={item.quantidade}
                          onChange={(e) => handleQuantidadeFornecimento(item.produto_id, e.target.value)}
                          className="h-8 w-24"
                          placeholder="0"
                        />
                        {parseFloat(item.quantidade) > 0 && (
                          <span className="text-sm font-medium text-green-600">
                            = {formatCurrency(parseFloat(item.quantidade) * item.preco_venda)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Despesas do Pedido */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-red-600">Despesas do Pedido</Label>
                <div className="p-3 bg-red-50 rounded-lg space-y-3">
                  {/* Lista de despesas adicionadas */}
                  {fornecimentoForm.despesasGerais.length > 0 && (
                    <div className="space-y-2">
                      {fornecimentoForm.despesasGerais.map((despesa) => (
                        <div key={despesa.id} className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                          <div className="flex-1">
                            <span className="text-sm">{despesa.descricao}</span>
                            <span className="ml-2 font-bold text-red-600">{formatCurrency(despesa.valor)}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removerDespesa(despesa.id)}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Formulário para adicionar despesa */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Descrição da Despesa</Label>
                      <Input
                        value={novaDespesa.descricao}
                        onChange={(e) => setNovaDespesa({...novaDespesa, descricao: e.target.value})}
                        placeholder="Ex: Frete, Taxa, Comissão..."
                        className="h-8"
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-xs">Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={novaDespesa.valor}
                        onChange={(e) => setNovaDespesa({...novaDespesa, valor: e.target.value})}
                        placeholder="0,00"
                        className="h-8"
                      />
                    </div>
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={adicionarDespesa}
                      className="h-8 bg-red-500 hover:bg-red-600"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {fornecimentoForm.despesasGerais.length > 0 && (
                    <div className="pt-2 border-t border-red-200">
                      <div className="flex justify-between text-sm font-bold">
                        <span>Total Despesas:</span>
                        <span className="text-red-600">
                          {formatCurrency(fornecimentoForm.despesasGerais.reduce((acc, d) => acc + d.valor, 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Resumo Financeiro */}
              {(() => {
                const valores = calcularValoresFornecimento();
                return (
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Total Venda</p>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(valores.totalVenda)}</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Total Compra</p>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(valores.totalCompra)}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Despesas</p>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(valores.totalDespesas)}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Lucro</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(valores.lucro)}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFornecimentoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegistrarFornecimento} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Fornecimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
