import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Eye, Pencil, Trash2, X, FileText, DollarSign, Package, Calendar, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const STATUS_PAGAMENTO = [
  { value: 'pendente', label: 'Pendente', color: 'secondary' },
  { value: 'programado', label: 'Programado', color: 'default' },
  { value: 'pago', label: 'Pago', color: 'default' }
];

export default function Licitacoes() {
  const [licitacoes, setLicitacoes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingLicitacao, setViewingLicitacao] = useState(null);
  const [editingLicitacao, setEditingLicitacao] = useState(null);
  
  const [formData, setFormData] = useState({
    numero_licitacao: '',
    cidade: '',
    estado: '',
    orgao_publico: '',
    numero_empenho: '',
    data_empenho: new Date().toISOString().split('T')[0],
    numero_nota_empenho: '',
    numero_nota_fornecimento: '',
    previsao_fornecimento: '',
    fornecimento_efetivo: '',
    previsao_pagamento: '',
    frete: '0',
    impostos: '0',
    outras_despesas: '0',
    descricao_outras_despesas: ''
  });
  
  const [itensLicitacao, setItensLicitacao] = useState([]);
  const [novoItem, setNovoItem] = useState({
    descricao: '',
    quantidade_empenhada: '1',
    quantidade_fornecida: '0',
    preco_compra: '0',
    preco_venda: '0',
    despesas_extras: '0'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [licitacoesRes, produtosRes] = await Promise.all([
        axios.get(`${API}/licitacoes`, getAuthHeader()),
        axios.get(`${API}/produtos`, getAuthHeader())
      ]);
      setLicitacoes(licitacoesRes.data);
      setProdutos(produtosRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      numero_licitacao: '',
      cidade: '',
      estado: '',
      orgao_publico: '',
      numero_empenho: '',
      data_empenho: new Date().toISOString().split('T')[0],
      numero_nota_empenho: '',
      numero_nota_fornecimento: '',
      previsao_fornecimento: '',
      fornecimento_efetivo: '',
      previsao_pagamento: '',
      frete: '0',
      impostos: '0',
      outras_despesas: '0',
      descricao_outras_despesas: ''
    });
    setItensLicitacao([]);
    setNovoItem({
      descricao: '',
      quantidade_empenhada: '1',
      quantidade_fornecida: '0',
      preco_compra: '0',
      preco_venda: '0',
      despesas_extras: '0'
    });
    setEditingLicitacao(null);
  };

  const adicionarItem = () => {
    if (!novoItem.descricao) {
      toast.error('Digite a descrição do produto');
      return;
    }

    const qtdEmpenhada = parseFloat(novoItem.quantidade_empenhada) || 0;
    const qtdFornecida = parseFloat(novoItem.quantidade_fornecida) || 0;
    const precoCompra = parseFloat(novoItem.preco_compra) || 0;
    const precoVenda = parseFloat(novoItem.preco_venda) || 0;
    const despesasExtras = parseFloat(novoItem.despesas_extras) || 0;
    const qtdRestante = qtdEmpenhada - qtdFornecida;
    const lucroUnitario = precoVenda - precoCompra - despesasExtras;

    const item = {
      descricao: novoItem.descricao,
      quantidade_empenhada: qtdEmpenhada,
      quantidade_fornecida: qtdFornecida,
      quantidade_restante: qtdRestante,
      preco_compra: precoCompra,
      preco_venda: precoVenda,
      despesas_extras: despesasExtras,
      lucro_unitario: lucroUnitario
    };

    setItensLicitacao([...itensLicitacao, item]);
    setNovoItem({
      descricao: '',
      quantidade_empenhada: '1',
      quantidade_fornecida: '0',
      preco_compra: '0',
      preco_venda: '0',
      despesas_extras: '0'
    });
    toast.success('Produto adicionado!');
  };

  const removerItem = (index) => {
    setItensLicitacao(itensLicitacao.filter((_, i) => i !== index));
  };

  const calcularTotais = () => {
    const valorTotalVenda = itensLicitacao.reduce((acc, item) => acc + (item.preco_venda * item.quantidade_empenhada), 0);
    const valorTotalCompra = itensLicitacao.reduce((acc, item) => acc + (item.preco_compra * item.quantidade_empenhada), 0);
    const despesasProdutos = itensLicitacao.reduce((acc, item) => acc + (item.despesas_extras * item.quantidade_empenhada), 0);
    const frete = parseFloat(formData.frete) || 0;
    const impostos = parseFloat(formData.impostos) || 0;
    const outrasDespesas = parseFloat(formData.outras_despesas) || 0;
    const despesasTotais = despesasProdutos + frete + impostos + outrasDespesas;
    const lucroTotal = valorTotalVenda - valorTotalCompra - despesasTotais;

    return { valorTotalVenda, valorTotalCompra, despesasTotais, lucroTotal };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (itensLicitacao.length === 0) {
      toast.error('Adicione pelo menos um produto');
      return;
    }

    try {
      const payload = {
        numero_licitacao: formData.numero_licitacao,
        cidade: formData.cidade,
        estado: formData.estado,
        orgao_publico: formData.orgao_publico,
        numero_empenho: formData.numero_empenho,
        data_empenho: new Date(formData.data_empenho).toISOString(),
        numero_nota_empenho: formData.numero_nota_empenho,
        numero_nota_fornecimento: formData.numero_nota_fornecimento || null,
        produtos: itensLicitacao,
        previsao_fornecimento: formData.previsao_fornecimento ? new Date(formData.previsao_fornecimento).toISOString() : null,
        fornecimento_efetivo: formData.fornecimento_efetivo ? new Date(formData.fornecimento_efetivo).toISOString() : null,
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
      toast.error('Erro ao salvar licitação');
    }
  };

  const handleEdit = (licitacao) => {
    setEditingLicitacao(licitacao);
    setFormData({
      numero_licitacao: licitacao.numero_licitacao,
      cidade: licitacao.cidade,
      estado: licitacao.estado,
      orgao_publico: licitacao.orgao_publico,
      numero_empenho: licitacao.numero_empenho,
      data_empenho: licitacao.data_empenho ? new Date(licitacao.data_empenho).toISOString().split('T')[0] : '',
      numero_nota_empenho: licitacao.numero_nota_empenho || '',
      numero_nota_fornecimento: licitacao.numero_nota_fornecimento || '',
      previsao_fornecimento: licitacao.previsao_fornecimento ? new Date(licitacao.previsao_fornecimento).toISOString().split('T')[0] : '',
      fornecimento_efetivo: licitacao.fornecimento_efetivo ? new Date(licitacao.fornecimento_efetivo).toISOString().split('T')[0] : '',
      previsao_pagamento: licitacao.previsao_pagamento ? new Date(licitacao.previsao_pagamento).toISOString().split('T')[0] : '',
      frete: licitacao.frete?.toString() || '0',
      impostos: licitacao.impostos?.toString() || '0',
      outras_despesas: licitacao.outras_despesas?.toString() || '0',
      descricao_outras_despesas: licitacao.descricao_outras_despesas || ''
    });
    setItensLicitacao(licitacao.produtos || []);
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

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`${API}/licitacoes/${id}/status?status=${newStatus}`, {}, getAuthHeader());
      toast.success(`Status atualizado para ${STATUS_PAGAMENTO.find(s => s.value === newStatus)?.label}!`);
      if (newStatus === 'pago') {
        toast.success('Valor creditado no caixa!');
      }
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const getStatusBadge = (status) => {
    const statusInfo = STATUS_PAGAMENTO.find(s => s.value === status) || STATUS_PAGAMENTO[0];
    return (
      <Badge variant={statusInfo.color} className={status === 'pago' ? 'bg-green-600' : status === 'programado' ? 'bg-blue-600' : ''}>
        {statusInfo.label.toUpperCase()}
      </Badge>
    );
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
          <p className="text-muted-foreground mt-2">Gerencie contratos públicos e empenhos</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary/90" data-testid="nova-licitacao-button">
              <Plus className="h-4 w-4 mr-2" />
              Nova Licitação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-heading">
                {editingLicitacao ? 'Editar Licitação' : 'Nova Licitação'}
              </DialogTitle>
              <DialogDescription>
                Preencha todos os campos para cadastrar a licitação
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="dados" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="dados"><Building2 className="h-4 w-4 mr-2" />Dados Gerais</TabsTrigger>
                  <TabsTrigger value="produtos"><Package className="h-4 w-4 mr-2" />Produtos</TabsTrigger>
                  <TabsTrigger value="datas"><Calendar className="h-4 w-4 mr-2" />Datas</TabsTrigger>
                  <TabsTrigger value="financeiro"><DollarSign className="h-4 w-4 mr-2" />Financeiro</TabsTrigger>
                </TabsList>
                
                {/* Tab Dados Gerais */}
                <TabsContent value="dados" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Número da Licitação *</Label>
                      <Input
                        value={formData.numero_licitacao}
                        onChange={(e) => setFormData({...formData, numero_licitacao: e.target.value})}
                        placeholder="Ex: PE-001/2024"
                        required
                        data-testid="numero-licitacao-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Órgão Público *</Label>
                      <Input
                        value={formData.orgao_publico}
                        onChange={(e) => setFormData({...formData, orgao_publico: e.target.value})}
                        placeholder="Nome do órgão público"
                        required
                        data-testid="orgao-publico-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Cidade *</Label>
                      <Input
                        value={formData.cidade}
                        onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                        placeholder="Nome da cidade"
                        required
                        data-testid="cidade-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado *</Label>
                      <Select value={formData.estado} onValueChange={(v) => setFormData({...formData, estado: v})}>
                        <SelectTrigger data-testid="estado-select">
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent>
                          {ESTADOS_BR.map(uf => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Número do Empenho *</Label>
                      <Input
                        value={formData.numero_empenho}
                        onChange={(e) => setFormData({...formData, numero_empenho: e.target.value})}
                        placeholder="Nº Empenho"
                        required
                        data-testid="numero-empenho-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data do Empenho *</Label>
                      <Input
                        type="date"
                        value={formData.data_empenho}
                        onChange={(e) => setFormData({...formData, data_empenho: e.target.value})}
                        required
                        data-testid="data-empenho-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nº Nota de Empenho</Label>
                      <Input
                        value={formData.numero_nota_empenho}
                        onChange={(e) => setFormData({...formData, numero_nota_empenho: e.target.value})}
                        placeholder="Nº NE"
                        data-testid="numero-nota-empenho-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nº Nota de Fornecimento</Label>
                    <Input
                      value={formData.numero_nota_fornecimento}
                      onChange={(e) => setFormData({...formData, numero_nota_fornecimento: e.target.value})}
                      placeholder="Nº NF"
                      data-testid="numero-nota-fornecimento-input"
                    />
                  </div>
                </TabsContent>
                
                {/* Tab Produtos */}
                <TabsContent value="produtos" className="space-y-4 mt-4">
                  <Card className="bg-slate-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Adicionar Produto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Descrição do Produto *</Label>
                        <Input
                          value={novoItem.descricao}
                          onChange={(e) => setNovoItem({...novoItem, descricao: e.target.value})}
                          placeholder="Descrição do produto empenhado"
                          data-testid="produto-descricao-input"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Qtd Empenhada *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={novoItem.quantidade_empenhada}
                            onChange={(e) => setNovoItem({...novoItem, quantidade_empenhada: e.target.value})}
                            data-testid="quantidade-empenhada-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Qtd Fornecida</Label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={novoItem.quantidade_fornecida}
                            onChange={(e) => setNovoItem({...novoItem, quantidade_fornecida: e.target.value})}
                            data-testid="quantidade-fornecida-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Qtd Restante</Label>
                          <Input
                            type="number"
                            value={(parseFloat(novoItem.quantidade_empenhada) || 0) - (parseFloat(novoItem.quantidade_fornecida) || 0)}
                            disabled
                            className="bg-slate-100"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Preço de Compra *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={novoItem.preco_compra}
                            onChange={(e) => setNovoItem({...novoItem, preco_compra: e.target.value})}
                            data-testid="preco-compra-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Preço de Venda *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={novoItem.preco_venda}
                            onChange={(e) => setNovoItem({...novoItem, preco_venda: e.target.value})}
                            data-testid="preco-venda-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Despesas Extras</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={novoItem.despesas_extras}
                            onChange={(e) => setNovoItem({...novoItem, despesas_extras: e.target.value})}
                            data-testid="despesas-extras-input"
                          />
                        </div>
                      </div>
                      <Button type="button" onClick={adicionarItem} className="w-full bg-primary">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Produto
                      </Button>
                    </CardContent>
                  </Card>
                  
                  {itensLicitacao.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Produtos Adicionados ({itensLicitacao.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Descrição</TableHead>
                              <TableHead className="text-center">Emp.</TableHead>
                              <TableHead className="text-center">Forn.</TableHead>
                              <TableHead className="text-center">Rest.</TableHead>
                              <TableHead className="text-right">P. Compra</TableHead>
                              <TableHead className="text-right">P. Venda</TableHead>
                              <TableHead className="text-right">Lucro Unit.</TableHead>
                              <TableHead className="text-center">Ação</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {itensLicitacao.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium max-w-[200px] truncate">{item.descricao}</TableCell>
                                <TableCell className="text-center">{item.quantidade_empenhada}</TableCell>
                                <TableCell className="text-center">{item.quantidade_fornecida}</TableCell>
                                <TableCell className="text-center">{item.quantidade_restante}</TableCell>
                                <TableCell className="text-right">R$ {item.preco_compra.toFixed(2)}</TableCell>
                                <TableCell className="text-right">R$ {item.preco_venda.toFixed(2)}</TableCell>
                                <TableCell className="text-right text-green-600 font-medium">R$ {item.lucro_unitario.toFixed(2)}</TableCell>
                                <TableCell className="text-center">
                                  <Button variant="ghost" size="sm" onClick={() => removerItem(index)}>
                                    <X className="h-4 w-4 text-red-500" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                {/* Tab Datas */}
                <TabsContent value="datas" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Previsão de Fornecimento</Label>
                      <Input
                        type="date"
                        value={formData.previsao_fornecimento}
                        onChange={(e) => setFormData({...formData, previsao_fornecimento: e.target.value})}
                        data-testid="previsao-fornecimento-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fornecimento Efetivo</Label>
                      <Input
                        type="date"
                        value={formData.fornecimento_efetivo}
                        onChange={(e) => setFormData({...formData, fornecimento_efetivo: e.target.value})}
                        data-testid="fornecimento-efetivo-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Previsão de Pagamento</Label>
                      <Input
                        type="date"
                        value={formData.previsao_pagamento}
                        onChange={(e) => setFormData({...formData, previsao_pagamento: e.target.value})}
                        data-testid="previsao-pagamento-input"
                      />
                    </div>
                  </div>
                </TabsContent>
                
                {/* Tab Financeiro */}
                <TabsContent value="financeiro" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Frete (R$)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.frete}
                        onChange={(e) => setFormData({...formData, frete: e.target.value})}
                        data-testid="frete-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Impostos (R$)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.impostos}
                        onChange={(e) => setFormData({...formData, impostos: e.target.value})}
                        data-testid="impostos-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Outras Despesas (R$)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.outras_despesas}
                        onChange={(e) => setFormData({...formData, outras_despesas: e.target.value})}
                        data-testid="outras-despesas-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição das Outras Despesas</Label>
                    <Input
                      value={formData.descricao_outras_despesas}
                      onChange={(e) => setFormData({...formData, descricao_outras_despesas: e.target.value})}
                      placeholder="Descreva as outras despesas"
                      data-testid="descricao-outras-despesas-input"
                    />
                  </div>
                  
                  {/* Resumo Financeiro */}
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-primary">Resumo Financeiro</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <p className="text-sm text-muted-foreground">Valor Total Venda</p>
                          <p className="text-xl font-bold text-blue-600">
                            R$ {totais.valorTotalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <p className="text-sm text-muted-foreground">Valor Total Compra</p>
                          <p className="text-xl font-bold text-gray-600">
                            R$ {totais.valorTotalCompra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <p className="text-sm text-muted-foreground">Despesas Totais</p>
                          <p className="text-xl font-bold text-red-600">
                            R$ {totais.despesasTotais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <p className="text-sm text-muted-foreground">Lucro Total</p>
                          <p className={`text-xl font-bold ${totais.lucroTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            R$ {totais.lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-secondary hover:bg-secondary/90" data-testid="salvar-licitacao-button">
                  {editingLicitacao ? 'Atualizar' : 'Cadastrar'} Licitação
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Licitações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{licitacoes.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">
              {licitacoes.filter(l => l.status_pagamento === 'pendente').length}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Programadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {licitacoes.filter(l => l.status_pagamento === 'programado').length}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pagas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {licitacoes.filter(l => l.status_pagamento === 'pago').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Licitações */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading">Lista de Licitações</CardTitle>
        </CardHeader>
        <CardContent>
          {licitacoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma licitação cadastrada</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Licitação</TableHead>
                    <TableHead>Órgão</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Nº Empenho</TableHead>
                    <TableHead className="text-right">Valor Venda</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licitacoes.map((lic) => (
                    <TableRow key={lic.id} data-testid={`licitacao-row-${lic.id}`}>
                      <TableCell className="font-mono font-medium">{lic.numero_licitacao}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{lic.orgao_publico}</TableCell>
                      <TableCell>{lic.cidade}/{lic.estado}</TableCell>
                      <TableCell className="font-mono text-sm">{lic.numero_empenho}</TableCell>
                      <TableCell className="text-right">
                        R$ {(lic.valor_total_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${lic.lucro_total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        R$ {(lic.lucro_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={lic.status_pagamento || 'pendente'} 
                          onValueChange={(v) => handleStatusChange(lic.id, v)}
                        >
                          <SelectTrigger className="w-[130px]" data-testid={`status-select-${lic.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_PAGAMENTO.map(status => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleView(lic)} data-testid={`view-${lic.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(lic)} data-testid={`edit-${lic.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(lic.id)} data-testid={`delete-${lic.id}`}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Visualização */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Detalhes da Licitação
            </DialogTitle>
          </DialogHeader>
          {viewingLicitacao && (
            <div className="space-y-6">
              {/* Dados Gerais */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Dados Gerais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Nº Licitação</p>
                      <p className="font-medium">{viewingLicitacao.numero_licitacao}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Órgão Público</p>
                      <p className="font-medium">{viewingLicitacao.orgao_publico}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Local</p>
                      <p className="font-medium">{viewingLicitacao.cidade}/{viewingLicitacao.estado}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nº Empenho</p>
                      <p className="font-medium">{viewingLicitacao.numero_empenho}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data do Empenho</p>
                      <p className="font-medium">{new Date(viewingLicitacao.data_empenho).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nº Nota Empenho</p>
                      <p className="font-medium">{viewingLicitacao.numero_nota_empenho || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nº Nota Fornecimento</p>
                      <p className="font-medium">{viewingLicitacao.numero_nota_fornecimento || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status Pagamento</p>
                      {getStatusBadge(viewingLicitacao.status_pagamento)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Produtos */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Produtos Empenhados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-center">Qtd Emp.</TableHead>
                        <TableHead className="text-center">Qtd Forn.</TableHead>
                        <TableHead className="text-center">Qtd Rest.</TableHead>
                        <TableHead className="text-right">P. Compra</TableHead>
                        <TableHead className="text-right">P. Venda</TableHead>
                        <TableHead className="text-right">Desp. Ext.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingLicitacao.produtos?.map((produto, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{produto.descricao}</TableCell>
                          <TableCell className="text-center">{produto.quantidade_empenhada}</TableCell>
                          <TableCell className="text-center">{produto.quantidade_fornecida || 0}</TableCell>
                          <TableCell className="text-center">{produto.quantidade_restante || (produto.quantidade_empenhada - (produto.quantidade_fornecida || 0))}</TableCell>
                          <TableCell className="text-right">R$ {(produto.preco_compra || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">R$ {(produto.preco_venda || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">R$ {(produto.despesas_extras || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Datas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Datas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Previsão Fornecimento</p>
                      <p className="font-medium">
                        {viewingLicitacao.previsao_fornecimento 
                          ? new Date(viewingLicitacao.previsao_fornecimento).toLocaleDateString('pt-BR') 
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fornecimento Efetivo</p>
                      <p className="font-medium">
                        {viewingLicitacao.fornecimento_efetivo 
                          ? new Date(viewingLicitacao.fornecimento_efetivo).toLocaleDateString('pt-BR') 
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Previsão Pagamento</p>
                      <p className="font-medium">
                        {viewingLicitacao.previsao_pagamento 
                          ? new Date(viewingLicitacao.previsao_pagamento).toLocaleDateString('pt-BR') 
                          : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financeiro */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-primary">
                    <DollarSign className="h-5 w-5" />
                    Resumo Financeiro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                      <p className="text-sm text-muted-foreground">Valor Total Venda</p>
                      <p className="text-xl font-bold text-blue-600">
                        R$ {(viewingLicitacao.valor_total_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                      <p className="text-sm text-muted-foreground">Valor Total Compra</p>
                      <p className="text-xl font-bold text-gray-600">
                        R$ {(viewingLicitacao.valor_total_compra || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                      <p className="text-sm text-muted-foreground">Despesas Totais</p>
                      <p className="text-xl font-bold text-red-600">
                        R$ {(viewingLicitacao.despesas_totais || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                      <p className="text-sm text-muted-foreground">Lucro Total</p>
                      <p className={`text-xl font-bold ${(viewingLicitacao.lucro_total || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        R$ {(viewingLicitacao.lucro_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  {(viewingLicitacao.frete > 0 || viewingLicitacao.impostos > 0 || viewingLicitacao.outras_despesas > 0) && (
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground mb-2">Detalhamento das Despesas:</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Frete:</span>{' '}
                          <span className="font-medium">R$ {(viewingLicitacao.frete || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Impostos:</span>{' '}
                          <span className="font-medium">R$ {(viewingLicitacao.impostos || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Outras:</span>{' '}
                          <span className="font-medium">R$ {(viewingLicitacao.outras_despesas || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      {viewingLicitacao.descricao_outras_despesas && (
                        <p className="text-sm mt-2">
                          <span className="text-muted-foreground">Descrição:</span>{' '}
                          {viewingLicitacao.descricao_outras_despesas}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
