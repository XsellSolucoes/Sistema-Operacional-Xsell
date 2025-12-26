import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, Eye, Pencil, Trash2, FileText, Package, Calendar, Wallet, Truck, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function Licitacoes() {
  const [licitacoes, setLicitacoes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [fornecimentoOpen, setFornecimentoOpen] = useState(false);
  const [viewingLicitacao, setViewingLicitacao] = useState(null);
  const [editingLicitacao, setEditingLicitacao] = useState(null);
  const [produtoSelecionadoFornecimento, setProdutoSelecionadoFornecimento] = useState(null);

  // Estado do formulário principal
  const [formData, setFormData] = useState({
    // Contrato
    numero_contrato: '',
    data_inicio_contrato: '',
    data_fim_contrato: '',
    // Dados Gerais
    numero_licitacao: '',
    cidade: '',
    estado: '',
    orgao_publico: '',
    numero_empenho: '',
    data_empenho: '',
    numero_nota_empenho: '',
    // Datas
    previsao_fornecimento: '',
    previsao_pagamento: '',
    // Financeiro
    frete: '0',
    impostos: '0',
    outras_despesas: '0',
    descricao_outras_despesas: ''
  });

  // Estado dos produtos do contrato
  const [itensContrato, setItensContrato] = useState([]);
  const [novoItem, setNovoItem] = useState({
    produto_id: '',
    descricao: '',
    quantidade_contratada: '1',
    preco_compra: '0',
    preco_venda: '0',
    despesas_extras: '0'
  });

  // Estado do fornecimento
  const [fornecimentoData, setFornecimentoData] = useState({
    quantidade: '',
    data_fornecimento: new Date().toISOString().split('T')[0],
    numero_nota_fornecimento: '',
    observacao: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [licRes, prodRes] = await Promise.all([
        axios.get(`${API}/licitacoes`, getAuthHeader()),
        axios.get(`${API}/produtos`, getAuthHeader())
      ]);
      setLicitacoes(licRes.data);
      setProdutos(prodRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      numero_contrato: '',
      data_inicio_contrato: '',
      data_fim_contrato: '',
      numero_licitacao: '',
      cidade: '',
      estado: '',
      orgao_publico: '',
      numero_empenho: '',
      data_empenho: '',
      numero_nota_empenho: '',
      previsao_fornecimento: '',
      previsao_pagamento: '',
      frete: '0',
      impostos: '0',
      outras_despesas: '0',
      descricao_outras_despesas: ''
    });
    setItensContrato([]);
    setNovoItem({
      produto_id: '',
      descricao: '',
      quantidade_contratada: '1',
      preco_compra: '0',
      preco_venda: '0',
      despesas_extras: '0'
    });
    setEditingLicitacao(null);
  };

  const adicionarProdutoContrato = () => {
    if (!novoItem.descricao) {
      toast.error('Digite a descrição do produto');
      return;
    }

    const qtdContratada = parseFloat(novoItem.quantidade_contratada) || 0;
    const precoCompra = parseFloat(novoItem.preco_compra) || 0;
    const precoVenda = parseFloat(novoItem.preco_venda) || 0;
    const despesasExtras = parseFloat(novoItem.despesas_extras) || 0;
    const lucroUnitario = precoVenda - precoCompra - despesasExtras;
    const valorTotal = precoVenda * qtdContratada;

    const item = {
      id: Date.now().toString(),
      produto_id: novoItem.produto_id,
      descricao: novoItem.descricao,
      quantidade_contratada: qtdContratada,
      quantidade_fornecida: 0,
      quantidade_restante: qtdContratada,
      preco_compra: precoCompra,
      preco_venda: precoVenda,
      valor_total: valorTotal,
      despesas_extras: despesasExtras,
      lucro_unitario: lucroUnitario
    };

    setItensContrato([...itensContrato, item]);
    setNovoItem({
      produto_id: '',
      descricao: '',
      quantidade_contratada: '1',
      preco_compra: '0',
      preco_venda: '0',
      despesas_extras: '0'
    });
    toast.success('Produto adicionado ao contrato!');
  };

  const removerItem = (index) => {
    setItensContrato(itensContrato.filter((_, i) => i !== index));
  };

  const calcularTotais = () => {
    const valorTotalVenda = itensContrato.reduce((acc, item) => acc + item.valor_total, 0);
    const valorTotalCompra = itensContrato.reduce((acc, item) => acc + (item.preco_compra * item.quantidade_contratada), 0);
    const despesasProdutos = itensContrato.reduce((acc, item) => acc + (item.despesas_extras * item.quantidade_contratada), 0);
    const frete = parseFloat(formData.frete) || 0;
    const impostos = parseFloat(formData.impostos) || 0;
    const outrasDespesas = parseFloat(formData.outras_despesas) || 0;
    const despesasTotais = despesasProdutos + frete + impostos + outrasDespesas;
    const lucroTotal = valorTotalVenda - valorTotalCompra - despesasTotais;
    const qtdTotalContratada = itensContrato.reduce((acc, item) => acc + item.quantidade_contratada, 0);

    return { valorTotalVenda, valorTotalCompra, despesasTotais, lucroTotal, qtdTotalContratada };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.numero_contrato) {
      toast.error('Informe o número do contrato');
      return;
    }
    if (!formData.data_inicio_contrato || !formData.data_fim_contrato) {
      toast.error('Informe as datas do contrato');
      return;
    }
    if (itensContrato.length === 0) {
      toast.error('Adicione pelo menos um produto ao contrato');
      return;
    }

    try {
      const payload = {
        numero_contrato: formData.numero_contrato,
        data_inicio_contrato: new Date(formData.data_inicio_contrato).toISOString(),
        data_fim_contrato: new Date(formData.data_fim_contrato).toISOString(),
        numero_licitacao: formData.numero_licitacao,
        cidade: formData.cidade,
        estado: formData.estado,
        orgao_publico: formData.orgao_publico,
        numero_empenho: formData.numero_empenho,
        data_empenho: new Date(formData.data_empenho).toISOString(),
        numero_nota_empenho: formData.numero_nota_empenho,
        produtos: itensContrato.map(item => ({
          ...item,
          quantidade_contratada: item.quantidade_contratada,
          quantidade_fornecida: item.quantidade_fornecida || 0
        })),
        previsao_fornecimento: formData.previsao_fornecimento ? new Date(formData.previsao_fornecimento).toISOString() : null,
        previsao_pagamento: formData.previsao_pagamento ? new Date(formData.previsao_pagamento).toISOString() : null,
        frete: parseFloat(formData.frete) || 0,
        impostos: parseFloat(formData.impostos) || 0,
        outras_despesas: parseFloat(formData.outras_despesas) || 0,
        descricao_outras_despesas: formData.descricao_outras_despesas || null
      };

      if (editingLicitacao) {
        await axios.put(`${API}/licitacoes/${editingLicitacao.id}`, payload, getAuthHeader());
        toast.success('Licitação atualizada com sucesso!');
      } else {
        await axios.post(`${API}/licitacoes`, payload, getAuthHeader());
        toast.success('Licitação cadastrada com sucesso!');
      }
      
      setOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Erro ao salvar licitação');
    }
  };

  const handleEdit = (licitacao) => {
    setEditingLicitacao(licitacao);
    const contrato = licitacao.contrato || {};
    
    setFormData({
      numero_contrato: contrato.numero_contrato || licitacao.numero_licitacao || '',
      data_inicio_contrato: contrato.data_inicio ? new Date(contrato.data_inicio).toISOString().split('T')[0] : '',
      data_fim_contrato: contrato.data_fim ? new Date(contrato.data_fim).toISOString().split('T')[0] : '',
      numero_licitacao: licitacao.numero_licitacao,
      cidade: licitacao.cidade,
      estado: licitacao.estado,
      orgao_publico: licitacao.orgao_publico,
      numero_empenho: licitacao.numero_empenho,
      data_empenho: licitacao.data_empenho ? new Date(licitacao.data_empenho).toISOString().split('T')[0] : '',
      numero_nota_empenho: licitacao.numero_nota_empenho || '',
      previsao_fornecimento: licitacao.previsao_fornecimento ? new Date(licitacao.previsao_fornecimento).toISOString().split('T')[0] : '',
      previsao_pagamento: licitacao.previsao_pagamento ? new Date(licitacao.previsao_pagamento).toISOString().split('T')[0] : '',
      frete: licitacao.frete?.toString() || '0',
      impostos: licitacao.impostos?.toString() || '0',
      outras_despesas: licitacao.outras_despesas?.toString() || '0',
      descricao_outras_despesas: licitacao.descricao_outras_despesas || ''
    });
    
    // Converter produtos para o formato do formulário
    const produtosConvertidos = (licitacao.produtos || []).map(p => ({
      ...p,
      quantidade_contratada: p.quantidade_contratada || p.quantidade_empenhada || 0,
      quantidade_fornecida: p.quantidade_fornecida || 0,
      quantidade_restante: (p.quantidade_contratada || p.quantidade_empenhada || 0) - (p.quantidade_fornecida || 0),
      valor_total: (p.preco_venda || 0) * (p.quantidade_contratada || p.quantidade_empenhada || 0)
    }));
    
    setItensContrato(produtosConvertidos);
    setOpen(true);
  };

  const handleView = (licitacao) => {
    setViewingLicitacao(licitacao);
    setViewOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta licitação?')) return;
    
    try {
      await axios.delete(`${API}/licitacoes/${id}`, getAuthHeader());
      toast.success('Licitação excluída com sucesso!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir licitação');
    }
  };

  const handleStatusChange = async (id, novoStatus) => {
    try {
      await axios.put(`${API}/licitacoes/${id}/status?status=${novoStatus}`, {}, getAuthHeader());
      toast.success('Status atualizado!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const abrirFornecimento = (produto) => {
    setProdutoSelecionadoFornecimento(produto);
    setFornecimentoData({
      quantidade: '',
      data_fornecimento: new Date().toISOString().split('T')[0],
      numero_nota_fornecimento: '',
      observacao: ''
    });
    setFornecimentoOpen(true);
  };

  const registrarFornecimento = async () => {
    if (!fornecimentoData.quantidade || parseFloat(fornecimentoData.quantidade) <= 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }

    const qtdRestante = (produtoSelecionadoFornecimento.quantidade_contratada || produtoSelecionadoFornecimento.quantidade_empenhada || 0) 
                        - (produtoSelecionadoFornecimento.quantidade_fornecida || 0);
    
    if (parseFloat(fornecimentoData.quantidade) > qtdRestante) {
      toast.error(`Quantidade excede o disponível no contrato. Máximo: ${qtdRestante}`);
      return;
    }

    try {
      await axios.post(
        `${API}/licitacoes/${viewingLicitacao.id}/fornecimentos`,
        {
          produto_contrato_id: produtoSelecionadoFornecimento.id,
          quantidade: parseFloat(fornecimentoData.quantidade),
          data_fornecimento: new Date(fornecimentoData.data_fornecimento).toISOString(),
          numero_nota_fornecimento: fornecimentoData.numero_nota_fornecimento || null,
          observacao: fornecimentoData.observacao || null
        },
        getAuthHeader()
      );
      
      toast.success('Fornecimento registrado com sucesso!');
      setFornecimentoOpen(false);
      
      // Atualizar dados
      const response = await axios.get(`${API}/licitacoes/${viewingLicitacao.id}`, getAuthHeader());
      setViewingLicitacao(response.data);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar fornecimento');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value) => {
    return (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getStatusBadge = (status) => {
    const config = {
      'pendente': { variant: 'secondary', label: 'Pendente' },
      'pago': { variant: 'default', label: 'Pago' }
    };
    const { variant, label } = config[status] || config.pendente;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const totais = calcularTotais();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="licitacoes-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">Licitações</h1>
          <p className="text-muted-foreground mt-2">Gerencie contratos e licitações públicas</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary/90" data-testid="add-licitacao-button">
              <Plus className="h-4 w-4 mr-2" />
              Nova Licitação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLicitacao ? 'Editar Licitação' : 'Nova Licitação'}</DialogTitle>
              <DialogDescription>Preencha os dados do contrato e adicione os produtos</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                {/* QUADRO CONTRATO - Elemento Central */}
                <div className="col-span-1">
                  <Card className="border-2 border-primary bg-primary/5 sticky top-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-primary">
                        <FileText className="h-5 w-5" />
                        Contrato
                      </CardTitle>
                      <CardDescription>Elemento central da licitação</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="numero_contrato" className="text-primary font-semibold">Número do Contrato *</Label>
                        <Input
                          id="numero_contrato"
                          value={formData.numero_contrato}
                          onChange={(e) => setFormData({...formData, numero_contrato: e.target.value})}
                          required
                          placeholder="Ex: CT-2025/001"
                          className="border-primary/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-primary font-semibold">Data Inicial *</Label>
                        <Input
                          type="date"
                          value={formData.data_inicio_contrato}
                          onChange={(e) => setFormData({...formData, data_inicio_contrato: e.target.value})}
                          required
                          className="border-primary/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-primary font-semibold">Data Final *</Label>
                        <Input
                          type="date"
                          value={formData.data_fim_contrato}
                          onChange={(e) => setFormData({...formData, data_fim_contrato: e.target.value})}
                          required
                          className="border-primary/30"
                        />
                      </div>
                      
                      {/* Resumo do Contrato */}
                      <div className="pt-4 border-t border-primary/20 space-y-2">
                        <p className="text-sm font-medium text-primary">Resumo do Contrato</p>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span>Itens:</span>
                            <span className="font-bold">{itensContrato.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Qtd Total:</span>
                            <span className="font-bold">{totais.qtdTotalContratada}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Valor:</span>
                            <span className="font-bold text-green-600">R$ {formatCurrency(totais.valorTotalVenda)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Lucro Est.:</span>
                            <span className="font-bold text-blue-600">R$ {formatCurrency(totais.lucroTotal)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Dados Gerais e Produtos */}
                <div className="col-span-2 space-y-4">
                  <Tabs defaultValue="dados" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
                      <TabsTrigger value="produtos">Produtos ({itensContrato.length})</TabsTrigger>
                      <TabsTrigger value="datas">Datas</TabsTrigger>
                      <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dados" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nº Licitação *</Label>
                          <Input
                            value={formData.numero_licitacao}
                            onChange={(e) => setFormData({...formData, numero_licitacao: e.target.value})}
                            required
                            placeholder="PE-001/2025"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Órgão Público *</Label>
                          <Input
                            value={formData.orgao_publico}
                            onChange={(e) => setFormData({...formData, orgao_publico: e.target.value})}
                            required
                            placeholder="Prefeitura de..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cidade *</Label>
                          <Input
                            value={formData.cidade}
                            onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Estado *</Label>
                          <Input
                            value={formData.estado}
                            onChange={(e) => setFormData({...formData, estado: e.target.value})}
                            required
                            maxLength={2}
                            placeholder="UF"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nº Empenho *</Label>
                          <Input
                            value={formData.numero_empenho}
                            onChange={(e) => setFormData({...formData, numero_empenho: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Data do Empenho *</Label>
                          <Input
                            type="date"
                            value={formData.data_empenho}
                            onChange={(e) => setFormData({...formData, data_empenho: e.target.value})}
                            required
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Nº Nota de Empenho</Label>
                          <Input
                            value={formData.numero_nota_empenho}
                            onChange={(e) => setFormData({...formData, numero_nota_empenho: e.target.value})}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="produtos" className="space-y-4 mt-4">
                      <Card className="border-dashed">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Adicionar Produto ao Contrato
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-6 gap-2">
                            <div className="col-span-2 space-y-1">
                              <Label className="text-xs">Descrição *</Label>
                              <Input
                                value={novoItem.descricao}
                                onChange={(e) => setNovoItem({...novoItem, descricao: e.target.value})}
                                placeholder="Descrição do produto"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Qtd Contratada *</Label>
                              <Input
                                type="number"
                                min="1"
                                value={novoItem.quantidade_contratada}
                                onChange={(e) => setNovoItem({...novoItem, quantidade_contratada: e.target.value})}
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Preço Compra</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={novoItem.preco_compra}
                                onChange={(e) => setNovoItem({...novoItem, preco_compra: e.target.value})}
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Preço Venda</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={novoItem.preco_venda}
                                onChange={(e) => setNovoItem({...novoItem, preco_venda: e.target.value})}
                                className="h-9"
                              />
                            </div>
                            <div className="flex items-end">
                              <Button type="button" onClick={adicionarProdutoContrato} className="w-full h-9">
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {itensContrato.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produto</TableHead>
                              <TableHead className="text-center">Qtd Contratada</TableHead>
                              <TableHead className="text-right">P. Compra</TableHead>
                              <TableHead className="text-right">P. Venda</TableHead>
                              <TableHead className="text-right">Valor Total</TableHead>
                              <TableHead className="text-right">Lucro Unit.</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {itensContrato.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{item.descricao}</TableCell>
                                <TableCell className="text-center">{item.quantidade_contratada}</TableCell>
                                <TableCell className="text-right">R$ {formatCurrency(item.preco_compra)}</TableCell>
                                <TableCell className="text-right">R$ {formatCurrency(item.preco_venda)}</TableCell>
                                <TableCell className="text-right font-medium">R$ {formatCurrency(item.valor_total)}</TableCell>
                                <TableCell className="text-right text-green-600">R$ {formatCurrency(item.lucro_unitario)}</TableCell>
                                <TableCell>
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removerItem(index)}>
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>

                    <TabsContent value="datas" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Previsão de Fornecimento</Label>
                          <Input
                            type="date"
                            value={formData.previsao_fornecimento}
                            onChange={(e) => setFormData({...formData, previsao_fornecimento: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Previsão de Pagamento</Label>
                          <Input
                            type="date"
                            value={formData.previsao_pagamento}
                            onChange={(e) => setFormData({...formData, previsao_pagamento: e.target.value})}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="financeiro" className="space-y-4 mt-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Frete (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.frete}
                            onChange={(e) => setFormData({...formData, frete: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Impostos (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.impostos}
                            onChange={(e) => setFormData({...formData, impostos: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Outras Despesas (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.outras_despesas}
                            onChange={(e) => setFormData({...formData, outras_despesas: e.target.value})}
                          />
                        </div>
                        {parseFloat(formData.outras_despesas) > 0 && (
                          <div className="col-span-3 space-y-2">
                            <Label>Descrição das Outras Despesas</Label>
                            <Input
                              value={formData.descricao_outras_despesas}
                              onChange={(e) => setFormData({...formData, descricao_outras_despesas: e.target.value})}
                              placeholder="Descreva as despesas..."
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Valor Venda</p>
                            <p className="text-lg font-bold">R$ {formatCurrency(totais.valorTotalVenda)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Custo Total</p>
                            <p className="text-lg font-bold">R$ {formatCurrency(totais.valorTotalCompra)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Despesas</p>
                            <p className="text-lg font-bold text-red-600">R$ {formatCurrency(totais.despesasTotais)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Lucro Estimado</p>
                            <p className="text-lg font-bold text-green-600">R$ {formatCurrency(totais.lucroTotal)}</p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
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

      {/* Lista de Licitações */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading">Contratos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {licitacoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma licitação cadastrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Órgão/Cidade</TableHead>
                  <TableHead>Vigência</TableHead>
                  <TableHead className="text-center">Execução</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licitacoes.map((lic) => {
                  const contrato = lic.contrato || {};
                  const percentual = lic.percentual_executado || 0;
                  
                  return (
                    <TableRow key={lic.id} data-testid={`licitacao-row-${lic.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{contrato.numero_contrato || lic.numero_licitacao}</p>
                          <p className="text-xs text-muted-foreground">{lic.numero_empenho}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lic.orgao_publico}</p>
                          <p className="text-xs text-muted-foreground">{lic.cidade}/{lic.estado}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{formatDate(contrato.data_inicio || lic.data_empenho)}</p>
                          <p className="text-muted-foreground">até {formatDate(contrato.data_fim)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={percentual} className="h-2" />
                          <p className="text-xs text-center text-muted-foreground">{percentual.toFixed(1)}%</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-medium">R$ {formatCurrency(lic.valor_total_venda)}</p>
                        <p className="text-xs text-green-600">Lucro: R$ {formatCurrency(lic.lucro_total)}</p>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(lic.status_pagamento)}
                          {(lic.alertas || []).map((alerta, idx) => (
                            <p key={idx} className="text-xs text-orange-600">{alerta}</p>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleView(lic)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(lic)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(lic.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Visualização */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Licitação</DialogTitle>
            <DialogDescription>Visualização completa do contrato e fornecimentos</DialogDescription>
          </DialogHeader>
          {viewingLicitacao && (
            <div className="space-y-6">
              {/* Alertas */}
              {(viewingLicitacao.alertas || []).length > 0 && (
                <div className="space-y-2">
                  {viewingLicitacao.alertas.map((alerta, idx) => (
                    <Alert key={idx} variant={alerta.includes('VENCIDO') || alerta.includes('90%') ? 'destructive' : 'default'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Atenção</AlertTitle>
                      <AlertDescription>{alerta}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-6">
                {/* Quadro do Contrato */}
                <Card className="border-2 border-primary bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <FileText className="h-5 w-5" />
                      Contrato
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Número</p>
                      <p className="font-bold text-lg">{viewingLicitacao.contrato?.numero_contrato || viewingLicitacao.numero_licitacao}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Início</p>
                        <p>{formatDate(viewingLicitacao.contrato?.data_inicio || viewingLicitacao.data_empenho)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fim</p>
                        <p>{formatDate(viewingLicitacao.contrato?.data_fim)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Total</p>
                      <p className="font-bold text-xl text-green-600">R$ {formatCurrency(viewingLicitacao.valor_total_venda)}</p>
                    </div>
                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Execução do Contrato</p>
                      <Progress value={viewingLicitacao.percentual_executado || 0} className="h-3" />
                      <div className="flex justify-between text-xs mt-1">
                        <span>Fornecido: {viewingLicitacao.quantidade_total_fornecida || 0}</span>
                        <span>Restante: {viewingLicitacao.quantidade_total_restante || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Informações */}
                <div className="col-span-2">
                  <Tabs defaultValue="produtos">
                    <TabsList>
                      <TabsTrigger value="produtos">Produtos ({(viewingLicitacao.produtos || []).length})</TabsTrigger>
                      <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
                      <TabsTrigger value="fornecimentos">Fornecimentos ({(viewingLicitacao.fornecimentos || []).length})</TabsTrigger>
                      <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                    </TabsList>

                    <TabsContent value="produtos" className="mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-center">Contratado</TableHead>
                            <TableHead className="text-center">Fornecido</TableHead>
                            <TableHead className="text-center">Restante</TableHead>
                            <TableHead className="text-right">Valor Unit.</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(viewingLicitacao.produtos || []).map((prod, idx) => {
                            const qtdContratada = prod.quantidade_contratada || prod.quantidade_empenhada || 0;
                            const qtdFornecida = prod.quantidade_fornecida || 0;
                            const qtdRestante = qtdContratada - qtdFornecida;
                            
                            return (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">{prod.descricao}</TableCell>
                                <TableCell className="text-center">{qtdContratada}</TableCell>
                                <TableCell className="text-center text-green-600">{qtdFornecida}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={qtdRestante === 0 ? 'default' : qtdRestante < qtdContratada * 0.1 ? 'destructive' : 'secondary'}>
                                    {qtdRestante}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">R$ {formatCurrency(prod.preco_venda)}</TableCell>
                                <TableCell>
                                  {qtdRestante > 0 && (
                                    <Button size="sm" variant="outline" onClick={() => abrirFornecimento(prod)}>
                                      <Truck className="h-3 w-3 mr-1" />
                                      Fornecer
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TabsContent>

                    <TabsContent value="dados" className="mt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="font-medium">Licitação:</span> {viewingLicitacao.numero_licitacao}</div>
                        <div><span className="font-medium">Órgão:</span> {viewingLicitacao.orgao_publico}</div>
                        <div><span className="font-medium">Cidade:</span> {viewingLicitacao.cidade}/{viewingLicitacao.estado}</div>
                        <div><span className="font-medium">Empenho:</span> {viewingLicitacao.numero_empenho}</div>
                        <div><span className="font-medium">Data Empenho:</span> {formatDate(viewingLicitacao.data_empenho)}</div>
                        <div><span className="font-medium">Nota Empenho:</span> {viewingLicitacao.numero_nota_empenho || '-'}</div>
                        <div><span className="font-medium">Prev. Fornecimento:</span> {formatDate(viewingLicitacao.previsao_fornecimento)}</div>
                        <div><span className="font-medium">Fornec. Efetivo:</span> {formatDate(viewingLicitacao.fornecimento_efetivo)}</div>
                        <div><span className="font-medium">Prev. Pagamento:</span> {formatDate(viewingLicitacao.previsao_pagamento)}</div>
                        <div><span className="font-medium">Status Pagamento:</span> {getStatusBadge(viewingLicitacao.status_pagamento)}</div>
                      </div>
                    </TabsContent>

                    <TabsContent value="fornecimentos" className="mt-4">
                      {(viewingLicitacao.fornecimentos || []).length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nenhum fornecimento registrado</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Produto</TableHead>
                              <TableHead className="text-center">Quantidade</TableHead>
                              <TableHead>Nota Fiscal</TableHead>
                              <TableHead>Observação</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {viewingLicitacao.fornecimentos.map((forn, idx) => {
                              const prod = (viewingLicitacao.produtos || []).find(p => p.id === forn.produto_contrato_id);
                              return (
                                <TableRow key={idx}>
                                  <TableCell>{formatDate(forn.data_fornecimento)}</TableCell>
                                  <TableCell>{prod?.descricao || '-'}</TableCell>
                                  <TableCell className="text-center font-medium">{forn.quantidade}</TableCell>
                                  <TableCell>{forn.numero_nota_fornecimento || '-'}</TableCell>
                                  <TableCell className="text-muted-foreground">{forn.observacao || '-'}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>

                    <TabsContent value="financeiro" className="mt-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b">
                            <span>Valor Total Venda</span>
                            <span className="font-bold">R$ {formatCurrency(viewingLicitacao.valor_total_venda)}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span>Custo Total</span>
                            <span>R$ {formatCurrency(viewingLicitacao.valor_total_compra)}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span>Frete</span>
                            <span>R$ {formatCurrency(viewingLicitacao.frete)}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span>Impostos</span>
                            <span>R$ {formatCurrency(viewingLicitacao.impostos)}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span>Outras Despesas</span>
                            <span>R$ {formatCurrency(viewingLicitacao.outras_despesas)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center items-center p-6 bg-green-50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Lucro Total Estimado</p>
                          <p className="text-4xl font-bold text-green-600">R$ {formatCurrency(viewingLicitacao.lucro_total)}</p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Fechar</Button>
            {viewingLicitacao?.status_pagamento !== 'pago' && (
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  handleStatusChange(viewingLicitacao.id, 'pago');
                  setViewOpen(false);
                }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar como Pago
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Fornecimento */}
      <Dialog open={fornecimentoOpen} onOpenChange={setFornecimentoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Fornecimento</DialogTitle>
            <DialogDescription>
              Produto: {produtoSelecionadoFornecimento?.descricao}
            </DialogDescription>
          </DialogHeader>
          {produtoSelecionadoFornecimento && (
            <div className="space-y-4">
              <Alert>
                <Package className="h-4 w-4" />
                <AlertTitle>Quantidade Disponível</AlertTitle>
                <AlertDescription>
                  Restante no contrato: <strong>{(produtoSelecionadoFornecimento.quantidade_contratada || produtoSelecionadoFornecimento.quantidade_empenhada || 0) - (produtoSelecionadoFornecimento.quantidade_fornecida || 0)}</strong> unidades
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label>Quantidade a Fornecer *</Label>
                <Input
                  type="number"
                  min="1"
                  max={(produtoSelecionadoFornecimento.quantidade_contratada || produtoSelecionadoFornecimento.quantidade_empenhada || 0) - (produtoSelecionadoFornecimento.quantidade_fornecida || 0)}
                  value={fornecimentoData.quantidade}
                  onChange={(e) => setFornecimentoData({...fornecimentoData, quantidade: e.target.value})}
                  placeholder="Digite a quantidade"
                />
              </div>
              <div className="space-y-2">
                <Label>Data do Fornecimento *</Label>
                <Input
                  type="date"
                  value={fornecimentoData.data_fornecimento}
                  onChange={(e) => setFornecimentoData({...fornecimentoData, data_fornecimento: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Número da Nota Fiscal</Label>
                <Input
                  value={fornecimentoData.numero_nota_fornecimento}
                  onChange={(e) => setFornecimentoData({...fornecimentoData, numero_nota_fornecimento: e.target.value})}
                  placeholder="Ex: NF-001234"
                />
              </div>
              <div className="space-y-2">
                <Label>Observação</Label>
                <Input
                  value={fornecimentoData.observacao}
                  onChange={(e) => setFornecimentoData({...fornecimentoData, observacao: e.target.value})}
                  placeholder="Observações..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFornecimentoOpen(false)}>Cancelar</Button>
            <Button onClick={registrarFornecimento} className="bg-secondary hover:bg-secondary/90">
              <Truck className="h-4 w-4 mr-2" />
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
