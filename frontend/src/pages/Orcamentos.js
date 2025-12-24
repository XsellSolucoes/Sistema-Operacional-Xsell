import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, Eye, Pencil, Trash2, X, FileText, ShoppingCart, 
  User, Package, DollarSign, Calendar, Printer, Download,
  ArrowRightLeft, Image as ImageIcon, Search
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const FORMAS_PAGAMENTO = [
  'À Vista', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto Bancário',
  'PIX', 'Transferência Bancária', '30 dias', '30/60 dias', '30/60/90 dias'
];

const FRETE_OPCOES = [
  { value: 'destinatario', label: 'Por conta do destinatário' },
  { value: 'remetente', label: 'Por conta do remetente (CIF)' },
  { value: 'incluso', label: 'Frete incluso' }
];

export default function Orcamentos() {
  const [orcamentos, setOrcamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingOrcamento, setViewingOrcamento] = useState(null);
  const [editingOrcamento, setEditingOrcamento] = useState(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertingOrcamento, setConvertingOrcamento] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    cliente_id: '',
    vendedor: '',
    validade_dias: '15',
    forma_pagamento: '',
    prazo_entrega: '',
    frete_por_conta: 'destinatario',
    valor_frete: '0',
    desconto: '0',
    observacoes: 'Produto sujeito à disponibilidade de estoque no momento do fechamento do pedido, devido a estoque rotativo.'
  });

  const [clienteBusca, setClienteBusca] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [itensOrcamento, setItensOrcamento] = useState([]);
  const [novoItem, setNovoItem] = useState({
    produto_codigo: '',
    descricao: '',
    quantidade: '1',
    unidade: 'UN',
    preco_unitario: '0',
    imagem_url: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [orcRes, cliRes, prodRes, vendRes] = await Promise.all([
        axios.get(`${API}/orcamentos`, getAuthHeader()),
        axios.get(`${API}/clientes`, getAuthHeader()),
        axios.get(`${API}/produtos`, getAuthHeader()),
        axios.get(`${API}/vendedores`, getAuthHeader())
      ]);
      setOrcamentos(orcRes.data);
      setClientes(cliRes.data);
      setProdutos(prodRes.data);
      setVendedores(vendRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      vendedor: '',
      validade_dias: '15',
      forma_pagamento: '',
      prazo_entrega: '',
      frete_por_conta: 'destinatario',
      valor_frete: '0',
      desconto: '0',
      observacoes: 'Produto sujeito à disponibilidade de estoque no momento do fechamento do pedido, devido a estoque rotativo.'
    });
    setClienteBusca('');
    setClienteSelecionado(null);
    setItensOrcamento([]);
    setNovoItem({
      produto_codigo: '',
      descricao: '',
      quantidade: '1',
      unidade: 'UN',
      preco_unitario: '0',
      imagem_url: ''
    });
    setEditingOrcamento(null);
  };

  const buscarClientePorCodigo = () => {
    const cliente = clientes.find(c => c.codigo === clienteBusca);
    if (cliente) {
      setClienteSelecionado(cliente);
      setFormData({ ...formData, cliente_id: cliente.id });
      toast.success(`Cliente encontrado: ${cliente.nome || cliente.razao_social}`);
    } else {
      toast.error('Cliente não encontrado');
    }
  };

  const buscarProdutoPorCodigo = () => {
    const produto = produtos.find(p => p.codigo === novoItem.produto_codigo);
    if (produto) {
      setNovoItem({
        ...novoItem,
        descricao: produto.descricao,
        preco_unitario: produto.preco_venda_sugerido?.toString() || '0'
      });
      toast.success(`Produto encontrado: ${produto.descricao}`);
    } else {
      toast.error('Produto não encontrado');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Convert to base64 for simplicity (in production, upload to cloud storage)
      const reader = new FileReader();
      reader.onloadend = () => {
        setNovoItem({ ...novoItem, imagem_url: reader.result });
        toast.success('Imagem anexada!');
      };
      reader.readAsDataURL(file);
    }
  };

  const adicionarItem = () => {
    if (!novoItem.descricao) {
      toast.error('Digite a descrição do produto');
      return;
    }

    const quantidade = parseFloat(novoItem.quantidade) || 1;
    const precoUnitario = parseFloat(novoItem.preco_unitario) || 0;
    const precoTotal = quantidade * precoUnitario;

    const item = {
      produto_codigo: novoItem.produto_codigo,
      descricao: novoItem.descricao,
      quantidade,
      unidade: novoItem.unidade,
      preco_unitario: precoUnitario,
      preco_total: precoTotal,
      imagem_url: novoItem.imagem_url
    };

    setItensOrcamento([...itensOrcamento, item]);
    setNovoItem({
      produto_codigo: '',
      descricao: '',
      quantidade: '1',
      unidade: 'UN',
      preco_unitario: '0',
      imagem_url: ''
    });
    toast.success('Produto adicionado!');
  };

  const removerItem = (index) => {
    setItensOrcamento(itensOrcamento.filter((_, i) => i !== index));
  };

  const calcularTotais = () => {
    const valorTotal = itensOrcamento.reduce((acc, item) => acc + item.preco_total, 0);
    const valorFrete = parseFloat(formData.valor_frete) || 0;
    const desconto = parseFloat(formData.desconto) || 0;
    const valorFinal = valorTotal + valorFrete - desconto;
    return { valorTotal, valorFrete, desconto, valorFinal };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.cliente_id) {
      toast.error('Selecione um cliente');
      return;
    }
    if (itensOrcamento.length === 0) {
      toast.error('Adicione pelo menos um produto');
      return;
    }

    try {
      const payload = {
        cliente_id: formData.cliente_id,
        vendedor: formData.vendedor || null,
        itens: itensOrcamento,
        validade_dias: parseInt(formData.validade_dias) || 15,
        forma_pagamento: formData.forma_pagamento,
        prazo_entrega: formData.prazo_entrega,
        frete_por_conta: formData.frete_por_conta,
        valor_frete: parseFloat(formData.valor_frete) || 0,
        desconto: parseFloat(formData.desconto) || 0,
        observacoes: formData.observacoes
      };

      if (editingOrcamento) {
        await axios.put(`${API}/orcamentos/${editingOrcamento.id}`, payload, getAuthHeader());
        toast.success('Orçamento atualizado com sucesso!');
      } else {
        await axios.post(`${API}/orcamentos`, payload, getAuthHeader());
        toast.success('Orçamento criado com sucesso!');
      }
      
      setOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar orçamento');
    }
  };

  const handleEdit = (orc) => {
    setEditingOrcamento(orc);
    const cliente = clientes.find(c => c.id === orc.cliente_id);
    setClienteSelecionado(cliente);
    setFormData({
      cliente_id: orc.cliente_id,
      vendedor: orc.vendedor || '',
      validade_dias: orc.validade_dias?.toString() || '15',
      forma_pagamento: orc.forma_pagamento || '',
      prazo_entrega: orc.prazo_entrega || '',
      frete_por_conta: orc.frete_por_conta || 'destinatario',
      valor_frete: orc.valor_frete?.toString() || '0',
      desconto: orc.desconto?.toString() || '0',
      observacoes: orc.observacoes || ''
    });
    setItensOrcamento(orc.itens || []);
    setOpen(true);
  };

  const handleView = (orc) => {
    setViewingOrcamento(orc);
    setViewOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este orçamento?')) return;
    
    try {
      await axios.delete(`${API}/orcamentos/${id}`, getAuthHeader());
      toast.success('Orçamento excluído com sucesso!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir orçamento');
    }
  };

  const handleConvert = async () => {
    if (!convertingOrcamento) return;
    
    try {
      const response = await axios.post(
        `${API}/orcamentos/${convertingOrcamento.id}/convert?vendedor=${encodeURIComponent(convertingOrcamento.vendedor || '')}`,
        {},
        getAuthHeader()
      );
      toast.success(`Orçamento convertido! Pedido: ${response.data.pedido_numero}`);
      setConvertOpen(false);
      setConvertingOrcamento(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao converter orçamento');
    }
  };

  const gerarPDF = (orc) => {
    const dataOrc = new Date(orc.data).toLocaleDateString('pt-BR');
    const dataValidade = new Date(new Date(orc.data).getTime() + orc.validade_dias * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Orçamento ${orc.numero}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; font-size: 13px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #1e3a5f; }
          .logo { font-size: 24px; font-weight: bold; color: #1e3a5f; }
          .logo span { color: #f97316; }
          .doc-info { text-align: right; }
          .doc-info h2 { color: #1e3a5f; font-size: 22px; margin-bottom: 5px; }
          .doc-info p { color: #666; font-size: 12px; }
          .section { margin-bottom: 25px; }
          .section-title { font-size: 14px; font-weight: bold; color: #1e3a5f; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid #e2e8f0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .info-box { background: #f8fafc; padding: 15px; border-radius: 6px; }
          .info-box h4 { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
          .info-box p { font-size: 13px; margin-bottom: 3px; }
          .info-box strong { color: #1e3a5f; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #1e3a5f; color: white; padding: 10px 8px; text-align: left; font-size: 12px; }
          th.right, td.right { text-align: right; }
          th.center, td.center { text-align: center; }
          td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
          tr:nth-child(even) { background: #f8fafc; }
          .produto-img { max-width: 60px; max-height: 60px; border-radius: 4px; }
          .totais { margin-left: auto; width: 300px; }
          .totais-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          .totais-row.final { background: #1e3a5f; color: white; padding: 12px 10px; border-radius: 6px; font-size: 16px; font-weight: bold; margin-top: 10px; }
          .obs { background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f97316; }
          .obs h4 { color: #92400e; margin-bottom: 8px; }
          .obs p { color: #78350f; font-size: 12px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #888; }
          .conditions { margin-top: 30px; padding: 15px; background: #f8fafc; border-radius: 6px; }
          .conditions h4 { font-size: 12px; color: #1e3a5f; margin-bottom: 10px; }
          .conditions ul { font-size: 11px; color: #666; margin-left: 20px; }
          .conditions li { margin-bottom: 5px; }
          @media print {
            body { padding: 15px; }
            .produto-img { max-width: 50px; max-height: 50px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">XSELL <span>SOLUÇÕES</span></div>
          <div class="doc-info">
            <h2>ORÇAMENTO</h2>
            <p><strong>Nº:</strong> ${orc.numero}</p>
            <p><strong>Data:</strong> ${dataOrc}</p>
            <p><strong>Validade:</strong> ${dataValidade}</p>
          </div>
        </div>
        
        <div class="info-grid">
          <div class="info-box">
            <h4>Cliente</h4>
            <p><strong>${orc.cliente_nome}</strong></p>
            ${orc.cliente_cnpj ? `<p>CNPJ: ${orc.cliente_cnpj}</p>` : ''}
            ${orc.cliente_endereco ? `<p>${orc.cliente_endereco}</p>` : ''}
            ${orc.cliente_telefone ? `<p>Tel: ${orc.cliente_telefone}</p>` : ''}
            ${orc.cliente_email ? `<p>Email: ${orc.cliente_email}</p>` : ''}
          </div>
          <div class="info-box">
            <h4>Condições Comerciais</h4>
            <p><strong>Forma de Pagamento:</strong> ${orc.forma_pagamento || '-'}</p>
            <p><strong>Prazo de Entrega:</strong> ${orc.prazo_entrega || '-'}</p>
            <p><strong>Frete:</strong> ${FRETE_OPCOES.find(f => f.value === orc.frete_por_conta)?.label || orc.frete_por_conta}</p>
            ${orc.vendedor ? `<p><strong>Vendedor:</strong> ${orc.vendedor}</p>` : ''}
          </div>
        </div>
        
        <div class="section" style="margin-top: 25px;">
          <div class="section-title">Itens do Orçamento</div>
          <table>
            <thead>
              <tr>
                <th style="width: 70px;">Imagem</th>
                <th>Descrição</th>
                <th class="center" style="width: 60px;">Qtd</th>
                <th class="center" style="width: 50px;">Un</th>
                <th class="right" style="width: 100px;">Preço Unit.</th>
                <th class="right" style="width: 100px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(orc.itens || []).map(item => `
                <tr>
                  <td class="center">
                    ${item.imagem_url 
                      ? `<img src="${item.imagem_url}" alt="${item.descricao}" class="produto-img" />` 
                      : '<span style="color:#ccc;">-</span>'}
                  </td>
                  <td>
                    <strong>${item.descricao}</strong>
                    ${item.produto_codigo ? `<br><small style="color:#666;">Cód: ${item.produto_codigo}</small>` : ''}
                  </td>
                  <td class="center">${item.quantidade}</td>
                  <td class="center">${item.unidade || 'UN'}</td>
                  <td class="right">R$ ${(item.preco_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td class="right"><strong>R$ ${(item.preco_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totais">
            <div class="totais-row">
              <span>Subtotal:</span>
              <span>R$ ${(orc.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            ${orc.valor_frete > 0 ? `
              <div class="totais-row">
                <span>Frete:</span>
                <span>R$ ${orc.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
            ${orc.desconto > 0 ? `
              <div class="totais-row">
                <span>Desconto:</span>
                <span style="color: #22c55e;">- R$ ${orc.desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
            <div class="totais-row final">
              <span>VALOR TOTAL:</span>
              <span>R$ ${(orc.valor_final || orc.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        
        ${orc.observacoes ? `
          <div class="obs">
            <h4>Observações</h4>
            <p>${orc.observacoes}</p>
          </div>
        ` : ''}
        
        <div class="conditions">
          <h4>Condições Gerais</h4>
          <ul>
            <li>Este orçamento é válido por ${orc.validade_dias} dias a partir da data de emissão.</li>
            <li>Os preços podem sofrer alterações sem aviso prévio após o vencimento.</li>
            <li>Produto sujeito à disponibilidade de estoque no momento do fechamento do pedido.</li>
            <li>Imagens meramente ilustrativas.</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>XSELL Soluções Corporativas LTDA | Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      </body>
      </html>
    `;
    
    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) {
      pdfWindow.document.write(html);
      pdfWindow.document.close();
      toast.success('PDF gerado! Use Ctrl+P para salvar.');
    } else {
      toast.error('Bloqueador de pop-up ativo. Permita pop-ups para esta página.');
    }
  };

  const handlePrint = (orc) => {
    gerarPDF(orc);
    setTimeout(() => {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.print();
      }
    }, 500);
  };

  const getStatusBadge = (status) => {
    const variants = {
      'aberto': { variant: 'secondary', color: 'bg-blue-100 text-blue-700' },
      'convertido': { variant: 'default', color: 'bg-green-100 text-green-700' },
      'expirado': { variant: 'destructive', color: 'bg-red-100 text-red-700' }
    };
    const config = variants[status] || variants['aberto'];
    return (
      <Badge className={config.color}>
        {status?.toUpperCase() || 'ABERTO'}
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
    <div className="space-y-6" data-testid="orcamentos-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">Orçamentos</h1>
          <p className="text-muted-foreground mt-2">Crie e gerencie propostas comerciais</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary/90" data-testid="novo-orcamento-button">
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-heading">
                {editingOrcamento ? 'Editar Orçamento' : 'Novo Orçamento'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um orçamento profissional
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Cliente Section */}
              <Card className="bg-slate-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>Código do Cliente</Label>
                      <div className="flex gap-2">
                        <Input
                          value={clienteBusca}
                          onChange={(e) => setClienteBusca(e.target.value)}
                          placeholder="Digite o código do cliente"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), buscarClientePorCodigo())}
                        />
                        <Button type="button" onClick={buscarClientePorCodigo} variant="outline">
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label>Ou selecione</Label>
                      <Select value={formData.cliente_id} onValueChange={(v) => {
                        setFormData({...formData, cliente_id: v});
                        const cli = clientes.find(c => c.id === v);
                        setClienteSelecionado(cli);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientes.map(cli => (
                            <SelectItem key={cli.id} value={cli.id}>
                              {cli.codigo} - {cli.nome || cli.razao_social}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {clienteSelecionado && (
                    <div className="p-3 bg-white rounded-lg border">
                      <p className="font-medium">{clienteSelecionado.nome || clienteSelecionado.razao_social}</p>
                      {clienteSelecionado.cnpj && <p className="text-sm text-muted-foreground">CNPJ: {clienteSelecionado.cnpj}</p>}
                      {clienteSelecionado.endereco && <p className="text-sm text-muted-foreground">{clienteSelecionado.endereco}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Produtos Section */}
              <Card className="bg-slate-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Adicionar Produto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-6 gap-4">
                    <div className="col-span-1">
                      <Label>Código</Label>
                      <div className="flex gap-1">
                        <Input
                          value={novoItem.produto_codigo}
                          onChange={(e) => setNovoItem({...novoItem, produto_codigo: e.target.value})}
                          placeholder="Código"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), buscarProdutoPorCodigo())}
                        />
                      </div>
                    </div>
                    <div className="col-span-3">
                      <Label>Descrição *</Label>
                      <Input
                        value={novoItem.descricao}
                        onChange={(e) => setNovoItem({...novoItem, descricao: e.target.value})}
                        placeholder="Descrição do produto"
                      />
                    </div>
                    <div>
                      <Label>Qtd</Label>
                      <Input
                        type="number"
                        min="1"
                        value={novoItem.quantidade}
                        onChange={(e) => setNovoItem({...novoItem, quantidade: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Preço Unit.</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={novoItem.preco_unitario}
                        onChange={(e) => setNovoItem({...novoItem, preco_unitario: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label>Imagem do Produto (opcional)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full"
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          {novoItem.imagem_url ? 'Imagem anexada ✓' : 'Anexar imagem'}
                        </Button>
                        {novoItem.imagem_url && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setNovoItem({...novoItem, imagem_url: ''})}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <Button type="button" onClick={adicionarItem} className="bg-primary">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Items Table */}
              {itensOrcamento.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Itens do Orçamento ({itensOrcamento.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Img</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-center w-20">Qtd</TableHead>
                          <TableHead className="text-right w-24">Preço Unit.</TableHead>
                          <TableHead className="text-right w-24">Total</TableHead>
                          <TableHead className="text-center w-16">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itensOrcamento.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {item.imagem_url ? (
                                <img src={item.imagem_url} alt={item.descricao} className="w-12 h-12 object-cover rounded" />
                              ) : (
                                <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                                  <ImageIcon className="h-5 w-5 text-slate-400" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.descricao}
                              {item.produto_codigo && <span className="block text-xs text-muted-foreground">Cód: {item.produto_codigo}</span>}
                            </TableCell>
                            <TableCell className="text-center">{item.quantidade}</TableCell>
                            <TableCell className="text-right">R$ {item.preco_unitario.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">R$ {item.preco_total.toFixed(2)}</TableCell>
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

              {/* Conditions & Totals */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Condições
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Vendedor</Label>
                        <Select value={formData.vendedor} onValueChange={(v) => setFormData({...formData, vendedor: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendedores.map(v => (
                              <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Validade (dias)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.validade_dias}
                          onChange={(e) => setFormData({...formData, validade_dias: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Forma de Pagamento</Label>
                      <Select value={formData.forma_pagamento} onValueChange={(v) => setFormData({...formData, forma_pagamento: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {FORMAS_PAGAMENTO.map(fp => (
                            <SelectItem key={fp} value={fp}>{fp}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Prazo de Entrega</Label>
                      <Input
                        value={formData.prazo_entrega}
                        onChange={(e) => setFormData({...formData, prazo_entrega: e.target.value})}
                        placeholder="Ex: 10 dias úteis"
                      />
                    </div>
                    <div>
                      <Label>Frete</Label>
                      <Select value={formData.frete_por_conta} onValueChange={(v) => setFormData({...formData, frete_por_conta: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FRETE_OPCOES.map(f => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-primary">
                      <DollarSign className="h-5 w-5" />
                      Totais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-medium">R$ {totais.valorTotal.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Valor Frete (R$)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.valor_frete}
                          onChange={(e) => setFormData({...formData, valor_frete: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Desconto (R$)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.desconto}
                          onChange={(e) => setFormData({...formData, desconto: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-primary pt-4 border-t">
                      <span>TOTAL:</span>
                      <span>R$ {totais.valorFinal.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Observations */}
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-secondary hover:bg-secondary/90">
                  {editingOrcamento ? 'Atualizar' : 'Criar'} Orçamento
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Orçamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{orcamentos.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Abertos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {orcamentos.filter(o => o.status === 'aberto').length}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Convertidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {orcamentos.filter(o => o.status === 'convertido').length}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total Abertos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              R$ {orcamentos.filter(o => o.status === 'aberto').reduce((acc, o) => acc + (o.valor_final || o.valor_total || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading">Lista de Orçamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {orcamentos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum orçamento cadastrado</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orcamentos.map((orc) => (
                    <TableRow key={orc.id}>
                      <TableCell className="font-mono text-sm font-medium">{orc.numero}</TableCell>
                      <TableCell>{new Date(orc.data).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{orc.cliente_nome}</TableCell>
                      <TableCell>{orc.vendedor || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {(orc.valor_final || orc.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{orc.validade_dias} dias</TableCell>
                      <TableCell>{getStatusBadge(orc.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleView(orc)} title="Visualizar">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => gerarPDF(orc)} title="PDF">
                            <Download className="h-4 w-4" />
                          </Button>
                          {orc.status === 'aberto' && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(orc)} title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => { setConvertingOrcamento(orc); setConvertOpen(true); }} 
                                title="Converter em Pedido"
                                className="text-green-600"
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(orc.id)} title="Excluir">
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

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Orçamento {viewingOrcamento?.numero}
            </DialogTitle>
          </DialogHeader>
          {viewingOrcamento && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="text-sm text-muted-foreground mb-2">Cliente</h4>
                  <p className="font-medium">{viewingOrcamento.cliente_nome}</p>
                  {viewingOrcamento.cliente_cnpj && <p className="text-sm">CNPJ: {viewingOrcamento.cliente_cnpj}</p>}
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="text-sm text-muted-foreground mb-2">Condições</h4>
                  <p className="text-sm">Pagamento: {viewingOrcamento.forma_pagamento}</p>
                  <p className="text-sm">Entrega: {viewingOrcamento.prazo_entrega}</p>
                  <p className="text-sm">Validade: {viewingOrcamento.validade_dias} dias</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(viewingOrcamento.itens || []).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.imagem_url && (
                            <img src={item.imagem_url} alt="" className="w-10 h-10 object-cover rounded" />
                          )}
                          <span>{item.descricao}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantidade}</TableCell>
                      <TableCell className="text-right">R$ {(item.preco_unitario || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">R$ {(item.preco_total || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>R$ {(viewingOrcamento.valor_total || 0).toFixed(2)}</span>
                  </div>
                  {viewingOrcamento.valor_frete > 0 && (
                    <div className="flex justify-between">
                      <span>Frete:</span>
                      <span>R$ {viewingOrcamento.valor_frete.toFixed(2)}</span>
                    </div>
                  )}
                  {viewingOrcamento.desconto > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Desconto:</span>
                      <span>- R$ {viewingOrcamento.desconto.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-2 border-t">
                    <span>TOTAL:</span>
                    <span>R$ {(viewingOrcamento.valor_final || viewingOrcamento.valor_total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => gerarPDF(viewingOrcamento)}>
                  <Download className="h-4 w-4 mr-2" />
                  Salvar PDF
                </Button>
                {viewingOrcamento.status === 'aberto' && (
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => { setViewOpen(false); setConvertingOrcamento(viewingOrcamento); setConvertOpen(true); }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Converter em Pedido
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Convert Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Converter Orçamento em Pedido</DialogTitle>
            <DialogDescription>
              Deseja converter o orçamento {convertingOrcamento?.numero} em pedido?
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O orçamento será marcado como &quot;Convertido&quot; e um novo pedido será criado com os mesmos itens.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleConvert}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Confirmar Conversão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
