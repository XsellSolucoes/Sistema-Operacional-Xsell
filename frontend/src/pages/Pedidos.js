import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Pencil, Trash2, Printer, FileDown, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingPedido, setViewingPedido] = useState(null);
  const [editingPedido, setEditingPedido] = useState(null);
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    forma_pagamento: 'pix',
    tipo_venda: 'consumidor_final',
    vendedor: '',
    frete: '0'
  });
  
  const [itens, setItens] = useState([]);
  const [novoItem, setNovoItem] = useState({
    produto_id: '',
    quantidade: '1',
    preco_compra: '0',
    preco_venda: '0',
    despesas: '0'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pedidosRes, clientesRes, produtosRes] = await Promise.all([
        axios.get(`${API}/pedidos`, getAuthHeader()),
        axios.get(`${API}/clientes`, getAuthHeader()),
        axios.get(`${API}/produtos`, getAuthHeader())
      ]);
      setPedidos(pedidosRes.data);
      setClientes(clientesRes.data);
      setProdutos(produtosRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleProdutoChange = (produtoId) => {
    const produto = produtos.find(p => p.id === produtoId);
    if (produto) {
      setNovoItem({
        ...novoItem,
        produto_id: produtoId,
        preco_compra: produto.preco_compra.toString(),
        preco_venda: produto.preco_venda.toString()
      });
    }
  };

  const adicionarItem = () => {
    if (!novoItem.produto_id) {
      toast.error('Selecione um produto');
      return;
    }

    const produto = produtos.find(p => p.id === novoItem.produto_id);
    const quantidade = parseFloat(novoItem.quantidade);
    const precoCompra = parseFloat(novoItem.preco_compra);
    const precoVenda = parseFloat(novoItem.preco_venda);
    const despesas = parseFloat(novoItem.despesas);
    
    const lucroItem = (precoVenda - precoCompra - despesas) * quantidade;

    const item = {
      produto_id: novoItem.produto_id,
      produto_codigo: produto.codigo,
      produto_descricao: produto.descricao,
      quantidade,
      preco_compra: precoCompra,
      preco_venda: precoVenda,
      despesas,
      lucro_item: lucroItem
    };

    setItens([...itens, item]);
    setNovoItem({
      produto_id: '',
      quantidade: '1',
      preco_compra: '0',
      preco_venda: '0',
      despesas: '0'
    });
  };

  const removerItem = (index) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const calcularTotais = () => {
    const custoTotal = itens.reduce((sum, item) => sum + (item.preco_compra * item.quantidade), 0);
    const valorTotalVenda = itens.reduce((sum, item) => sum + (item.preco_venda * item.quantidade), 0);
    const despesasTotais = itens.reduce((sum, item) => sum + (item.despesas * item.quantidade), 0) + parseFloat(formData.frete || 0);
    const lucroTotal = valorTotalVenda - custoTotal - despesasTotais;

    return { custoTotal, valorTotalVenda, despesasTotais, lucroTotal };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (itens.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido');
      return;
    }

    try {
      const payload = {
        cliente_id: formData.cliente_id,
        itens,
        frete: parseFloat(formData.frete),
        forma_pagamento: formData.forma_pagamento,
        tipo_venda: formData.tipo_venda,
        vendedor: formData.vendedor
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

  const handlePrint = (pedido) => {
    const printWindow = window.open('', '_blank');
    const cliente = clientes.find(c => c.id === pedido.cliente_id);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pedido ${pedido.numero}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px;
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 20px;
            }
            .logo { 
              max-width: 200px; 
              margin-bottom: 10px;
            }
            .info-section { 
              margin-bottom: 20px;
            }
            .info-label { 
              font-weight: bold;
              color: #1e3a8a;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 12px; 
              text-align: left;
            }
            th { 
              background-color: #1e3a8a; 
              color: white;
            }
            .totals { 
              margin-top: 20px;
              text-align: right;
            }
            .total-row { 
              margin: 5px 0;
              font-size: 16px;
            }
            .total-final { 
              font-size: 20px;
              font-weight: bold;
              color: #f97316;
              margin-top: 10px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="https://customer-assets.emergentagent.com/job_xsellmanager/artifacts/isjxf46l_logo%20alternativo.png" 
                 alt="XSELL Logo" class="logo" />
            <h1>PEDIDO DE VENDA</h1>
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
              ${pedido.itens.map(item => `
                <tr>
                  <td>${item.produto_codigo}</td>
                  <td>${item.produto_descricao}</td>
                  <td>${item.quantidade}</td>
                  <td>R$ ${item.preco_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td>R$ ${(item.preco_venda * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span class="info-label">Subtotal:</span> 
              R$ ${pedido.valor_total_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            ${pedido.frete > 0 ? `
              <div class="total-row">
                <span class="info-label">Frete:</span> 
                R$ ${pedido.frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            ` : ''}
            <div class="total-final">
              Total: R$ ${(pedido.valor_total_venda + pedido.frete).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div style="margin-top: 40px;">
            <p><span class="info-label">Forma de Pagamento:</span> ${pedido.forma_pagamento.toUpperCase()}</p>
            <p><span class="info-label">Tipo de Venda:</span> ${pedido.tipo_venda.replace('_', ' ').toUpperCase()}</p>
          </div>

          <div style="margin-top: 40px; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
            <h4 style="color: #1e3a8a; margin-bottom: 10px;">Dados para Pagamento</h4>
            <p><strong>Banco do Brasil</strong></p>
            <p>Agência: 1529-6 | Conta Corrente: 81517-9</p>
            <p>Favorecido: XSELL SOLUÇÕES CORPORATIVAS LTDA</p>
            <p>Pix: comercial@xsellsolucoes.com.br</p>
          </div>

          <div class="footer">
            <p>XSELL Soluções Corporativas LTDA</p>
            <p>comercial@xsellsolucoes.com.br</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      forma_pagamento: 'pix',
      tipo_venda: 'consumidor_final',
      vendedor: '',
      frete: '0'
    });
    setItens([]);
    setEditingPedido(null);
  };

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'pendente': 'secondary',
      'pago': 'default',
      'cancelado': 'destructive'
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.toUpperCase()}
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
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPedido ? 'Editar Pedido' : 'Novo Pedido'}</DialogTitle>
              <DialogDescription>
                Preencha os dados do pedido e adicione os itens
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select value={formData.cliente_id} onValueChange={(v) => setFormData({...formData, cliente_id: v})} required>
                    <SelectTrigger data-testid="pedido-cliente-select">
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map(cliente => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome} - {cliente.cnpj}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vendedor *</Label>
                  <Input
                    value={formData.vendedor}
                    onChange={(e) => setFormData({...formData, vendedor: e.target.value})}
                    required
                    placeholder="Nome do vendedor"
                    data-testid="pedido-vendedor-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.frete}
                    onChange={(e) => setFormData({...formData, frete: e.target.value})}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-lg mb-4">Adicionar Itens</h3>
                <div className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-4 space-y-2">
                    <Label>Produto</Label>
                    <Select value={novoItem.produto_id} onValueChange={handleProdutoChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {produtos.map(produto => (
                          <SelectItem key={produto.id} value={produto.id}>
                            {produto.codigo} - {produto.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                    <Label>Preço Compra</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={novoItem.preco_compra}
                      onChange={(e) => setNovoItem({...novoItem, preco_compra: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Preço Venda</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={novoItem.preco_venda}
                      onChange={(e) => setNovoItem({...novoItem, preco_venda: e.target.value})}
                    />
                  </div>
                  <div className="col-span-1 space-y-2">
                    <Label>Despesas</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={novoItem.despesas}
                      onChange={(e) => setNovoItem({...novoItem, despesas: e.target.value})}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button type="button" onClick={adicionarItem} size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {itens.length > 0 && (
                  <div className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">P. Compra</TableHead>
                          <TableHead className="text-right">P. Venda</TableHead>
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
                              R$ {item.preco_compra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              R$ {item.preco_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

                    <div className="mt-4 space-y-2 text-right">
                      <div className="text-sm">
                        <span className="font-medium">Custo Total:</span> R$ {totais.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Valor de Venda:</span> R$ {totais.valorTotalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Despesas Totais:</span> R$ {totais.despesasTotais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-lg font-bold text-secondary">
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
                    <TableCell>{getStatusBadge(pedido.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(pedido.id)}
                        data-testid={`view-pedido-${pedido.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePrint(pedido)}
                        data-testid={`print-pedido-${pedido.id}`}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
              </div>

              <div>
                <h3 className="font-semibold mb-2">Itens do Pedido</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingPedido.itens.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.produto_codigo} - {item.produto_descricao}</TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right">
                          R$ {item.preco_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {(item.preco_venda * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2 text-right border-t pt-4">
                <div><span className="font-medium">Subtotal:</span> R$ {viewingPedido.valor_total_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div><span className="font-medium">Frete:</span> R$ {viewingPedido.frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
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
              className="bg-secondary hover:bg-secondary/90"
              onClick={() => {
                setViewOpen(false);
                handlePrint(viewingPedido);
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
