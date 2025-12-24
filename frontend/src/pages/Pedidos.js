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
import { Plus, Eye, Pencil, Trash2, Printer, X, Search, ChevronDown } from 'lucide-react';
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
    status: 'pendente'
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
      const [pedidosRes, clientesRes, produtosRes, vendedoresRes] = await Promise.all([
        axios.get(`${API}/pedidos`, getAuthHeader()),
        axios.get(`${API}/clientes`, getAuthHeader()),
        axios.get(`${API}/produtos`, getAuthHeader()),
        axios.get(`${API}/vendedores`, getAuthHeader())
      ]);
      setPedidos(pedidosRes.data);
      setClientes(clientesRes.data);
      setProdutos(produtosRes.data);
      setVendedores(vendedoresRes.data.filter(v => v.ativo));
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
    const valorPersonalizacao = parseFloat(novoItem.valor_personalizacao);
    
    // Cálculo do lucro por item
    let custoTotal = precoCompra;
    let vendaTotal = precoVenda;
    
    // Se personalizado e repassar, adiciona ao valor de venda
    if (novoItem.personalizado && novoItem.repassar_personalizacao) {
      vendaTotal += valorPersonalizacao;
    }
    // Se personalizado e não repassar, adiciona ao custo
    else if (novoItem.personalizado && !novoItem.repassar_personalizacao) {
      custoTotal += valorPersonalizacao;
    }
    
    const lucroItem = (vendaTotal - custoTotal) * quantidade;

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
      valor_personalizacao: valorPersonalizacao,
      repassar_personalizacao: novoItem.repassar_personalizacao,
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
      let custo = item.preco_compra * item.quantidade;
      // Adiciona custo de personalização não repassada
      if (item.personalizado && !item.repassar_personalizacao) {
        custo += item.valor_personalizacao * item.quantidade;
      }
      return sum + custo;
    }, 0);
    
    let valorTotalVenda = itens.reduce((sum, item) => {
      let venda = item.preco_venda * item.quantidade;
      // Adiciona valor de personalização repassada
      if (item.personalizado && item.repassar_personalizacao) {
        venda += item.valor_personalizacao * item.quantidade;
      }
      return sum + venda;
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

  const handlePrintCliente = (pedido) => {
    const printWindow = window.open('', '_blank');
    const cliente = clientes.find(c => c.id === pedido.cliente_id);
    
    // Calcular despesas repassadas
    const despesasRepassadas = [];
    pedido.itens.forEach(item => {
      if (item.personalizado && item.repassar_personalizacao) {
        despesasRepassadas.push(`${item.tipo_personalizacao} (${item.produto_descricao}): R$ ${(item.valor_personalizacao * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      }
    });
    
    if (pedido.repassar_outras_despesas && pedido.outras_despesas > 0) {
      despesasRepassadas.push(`${pedido.descricao_outras_despesas || 'Outras despesas'}: R$ ${pedido.outras_despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pedido ${pedido.numero} - Via Cliente</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e3a8a; padding-bottom: 20px; }
            .logo { max-width: 200px; margin-bottom: 10px; }
            .info-section { margin-bottom: 20px; }
            .info-label { font-weight: bold; color: #1e3a8a; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #1e3a8a; color: white; }
            .totals { margin-top: 20px; text-align: right; }
            .total-row { margin: 5px 0; font-size: 16px; }
            .total-final { font-size: 20px; font-weight: bold; color: #f97316; margin-top: 10px; }
            .despesas-box { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="https://customer-assets.emergentagent.com/job_xsellmanager/artifacts/isjxf46l_logo%20alternativo.png" alt="XSELL Logo" class="logo" />
            <h1>PEDIDO DE VENDA - VIA CLIENTE</h1>
            <p style="font-size: 18px; color: #666;">Nº ${pedido.numero}</p>
          </div>

          <div class="info-section">
            <p><span class="info-label">Data:</span> ${new Date(pedido.data).toLocaleDateString('pt-BR')}</p>
            <p><span class="info-label">Cliente:</span> ${pedido.cliente_nome}</p>
            ${cliente ? `
              <p><span class="info-label">CNPJ:</span> ${cliente.cnpj}</p>
              <p><span class="info-label">Endereço:</span> ${cliente.endereco}, ${cliente.cidade}/${cliente.estado}</p>
            ` : ''}
            <p><span class="info-label">Vendedor:</span> ${pedido.vendedor}</p>
            ${pedido.prazo_entrega ? `<p><span class="info-label">Prazo de Entrega:</span> ${pedido.prazo_entrega}</p>` : ''}
          </div>

          <h3>Itens do Pedido</h3>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Qtd</th>
                <th>Valor Unit.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${pedido.itens.map(item => {
                let precoFinal = item.preco_venda;
                let descricao = item.produto_descricao;
                
                if (item.personalizado && item.repassar_personalizacao) {
                  precoFinal += item.valor_personalizacao;
                  descricao += ` (${item.tipo_personalizacao})`;
                }
                
                return `
                  <tr>
                    <td>${item.produto_codigo}</td>
                    <td>${descricao}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${precoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td>R$ ${(precoFinal * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          ${despesasRepassadas.length > 0 ? `
            <div class="despesas-box">
              <h4 style="margin-top: 0; color: #856404;">Despesas Adicionais Incluídas:</h4>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${despesasRepassadas.map(d => `<li>${d}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div class="totals">
            <div class="total-row">
              <span class="info-label">Subtotal:</span> 
              R$ ${pedido.valor_total_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            ${pedido.frete > 0 && pedido.repassar_frete ? `
              <div class="total-row">
                <span class="info-label">Frete:</span> 
                R$ ${pedido.frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            ` : ''}
            <div class="total-final">
              Total: R$ ${(pedido.valor_total_venda + (pedido.repassar_frete ? pedido.frete : 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div style="margin-top: 40px;">
            <p><span class="info-label">Forma de Pagamento:</span> ${pedido.forma_pagamento.toUpperCase()}</p>
          </div>

          <div style="margin-top: 40px; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
            <h4 style="color: #1e3a8a; margin-bottom: 10px;">Dados para Pagamento</h4>
            <p><strong>Banco do Brasil</strong></p>
            <p>Agência: 1529-6 | Conta Corrente: 81517-9</p>
            <p>Favorecido: XSELL SOLUÇÕES CORPORATIVAS LTDA</p>
            <p>Pix: comercial@xsellsolucoes.com.br</p>
          </div>

          <div class="footer">
            <p>XSELL Soluções Corporativas LTDA | comercial@xsellsolucoes.com.br</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const handlePrintInterno = (pedido) => {
    const printWindow = window.open('', '_blank');
    const cliente = clientes.find(c => c.id === pedido.cliente_id);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pedido ${pedido.numero} - Via Interna</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #dc2626; padding-bottom: 20px; }
            .logo { max-width: 200px; margin-bottom: 10px; }
            .via-interna { background-color: #dc2626; color: white; padding: 10px; border-radius: 5px; display: inline-block; }
            .info-section { margin-bottom: 20px; }
            .info-label { font-weight: bold; color: #dc2626; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #dc2626; color: white; }
            .totals { margin-top: 20px; text-align: right; background-color: #f3f4f6; padding: 15px; border-radius: 5px; }
            .total-row { margin: 5px 0; font-size: 14px; }
            .lucro-final { font-size: 20px; font-weight: bold; color: #059669; margin-top: 10px; }
            .warning-box { background-color: #fee2e2; border: 2px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="https://customer-assets.emergentagent.com/job_xsellmanager/artifacts/isjxf46l_logo%20alternativo.png" alt="XSELL Logo" class="logo" />
            <h1>PEDIDO - VIA INTERNA</h1>
            <p class="via-interna">USO INTERNO - NÃO ENVIAR AO CLIENTE</p>
            <p style="font-size: 18px; color: #666;">Nº ${pedido.numero}</p>
          </div>

          <div class="info-section">
            <p><span class="info-label">Data:</span> ${new Date(pedido.data).toLocaleDateString('pt-BR')}</p>
            <p><span class="info-label">Cliente:</span> ${pedido.cliente_nome}</p>
            ${cliente ? `<p><span class="info-label">CNPJ:</span> ${cliente.cnpj}</p>` : ''}
            <p><span class="info-label">Vendedor:</span> ${pedido.vendedor}</p>
            ${pedido.prazo_entrega ? `<p><span class="info-label">Prazo de Entrega:</span> ${pedido.prazo_entrega}</p>` : ''}
            <p><span class="info-label">Status:</span> ${pedido.status}</p>
          </div>

          <h3>Detalhamento Completo dos Itens</h3>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Qtd</th>
                <th>P. Compra</th>
                <th>P. Venda</th>
                <th>Personalização</th>
                <th>Despesas</th>
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
                
                const lucroUnit = vendaUnit - custoUnit - item.despesas;
                const lucroTotal = lucroUnit * item.quantidade;
                
                return `
                  <tr>
                    <td>${item.produto_codigo} - ${item.produto_descricao}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${item.preco_compra.toFixed(2)}</td>
                    <td>R$ ${item.preco_venda.toFixed(2)}</td>
                    <td>${item.personalizado ? `${item.tipo_personalizacao}<br>R$ ${item.valor_personalizacao.toFixed(2)}<br>${item.repassar_personalizacao ? '(Repassado)' : '(Interno)'}` : '-'}</td>
                    <td>R$ ${item.despesas.toFixed(2)}</td>
                    <td>R$ ${lucroUnit.toFixed(2)}</td>
                    <td style="font-weight: bold; color: ${lucroTotal >= 0 ? '#059669' : '#dc2626'}">R$ ${lucroTotal.toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="warning-box">
            <h4 style="margin-top: 0; color: #dc2626;">⚠️ Despesas Completas:</h4>
            <p><strong>Frete:</strong> R$ ${pedido.frete.toFixed(2)}</p>
            ${pedido.outras_despesas > 0 ? `
              <p><strong>${pedido.descricao_outras_despesas || 'Outras Despesas'}:</strong> R$ ${pedido.outras_despesas.toFixed(2)} 
              ${pedido.repassar_outras_despesas ? '<span style="color: #059669;">(Repassado ao cliente)</span>' : '<span style="color: #dc2626;">(Custo interno)</span>'}</p>
            ` : ''}
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

              <div className="grid grid-cols-3 gap-4 p-4 bg-orange-50 rounded-md">
                <div className="space-y-2">
                  <Label>Outras Despesas (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.outras_despesas}
                    onChange={(e) => setFormData({...formData, outras_despesas: e.target.value})}
                    data-testid="outras-despesas-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição da Despesa</Label>
                  <Input
                    value={formData.descricao_outras_despesas}
                    onChange={(e) => setFormData({...formData, descricao_outras_despesas: e.target.value})}
                    placeholder="Ex: Taxas de importação"
                    data-testid="descricao-despesas-input"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.repassar_outras_despesas}
                      onChange={(e) => setFormData({...formData, repassar_outras_despesas: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Repassar ao cliente</span>
                  </label>
                </div>
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
                  
                  <div className="grid grid-cols-12 gap-4">
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
                    <div className="col-span-2 space-y-2">
                      <Label>Despesas</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={novoItem.despesas}
                        onChange={(e) => setNovoItem({...novoItem, despesas: e.target.value})}
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
                        <Label htmlFor="nao-personalizado" className="cursor-pointer">Não Personalizado</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sim" id="sim-personalizado" />
                        <Label htmlFor="sim-personalizado" className="cursor-pointer">Personalizado</Label>
                      </div>
                    </RadioGroup>

                    {novoItem.personalizado && (
                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div className="space-y-2">
                          <Label>Tipo de Personalização</Label>
                          <Input
                            value={novoItem.tipo_personalizacao}
                            onChange={(e) => setNovoItem({...novoItem, tipo_personalizacao: e.target.value})}
                            placeholder="Ex: Bordado, Serigrafia"
                            data-testid="tipo-personalizacao-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={novoItem.valor_personalizacao}
                            onChange={(e) => setNovoItem({...novoItem, valor_personalizacao: e.target.value})}
                            data-testid="valor-personalizacao-input"
                          />
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={novoItem.repassar_personalizacao}
                              onChange={(e) => setNovoItem({...novoItem, repassar_personalizacao: e.target.checked})}
                              className="rounded"
                            />
                            <span className="text-sm">Repassar ao cliente</span>
                          </label>
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
                                  <div>R$ {item.valor_personalizacao.toFixed(2)}</div>
                                  <Badge variant="secondary" className="mt-1">
                                    {item.repassar_personalizacao ? 'Repassado' : 'Não repassado'}
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">Não</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              R$ {item.lucro_item.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removerItem(index)}
                              >
                                <X className="h-4 w-4 text-destructive" />
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
