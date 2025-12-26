import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Eye, Pencil, Trash2, Printer, X, Search, ChevronDown, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'feito_fornecedor', label: 'Pedido feito ao Fornecedor' },
  { value: 'pronto_interno', label: 'Pedido pronto internamente' },
  { value: 'na_gravacao', label: 'Pedido na Gravação' },
  { value: 'solicitado_coleta', label: 'Pedido Solicitado Coleta' },
  { value: 'finalizado', label: 'Pedido finalizado' }
];

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [dadosPagamento, setDadosPagamento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingPedido, setViewingPedido] = useState(null);
  const [editingPedido, setEditingPedido] = useState(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  
  const [formData, setFormData] = useState({
    codigo_cliente: '',
    cliente_id: '',
    cliente_nome: '',
    forma_pagamento: 'pix',
    tipo_venda: 'consumidor_final',
    vendedor_id: '',
    frete: '0',
    repassar_frete: false,
    outras_despesas: '0',
    descricao_outras_despesas: '',
    repassar_outras_despesas: false,
    prazo_entrega: '',
    status: 'pendente',
    dados_pagamento_id: ''
  });
  
  const [itens, setItens] = useState([]);
  const [novoItem, setNovoItem] = useState({
    codigo_produto: '',
    produto_id: '',
    produto_nome: '',
    quantidade: '1',
    preco_compra: '0',
    preco_venda: '0',
    personalizado: false,
    tipo_personalizacao: '',
    valor_personalizacao: '0',
    repassar_personalizacao: false,
    variacao_selecionada: ''
  });
  const [produtoEncontrado, setProdutoEncontrado] = useState(null);
  const [buscandoProduto, setBuscandoProduto] = useState(false);
  
  // Estado para múltiplas despesas
  const [despesasPedido, setDespesasPedido] = useState([]);
  const [novaDespesa, setNovaDespesa] = useState({
    descricao: '',
    valor: '',
    repassar: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pedidosRes, clientesRes, produtosRes, vendedoresRes, dadosPagamentoRes] = await Promise.all([
        axios.get(`${API}/pedidos`, getAuthHeader()),
        axios.get(`${API}/clientes`, getAuthHeader()),
        axios.get(`${API}/produtos`, getAuthHeader()),
        axios.get(`${API}/vendedores`, getAuthHeader()),
        axios.get(`${API}/dados-pagamento`, getAuthHeader())
      ]);
      setPedidos(pedidosRes.data);
      setClientes(clientesRes.data);
      setProdutos(produtosRes.data);
      setVendedores(vendedoresRes.data.filter(v => v.ativo));
      setDadosPagamento(dadosPagamentoRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const buscarClientePorCodigo = async () => {
    if (!formData.codigo_cliente) {
      toast.error('Digite o código do cliente');
      return;
    }

    setBuscandoCliente(true);
    try {
      const response = await axios.get(`${API}/clientes/codigo/${formData.codigo_cliente}`, getAuthHeader());
      setFormData({
        ...formData,
        cliente_id: response.data.id,
        cliente_nome: `${response.data.nome} - ${response.data.cnpj}`
      });
      toast.success('Cliente encontrado!');
    } catch (error) {
      toast.error('Cliente não encontrado');
      setFormData({
        ...formData,
        cliente_id: '',
        cliente_nome: ''
      });
    } finally {
      setBuscandoCliente(false);
    }
  };

  const buscarProdutoPorCodigo = async () => {
    if (!novoItem.codigo_produto) {
      toast.error('Digite o código do produto');
      return;
    }

    setBuscandoProduto(true);
    try {
      const response = await axios.get(`${API}/produtos/codigo/${novoItem.codigo_produto}`, getAuthHeader());
      const produto = response.data;
      setProdutoEncontrado(produto);
      setNovoItem({
        ...novoItem,
        produto_id: produto.id,
        produto_nome: `${produto.codigo} - ${produto.descricao}`,
        preco_compra: produto.preco_compra.toString(),
        preco_venda: produto.preco_venda.toString(),
        variacao_selecionada: ''
      });
      toast.success('Produto encontrado!');
    } catch (error) {
      toast.error('Produto não encontrado');
      setProdutoEncontrado(null);
      setNovoItem({
        ...novoItem,
        produto_id: '',
        produto_nome: '',
        preco_compra: '0',
        preco_venda: '0',
        variacao_selecionada: ''
      });
    } finally {
      setBuscandoProduto(false);
    }
  };

  const handleProdutoChange = (produtoId) => {
    const produto = produtos.find(p => p.id === produtoId);
    if (produto) {
      setProdutoEncontrado(produto);
      setNovoItem({
        ...novoItem,
        produto_id: produtoId,
        produto_nome: `${produto.codigo} - ${produto.descricao}`,
        preco_compra: produto.preco_compra.toString(),
        preco_venda: produto.preco_venda.toString(),
        variacao_selecionada: ''
      });
    }
  };

  const adicionarItem = () => {
    if (!novoItem.produto_id) {
      toast.error('Selecione um produto');
      return;
    }

    const produto = produtos.find(p => p.id === novoItem.produto_id) || produtoEncontrado;
    const quantidade = parseFloat(novoItem.quantidade);
    const precoCompra = parseFloat(novoItem.preco_compra);
    const precoVenda = parseFloat(novoItem.preco_venda);
    
    // Cálculo do lucro por item (sem valor de personalização)
    const lucroItem = (precoVenda - precoCompra) * quantidade;

    const item = {
      produto_id: novoItem.produto_id,
      produto_codigo: produto.codigo,
      produto_descricao: produto.descricao,
      quantidade,
      preco_compra: precoCompra,
      preco_venda: precoVenda,
      lucro_item: lucroItem,
      personalizado: novoItem.personalizado,
      tipo_personalizacao: novoItem.tipo_personalizacao || null,
      variacao: novoItem.variacao_selecionada || null
    };

    setItens([...itens, item]);
    setProdutoEncontrado(null);
    setNovoItem({
      codigo_produto: '',
      produto_id: '',
      produto_nome: '',
      quantidade: '1',
      preco_compra: '0',
      preco_venda: '0',
      personalizado: false,
      tipo_personalizacao: '',
      valor_personalizacao: '0',
      repassar_personalizacao: false,
      variacao_selecionada: ''
    });
  };

  // Funções para gerenciar despesas do pedido
  const adicionarDespesa = () => {
    if (!novaDespesa.descricao || !novaDespesa.valor) {
      toast.error('Preencha a descrição e o valor da despesa');
      return;
    }
    setDespesasPedido([...despesasPedido, {
      id: Date.now().toString(),
      descricao: novaDespesa.descricao,
      valor: parseFloat(novaDespesa.valor),
      repassar: novaDespesa.repassar
    }]);
    setNovaDespesa({ descricao: '', valor: '', repassar: false });
    toast.success('Despesa adicionada!');
  };

  const removerDespesa = (id) => {
    setDespesasPedido(despesasPedido.filter(d => d.id !== id));
  };

  const removerItem = (index) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const calcularTotais = () => {
    const custoTotal = itens.reduce((sum, item) => {
      return sum + (item.preco_compra * item.quantidade);
    }, 0);
    
    let valorTotalVenda = itens.reduce((sum, item) => {
      return sum + (item.preco_venda * item.quantidade);
    }, 0);
    
    // Adiciona frete ao valor se repassar
    if (formData.repassar_frete) {
      valorTotalVenda += parseFloat(formData.frete || 0);
    }
    
    // Adiciona despesas repassadas ao valor de venda
    despesasPedido.forEach(d => {
      if (d.repassar) {
        valorTotalVenda += d.valor;
      }
    });
    
    // Total de todas as despesas (frete + despesas do pedido)
    const despesasTotais = (
      parseFloat(formData.frete || 0) + 
      despesasPedido.reduce((sum, d) => sum + d.valor, 0)
    );
    
    const lucroTotal = valorTotalVenda - custoTotal - despesasTotais;

    return { custoTotal, valorTotalVenda, despesasTotais, lucroTotal };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.cliente_id) {
      toast.error('Busque um cliente pelo código ou selecione da lista');
      return;
    }
    
    if (itens.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido');
      return;
    }

    if (!formData.vendedor_id) {
      toast.error('Selecione um vendedor');
      return;
    }

    try {
      const vendedor = vendedores.find(v => v.id === formData.vendedor_id);
      
      // Calcular total de despesas
      const totalDespesas = despesasPedido.reduce((sum, d) => sum + d.valor, 0);
      const despesasRepassadas = despesasPedido.filter(d => d.repassar).reduce((sum, d) => sum + d.valor, 0);
      
      const payload = {
        cliente_id: formData.cliente_id,
        itens,
        frete: parseFloat(formData.frete),
        repassar_frete: formData.repassar_frete,
        outras_despesas: totalDespesas,
        despesas_detalhadas: despesasPedido,
        prazo_entrega: formData.prazo_entrega,
        forma_pagamento: formData.forma_pagamento,
        dados_pagamento_id: formData.dados_pagamento_id || null,
        tipo_venda: formData.tipo_venda,
        vendedor: vendedor.nome
      };

      if (editingPedido) {
        await axios.put(`${API}/pedidos/${editingPedido.id}`, payload, getAuthHeader());
        toast.success('Pedido atualizado com sucesso!');
      } else {
        await axios.post(`${API}/pedidos`, payload, getAuthHeader());
        toast.success('Pedido criado com sucesso!');
      }
      
      setOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar pedido');
      console.error(error);
    }
  };

  const handleUpdateStatus = async (pedidoId, novoStatus) => {
    try {
      await axios.put(`${API}/pedidos/${pedidoId}/status?status=${novoStatus}`, {}, getAuthHeader());
      toast.success('Status atualizado com sucesso!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este pedido?')) return;
    try {
      await axios.delete(`${API}/pedidos/${id}`, getAuthHeader());
      toast.success('Pedido excluído com sucesso!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir pedido');
    }
  };

  const handleView = async (pedidoId) => {
    try {
      const response = await axios.get(`${API}/pedidos/${pedidoId}`, getAuthHeader());
      setViewingPedido(response.data);
      setViewOpen(true);
    } catch (error) {
      toast.error('Erro ao carregar detalhes do pedido');
    }
  };

  const handleEdit = async (pedido) => {
    try {
      // Buscar dados completos do pedido
      const response = await axios.get(`${API}/pedidos/${pedido.id}`, getAuthHeader());
      const pedidoCompleto = response.data;
      
      // Encontrar o vendedor pelo nome
      const vendedor = vendedores.find(v => v.nome === pedidoCompleto.vendedor);
      const cliente = clientes.find(c => c.id === pedidoCompleto.cliente_id);
      
      setFormData({
        codigo_cliente: cliente?.codigo || '',
        cliente_id: pedidoCompleto.cliente_id,
        cliente_nome: `${cliente?.nome || pedidoCompleto.cliente_nome} - ${cliente?.cnpj || ''}`,
        forma_pagamento: pedidoCompleto.forma_pagamento || 'pix',
        tipo_venda: pedidoCompleto.tipo_venda || 'consumidor_final',
        vendedor_id: vendedor?.id || '',
        frete: pedidoCompleto.frete?.toString() || '0',
        repassar_frete: pedidoCompleto.repassar_frete || false,
        outras_despesas: pedidoCompleto.outras_despesas?.toString() || '0',
        descricao_outras_despesas: pedidoCompleto.descricao_outras_despesas || '',
        repassar_outras_despesas: pedidoCompleto.repassar_outras_despesas || false,
        prazo_entrega: pedidoCompleto.prazo_entrega || '',
        status: pedidoCompleto.status || 'pendente',
        dados_pagamento_id: pedidoCompleto.dados_pagamento_id || ''
      });
      
      setItens(pedidoCompleto.itens || []);
      setDespesasPedido(pedidoCompleto.despesas_detalhadas || []);
      setEditingPedido(pedidoCompleto);
      setOpen(true);
    } catch (error) {
      toast.error('Erro ao carregar pedido para edição');
      console.error(error);
    }
  };

  const handlePrintCliente = (pedido) => {
    const printWindow = window.open('', '_blank');
    const cliente = clientes.find(c => c.id === pedido.cliente_id);
    
    // Calcular subtotal dos itens
    let subtotalItens = pedido.itens.reduce((sum, item) => {
      let precoItem = item.preco_venda;
      if (item.personalizado && item.repassar_personalizacao) {
        precoItem += (item.valor_personalizacao || 0);
      }
      return sum + (precoItem * item.quantidade);
    }, 0);
    
    // Despesas detalhadas que foram repassadas ao cliente
    const despesasDetalhadas = pedido.despesas_detalhadas || [];
    const despesasRepassadas = despesasDetalhadas.filter(d => d.repassar);
    const totalDespesasRepassadas = despesasRepassadas.reduce((sum, d) => sum + d.valor, 0);
    
    // Frete repassado
    const freteRepassado = pedido.repassar_frete ? pedido.frete : 0;
    
    // Total final para o cliente
    const totalCliente = subtotalItens + totalDespesasRepassadas + freteRepassado;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pedido ${pedido.numero} - Via Cliente</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px 40px; color: #333; font-size: 12px; }
            .header { display: flex; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #1e3a8a; padding-bottom: 15px; }
            .logo { width: 80px; height: auto; margin-right: 15px; }
            .empresa-info { flex: 1; font-size: 12px; }
            .empresa-info h2 { margin: 0 0 5px 0; font-size: 14px; color: #1e3a8a; }
            .empresa-info p { margin: 2px 0; color: #666; }
            .pedido-numero { text-align: right; }
            .pedido-numero h1 { margin: 0; font-size: 16px; color: #1e3a8a; }
            .pedido-numero p { margin: 5px 0 0 0; color: #666; }
            .info-section { margin-bottom: 15px; }
            .info-label { font-weight: bold; color: #1e3a8a; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #1e3a8a; color: white; font-size: 11px; }
            .totais-section { margin-top: 20px; }
            .totais-table { width: 350px; margin-left: auto; }
            .totais-table td { padding: 6px 10px; border: none; }
            .totais-table .label { text-align: right; font-weight: bold; color: #333; }
            .totais-table .valor { text-align: right; }
            .total-final { background-color: #1e3a8a; color: white; font-size: 14px; font-weight: bold; }
            .despesas-section { margin: 15px 0; padding: 10px; background-color: #f8f9fa; border-radius: 5px; }
            .despesas-section h4 { margin: 0 0 10px 0; color: #1e3a8a; font-size: 12px; }
            .despesa-item { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dotted #ddd; }
            .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #666; }
            .pagamento-box { margin-top: 20px; padding: 15px; background-color: #f8fafc; border-radius: 5px; font-size: 11px; }
            .pagamento-box h4 { margin: 0 0 10px 0; color: #1e3a8a; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="https://customer-assets.emergentagent.com/job_xsellmanager/artifacts/isjxf46l_logo%20alternativo.png" alt="XSELL Logo" class="logo" />
            <div class="empresa-info">
              <h2>Xsell Soluções Corporativas</h2>
              <p>CNPJ: 19.820.742/0001-91</p>
              <p>comercial@xsellsolucoes.com.br</p>
            </div>
            <div class="pedido-numero">
              <h1>PEDIDO ${pedido.numero}</h1>
              <p>${new Date(pedido.data).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div class="info-section">
            <p><span class="info-label">Cliente:</span> ${pedido.cliente_nome}</p>
            ${cliente ? `
              <p><span class="info-label">CNPJ:</span> ${cliente.cnpj}</p>
              <p><span class="info-label">Endereço:</span> ${cliente.endereco}, ${cliente.cidade}/${cliente.estado}</p>
            ` : ''}
            <p><span class="info-label">Vendedor:</span> ${pedido.vendedor}</p>
            ${pedido.prazo_entrega ? `<p><span class="info-label">Prazo de Entrega:</span> ${pedido.prazo_entrega}</p>` : ''}
          </div>

          <h3 style="font-size: 13px; color: #1e3a8a; margin-bottom: 10px;">Itens do Pedido</h3>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th style="text-align: center;">Qtd</th>
                <th style="text-align: right;">Valor Unit.</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${pedido.itens.map(item => {
                let precoFinal = item.preco_venda;
                let descricao = item.produto_descricao;
                if (item.variacao) descricao += ` (${item.variacao})`;
                if (item.personalizado) descricao += ` - ${item.tipo_personalizacao}`;
                
                return `
                  <tr>
                    <td>${item.produto_codigo}</td>
                    <td>${descricao}</td>
                    <td style="text-align: center;">${item.quantidade}</td>
                    <td style="text-align: right;">R$ ${precoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td style="text-align: right;">R$ ${(precoFinal * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="totais-section">
            <table class="totais-table">
              <tr>
                <td class="label">Subtotal Produtos:</td>
                <td class="valor">R$ ${subtotalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${freteRepassado > 0 ? `
                <tr>
                  <td class="label">Frete:</td>
                  <td class="valor">R$ ${freteRepassado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              ` : ''}
              ${despesasRepassadas.map(d => `
                <tr>
                  <td class="label">${d.descricao}:</td>
                  <td class="valor">R$ ${d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
              <tr class="total-final">
                <td class="label">TOTAL A PAGAR:</td>
                <td class="valor">R$ ${totalCliente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 20px;">
            <p><span class="info-label">Forma de Pagamento:</span> ${pedido.forma_pagamento.toUpperCase()}</p>
          </div>

          <div class="pagamento-box">
            <h4>Dados para Pagamento</h4>
            <p><strong>Banco do Brasil</strong> | Agência: 1529-6 | Conta Corrente: 81517-9</p>
            <p>Favorecido: XSELL SOLUÇÕES CORPORATIVAS LTDA</p>
            <p><strong>Pix:</strong> comercial@xsellsolucoes.com.br</p>
          </div>

          <div class="footer">
            <p>Xsell Soluções Corporativas LTDA | CNPJ: 19.820.742/0001-91 | comercial@xsellsolucoes.com.br</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const handlePrintInterno = (pedido) => {
    const printWindow = window.open('', '_blank');
    const cliente = clientes.find(c => c.id === pedido.cliente_id);
    const despesasDetalhadas = pedido.despesas_detalhadas || [];
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pedido ${pedido.numero} - Via Interna</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px 40px; color: #333; font-size: 12px; }
            .header { display: flex; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #dc2626; padding-bottom: 15px; }
            .logo { width: 80px; height: auto; margin-right: 15px; }
            .empresa-info { flex: 1; font-size: 12px; }
            .empresa-info h2 { margin: 0 0 5px 0; font-size: 14px; color: #dc2626; }
            .empresa-info p { margin: 2px 0; color: #666; }
            .pedido-numero { text-align: right; }
            .pedido-numero h1 { margin: 0; font-size: 16px; color: #dc2626; }
            .via-interna { background-color: #dc2626; color: white; padding: 5px 10px; border-radius: 3px; font-size: 10px; display: inline-block; margin-top: 5px; }
            .info-section { margin-bottom: 15px; }
            .info-label { font-weight: bold; color: #dc2626; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #dc2626; color: white; font-size: 10px; }
            .totals { margin-top: 15px; text-align: right; background-color: #f3f4f6; padding: 10px; border-radius: 5px; }
            .total-row { margin: 3px 0; font-size: 12px; }
            .lucro-final { font-size: 16px; font-weight: bold; color: #059669; margin-top: 8px; }
            .warning-box { background-color: #fee2e2; border: 2px solid #dc2626; padding: 10px; margin: 15px 0; border-radius: 5px; }
            .despesa-repassada { color: #059669; font-weight: bold; }
            .despesa-interna { color: #dc2626; font-weight: bold; }
            .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="https://customer-assets.emergentagent.com/job_xsellmanager/artifacts/isjxf46l_logo%20alternativo.png" alt="XSELL Logo" class="logo" />
            <div class="empresa-info">
              <h2>Xsell Soluções Corporativas</h2>
              <p>CNPJ: 19.820.742/0001-91</p>
              <p>comercial@xsellsolucoes.com.br</p>
            </div>
            <div class="pedido-numero">
              <h1>PEDIDO ${pedido.numero}</h1>
              <p>${new Date(pedido.data).toLocaleDateString('pt-BR')}</p>
              <span class="via-interna">⚠️ USO INTERNO</span>
            </div>
          </div>

          <div class="info-section">
            <p><span class="info-label">Cliente:</span> ${pedido.cliente_nome}</p>
            ${cliente ? `<p><span class="info-label">CNPJ:</span> ${cliente.cnpj}</p>` : ''}
            <p><span class="info-label">Vendedor:</span> ${pedido.vendedor}</p>
            ${pedido.prazo_entrega ? `<p><span class="info-label">Prazo de Entrega:</span> ${pedido.prazo_entrega}</p>` : ''}
            <p><span class="info-label">Status:</span> ${pedido.status}</p>
          </div>

          <h3 style="font-size: 13px; color: #dc2626; margin-bottom: 10px;">Detalhamento Completo dos Itens</h3>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Variação</th>
                <th>Qtd</th>
                <th>P. Compra</th>
                <th>P. Venda</th>
                <th>Personalização</th>
                <th>Lucro Unit.</th>
                <th>Lucro Total</th>
              </tr>
            </thead>
            <tbody>
              ${pedido.itens.map(item => {
                let custoUnit = item.preco_compra;
                let vendaUnit = item.preco_venda;
                
                if (item.personalizado && !item.repassar_personalizacao) {
                  custoUnit += item.valor_personalizacao;
                } else if (item.personalizado && item.repassar_personalizacao) {
                  vendaUnit += item.valor_personalizacao;
                }
                
                const lucroUnit = vendaUnit - custoUnit;
                const lucroTotal = lucroUnit * item.quantidade;
                
                return `
                  <tr>
                    <td>${item.produto_codigo} - ${item.produto_descricao}</td>
                    <td>${item.variacao || '-'}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${item.preco_compra.toFixed(2)}</td>
                    <td>R$ ${item.preco_venda.toFixed(2)}</td>
                    <td>${item.personalizado ? `${item.tipo_personalizacao}<br>R$ ${item.valor_personalizacao.toFixed(2)}<br>${item.repassar_personalizacao ? '<span class="despesa-repassada">(Repassado)</span>' : '<span class="despesa-interna">(Interno)</span>'}` : '-'}</td>
                    <td>R$ ${lucroUnit.toFixed(2)}</td>
                    <td style="font-weight: bold; color: ${lucroTotal >= 0 ? '#059669' : '#dc2626'}">R$ ${lucroTotal.toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="warning-box">
            <h4 style="margin-top: 0; color: #dc2626;">⚠️ Despesas Completas do Pedido:</h4>
            <table style="width: 100%; margin: 10px 0;">
              <thead>
                <tr style="background-color: #fecaca;">
                  <th style="text-align: left;">Descrição</th>
                  <th style="text-align: right;">Valor</th>
                  <th style="text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Frete</td>
                  <td style="text-align: right;">R$ ${pedido.frete.toFixed(2)}</td>
                  <td style="text-align: center;">${pedido.repassar_frete ? '<span class="despesa-repassada">Repassado</span>' : '<span class="despesa-interna">Interno</span>'}</td>
                </tr>
                ${despesasDetalhadas.map(d => `
                  <tr>
                    <td>${d.descricao}</td>
                    <td style="text-align: right;">R$ ${d.valor.toFixed(2)}</td>
                    <td style="text-align: center;">${d.repassar ? '<span class="despesa-repassada">Repassado</span>' : '<span class="despesa-interna">Interno</span>'}</td>
                  </tr>
                `).join('')}
                <tr style="font-weight: bold; background-color: #fecaca;">
                  <td>TOTAL DESPESAS</td>
                  <td style="text-align: right;">R$ ${pedido.despesas_totais.toFixed(2)}</td>
                  <td style="text-align: center;">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="totals">
            <div class="total-row">
              <span class="info-label">Custo Total:</span> 
              R$ ${pedido.custo_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div class="total-row">
              <span class="info-label">Valor de Venda:</span> 
              R$ ${pedido.valor_total_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div class="total-row">
              <span class="info-label">Despesas Totais:</span> 
              R$ ${pedido.despesas_totais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div class="lucro-final">
              Lucro Total: R$ ${pedido.lucro_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div class="total-row" style="color: #6b7280;">
              Margem: ${pedido.valor_total_venda > 0 ? ((pedido.lucro_total / pedido.valor_total_venda) * 100).toFixed(2) : 0}%
            </div>
          </div>

          <div class="footer">
            <p>Xsell Soluções Corporativas LTDA | CNPJ: 19.820.742/0001-91 | USO INTERNO</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const resetForm = () => {
    setFormData({
      codigo_cliente: '',
      cliente_id: '',
      cliente_nome: '',
      forma_pagamento: 'pix',
      tipo_venda: 'consumidor_final',
      vendedor_id: '',
      frete: '0',
      repassar_frete: false,
      outras_despesas: '0',
      descricao_outras_despesas: '',
      repassar_outras_despesas: false,
      prazo_entrega: '',
      status: 'pendente'
    });
    setItens([]);
    setDespesasPedido([]);
    setProdutoEncontrado(null);
    setNovoItem({
      codigo_produto: '',
      produto_id: '',
      produto_nome: '',
      quantidade: '1',
      preco_compra: '0',
      preco_venda: '0',
      personalizado: false,
      tipo_personalizacao: '',
      valor_personalizacao: '0',
      repassar_personalizacao: false,
      variacao_selecionada: ''
    });
    setEditingPedido(null);
  };

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      'pendente': { variant: 'secondary', label: 'Pendente' },
      'feito_fornecedor': { variant: 'default', label: 'Feito ao Fornecedor' },
      'pronto_interno': { variant: 'default', label: 'Pronto Internamente' },
      'na_gravacao': { variant: 'default', label: 'Na Gravação' },
      'solicitado_coleta': { variant: 'default', label: 'Solicitado Coleta' },
      'finalizado': { variant: 'default', label: 'Finalizado' }
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
    <div className="space-y-6" data-testid="pedidos-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">Pedidos</h1>
          <p className="text-muted-foreground mt-2">Gerencie seus pedidos de venda</p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary/90" data-testid="add-pedido-button">
              <Plus className="h-4 w-4 mr-2" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPedido ? 'Editar Pedido' : 'Novo Pedido'}</DialogTitle>
              <DialogDescription>
                Preencha os dados do pedido e adicione os itens
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Código do Cliente</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.codigo_cliente}
                      onChange={(e) => setFormData({...formData, codigo_cliente: e.target.value})}
                      placeholder="CLI-000001"
                      data-testid="codigo-cliente-input"
                    />
                    <Button 
                      type="button" 
                      onClick={buscarClientePorCodigo}
                      disabled={buscandoCliente}
                      size="icon"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Cliente {formData.cliente_nome && '(Encontrado)'}</Label>
                  {formData.cliente_nome ? (
                    <div className="p-2 bg-green-50 border border-green-200 rounded-md text-sm">
                      {formData.cliente_nome}
                    </div>
                  ) : (
                    <Select value={formData.cliente_id} onValueChange={(v) => {
                      const cliente = clientes.find(c => c.id === v);
                      setFormData({
                        ...formData, 
                        cliente_id: v,
                        cliente_nome: cliente ? `${cliente.nome} - ${cliente.cnpj}` : '',
                        codigo_cliente: cliente ? cliente.codigo : ''
                      });
                    }}>
                      <SelectTrigger data-testid="pedido-cliente-select">
                        <SelectValue placeholder="Ou selecione da lista" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map(cliente => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.codigo} - {cliente.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Vendedor *</Label>
                  <Select value={formData.vendedor_id} onValueChange={(v) => setFormData({...formData, vendedor_id: v})} required>
                    <SelectTrigger data-testid="pedido-vendedor-select">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores.map(vendedor => (
                        <SelectItem key={vendedor.id} value={vendedor.id}>
                          {vendedor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={formData.forma_pagamento} onValueChange={(v) => setFormData({...formData, forma_pagamento: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Venda</Label>
                  <Select value={formData.tipo_venda} onValueChange={(v) => setFormData({...formData, tipo_venda: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consumidor_final">Consumidor Final</SelectItem>
                      <SelectItem value="revenda">Revenda</SelectItem>
                      <SelectItem value="licitacao">Licitação</SelectItem>
                      <SelectItem value="brindeiros">Brindeiros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Frete (R$)</Label>
                  <div className="flex gap-2 items-end">
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.frete}
                      onChange={(e) => setFormData({...formData, frete: e.target.value})}
                      className="flex-1"
                    />
                    <label className="flex items-center space-x-2 cursor-pointer whitespace-nowrap pb-2">
                      <input
                        type="checkbox"
                        checked={formData.repassar_frete}
                        onChange={(e) => setFormData({...formData, repassar_frete: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-xs">Repassar</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prazo de Entrega</Label>
                  <Input
                    value={formData.prazo_entrega}
                    onChange={(e) => setFormData({...formData, prazo_entrega: e.target.value})}
                    placeholder="Ex: 5 dias úteis, 2 semanas"
                    data-testid="prazo-entrega-input"
                  />
                </div>
              </div>

              {/* Área de Despesas do Pedido */}
              <div className="p-4 bg-orange-50 rounded-md space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Despesas do Pedido</Label>
                </div>
                
                {/* Adicionar nova despesa */}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5 space-y-1">
                    <Label className="text-xs">Descrição</Label>
                    <Input
                      value={novaDespesa.descricao}
                      onChange={(e) => setNovaDespesa({...novaDespesa, descricao: e.target.value})}
                      placeholder="Ex: Taxa de importação, Embalagem"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={novaDespesa.valor}
                      onChange={(e) => setNovaDespesa({...novaDespesa, valor: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 flex items-center pb-1">
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={novaDespesa.repassar}
                        onChange={(e) => setNovaDespesa({...novaDespesa, repassar: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-xs">Repassar</span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <Button type="button" onClick={adicionarDespesa} size="sm" className="w-full">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Lista de despesas adicionadas */}
                {despesasPedido.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Despesas adicionadas:</Label>
                    <div className="space-y-1">
                      {despesasPedido.map((d) => (
                        <div key={d.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{d.descricao}</span>
                            <span className="text-muted-foreground">R$ {d.valor.toFixed(2)}</span>
                            {d.repassar ? (
                              <Badge variant="default" className="text-xs">Repassar</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Interno</Badge>
                            )}
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removerDespesa(d.id)}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-medium pt-2 border-t">
                        <span>Total Despesas: R$ {despesasPedido.reduce((s, d) => s + d.valor, 0).toFixed(2)}</span>
                        <span className="text-green-600">Repassado: R$ {despesasPedido.filter(d => d.repassar).reduce((s, d) => s + d.valor, 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-lg mb-4">Adicionar Itens</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Código do Produto</Label>
                      <div className="flex gap-2">
                        <Input
                          value={novoItem.codigo_produto}
                          onChange={(e) => setNovoItem({...novoItem, codigo_produto: e.target.value})}
                          placeholder="PROD-000001"
                          data-testid="codigo-produto-input"
                        />
                        <Button 
                          type="button" 
                          onClick={buscarProdutoPorCodigo}
                          disabled={buscandoProduto}
                          size="icon"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="col-span-3 space-y-2">
                      <Label>Produto {novoItem.produto_nome && '(Encontrado)'}</Label>
                      {novoItem.produto_nome ? (
                        <div className="p-2 bg-green-50 border border-green-200 rounded-md text-sm">
                          {novoItem.produto_nome}
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="ml-2 h-6 px-2"
                            onClick={() => {
                              setProdutoEncontrado(null);
                              setNovoItem({...novoItem, produto_id: '', produto_nome: '', preco_compra: '0', preco_venda: '0', variacao_selecionada: ''});
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Select value={novoItem.produto_id} onValueChange={handleProdutoChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Ou selecione da lista" />
                          </SelectTrigger>
                          <SelectContent>
                            {produtos.map(produto => (
                              <SelectItem key={produto.id} value={produto.id}>
                                {produto.codigo} - {produto.descricao}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Seleção de Variação do Produto */}
                  {produtoEncontrado && produtoEncontrado.variacoes && produtoEncontrado.variacoes.length > 0 && (
                    <div className="p-3 bg-purple-50 rounded-md">
                      <Label className="text-sm font-medium">Selecione a Variação</Label>
                      <Select 
                        value={novoItem.variacao_selecionada} 
                        onValueChange={(v) => setNovoItem({...novoItem, variacao_selecionada: v})}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Selecione uma variação" />
                        </SelectTrigger>
                        <SelectContent>
                          {produtoEncontrado.variacoes.map((v, idx) => (
                            <SelectItem key={idx} value={[v.cor, v.capacidade, v.material].filter(Boolean).join(' / ')}>
                              {[v.cor, v.capacidade, v.material].filter(Boolean).join(' / ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-6 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Qtd</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={novoItem.quantidade}
                        onChange={(e) => setNovoItem({...novoItem, quantidade: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>P. Compra</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={novoItem.preco_compra}
                        onChange={(e) => setNovoItem({...novoItem, preco_compra: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>P. Venda</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={novoItem.preco_venda}
                        onChange={(e) => setNovoItem({...novoItem, preco_venda: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-md space-y-3">
                    <Label>Personalização do Produto</Label>
                    <RadioGroup 
                      value={novoItem.personalizado ? 'sim' : 'nao'} 
                      onValueChange={(v) => setNovoItem({...novoItem, personalizado: v === 'sim'})}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="nao" id="nao-personalizado" />
                        <Label htmlFor="nao-personalizado" className="cursor-pointer">SEM PERSONALIZAÇÃO</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sim" id="sim-personalizado" />
                        <Label htmlFor="sim-personalizado" className="cursor-pointer">PERSONALIZADO</Label>
                      </div>
                    </RadioGroup>

                    {novoItem.personalizado && (
                      <div className="mt-3">
                        <div className="space-y-2">
                          <Label>Tipo de Personalização</Label>
                          <Input
                            value={novoItem.tipo_personalizacao}
                            onChange={(e) => setNovoItem({...novoItem, tipo_personalizacao: e.target.value})}
                            placeholder="Ex: Gravação a Laser, Serigrafia, Bordado"
                            data-testid="tipo-personalizacao-input"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Button type="button" onClick={adicionarItem} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>

                {itens.length > 0 && (
                  <div className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">P. Venda</TableHead>
                          <TableHead>Personalização</TableHead>
                          <TableHead className="text-right">Lucro</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itens.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.produto_codigo} - {item.produto_descricao}</TableCell>
                            <TableCell className="text-right">{item.quantidade}</TableCell>
                            <TableCell className="text-right">
                              R$ {item.preco_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              {item.personalizado ? (
                                <div className="text-xs">
                                  <div>{item.tipo_personalizacao}</div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">Sem personalização</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium" style={{color: item.lucro_item >= 0 ? '#059669' : '#dc2626'}}>
                              R$ {item.lucro_item.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => removerItem(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="mt-4 space-y-2 text-right p-4 bg-gray-50 rounded-md">
                      <div className="text-sm">
                        <span className="font-medium">Custo Total:</span> R$ {totais.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Valor de Venda:</span> R$ {totais.valorTotalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Despesas Totais:</span> R$ {totais.despesasTotais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xl font-bold text-secondary pt-2 border-t">
                        Lucro Total: R$ {totais.lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-secondary hover:bg-secondary/90" data-testid="save-pedido-button">
                  {editingPedido ? 'Atualizar' : 'Criar Pedido'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading">Lista de Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {pedidos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum pedido cadastrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map((pedido) => (
                  <TableRow key={pedido.id} data-testid={`pedido-row-${pedido.id}`}>
                    <TableCell className="font-mono text-sm font-medium">{pedido.numero}</TableCell>
                    <TableCell>
                      {new Date(pedido.data).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{pedido.cliente_nome}</TableCell>
                    <TableCell>{pedido.vendedor}</TableCell>
                    <TableCell className="text-right">
                      R$ {pedido.valor_total_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {pedido.lucro_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={pedido.status} 
                        onValueChange={(v) => handleUpdateStatus(pedido.id, v)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(pedido.id)}
                        data-testid={`view-pedido-${pedido.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`print-pedido-${pedido.id}`}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handlePrintCliente(pedido)}>
                            <Printer className="h-4 w-4 mr-2" />
                            Via Cliente
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrintInterno(pedido)}>
                            <Printer className="h-4 w-4 mr-2" />
                            Via Interna
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(pedido.id)}
                        data-testid={`delete-pedido-${pedido.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
            <DialogDescription>Informações completas do pedido</DialogDescription>
          </DialogHeader>
          {viewingPedido && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Número:</span> {viewingPedido.numero}</div>
                <div><span className="font-medium">Data:</span> {new Date(viewingPedido.data).toLocaleDateString('pt-BR')}</div>
                <div><span className="font-medium">Cliente:</span> {viewingPedido.cliente_nome}</div>
                <div><span className="font-medium">Vendedor:</span> {viewingPedido.vendedor}</div>
                <div><span className="font-medium">Pagamento:</span> {viewingPedido.forma_pagamento}</div>
                <div><span className="font-medium">Tipo:</span> {viewingPedido.tipo_venda}</div>
                <div><span className="font-medium">Status:</span> {getStatusBadge(viewingPedido.status)}</div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Itens do Pedido</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead>Personalização</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingPedido.itens.map((item, idx) => {
                      let precoFinal = item.preco_venda;
                      if (item.personalizado && item.repassar_personalizacao) {
                        precoFinal += item.valor_personalizacao;
                      }
                      
                      return (
                        <TableRow key={idx}>
                          <TableCell>{item.produto_codigo} - {item.produto_descricao}</TableCell>
                          <TableCell className="text-right">{item.quantidade}</TableCell>
                          <TableCell className="text-right">
                            R$ {precoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            {item.personalizado ? (
                              <div className="text-xs">
                                <div>{item.tipo_personalizacao}</div>
                                <Badge variant="secondary" className="mt-1">
                                  {item.repassar_personalizacao ? 'Repassado' : 'Interno'}
                                </Badge>
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {(precoFinal * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2 text-right border-t pt-4">
                <div><span className="font-medium">Subtotal:</span> R$ {viewingPedido.valor_total_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div><span className="font-medium">Frete:</span> R$ {viewingPedido.frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                {viewingPedido.outras_despesas > 0 && (
                  <div>
                    <span className="font-medium">Outras Despesas:</span> R$ {viewingPedido.outras_despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    {viewingPedido.repassar_outras_despesas && <Badge variant="secondary" className="ml-2">Repassado</Badge>}
                  </div>
                )}
                <div className="text-lg font-bold text-secondary">
                  Total: R$ {(viewingPedido.valor_total_venda + viewingPedido.frete).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-lg font-bold text-primary">
                  Lucro: R$ {viewingPedido.lucro_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Fechar</Button>
            <Button 
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-white"
              onClick={() => {
                setViewOpen(false);
                handlePrintCliente(viewingPedido);
              }}
              data-testid="print-cliente-button"
            >
              <Printer className="h-4 w-4 mr-2" />
              Via Cliente
            </Button>
            <Button 
              className="bg-secondary hover:bg-secondary/90"
              onClick={() => {
                setViewOpen(false);
                handlePrintInterno(viewingPedido);
              }}
              data-testid="print-interno-button"
            >
              <Printer className="h-4 w-4 mr-2" />
              Via Interna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
