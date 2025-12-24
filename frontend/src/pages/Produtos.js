import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingProduto, setViewingProduto] = useState(null);
  const [editingProduto, setEditingProduto] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '',
    descricao: '',
    preco_compra: '',
    preco_venda: '',
    margem: '40',
    fornecedor: '',
    variacoes: []
  });
  const [novaVariacao, setNovaVariacao] = useState({ cor: '', capacidade: '', material: '' });

  useEffect(() => {
    fetchProdutos();
  }, []);

  useEffect(() => {
    if (formData.preco_compra && formData.margem) {
      const precoCompra = parseFloat(formData.preco_compra);
      const margem = parseFloat(formData.margem);
      if (!isNaN(precoCompra) && !isNaN(margem)) {
        const precoVenda = precoCompra * (1 + margem / 100);
        setFormData(prev => ({...prev, preco_venda: precoVenda.toFixed(2)}));
      }
    }
  }, [formData.preco_compra, formData.margem]);

  const fetchProdutos = async () => {
    try {
      const response = await axios.get(`${API}/produtos`, getAuthHeader());
      setProdutos(response.data);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        preco_compra: parseFloat(formData.preco_compra),
        preco_venda: parseFloat(formData.preco_venda),
        margem: parseFloat(formData.margem),
        variacoes: formData.variacoes
      };

      if (editingProduto) {
        await axios.put(`${API}/produtos/${editingProduto.id}`, payload, getAuthHeader());
        toast.success('Produto atualizado com sucesso!');
      } else {
        await axios.post(`${API}/produtos`, payload, getAuthHeader());
        toast.success('Produto cadastrado com sucesso!');
      }
      setOpen(false);
      resetForm();
      fetchProdutos();
    } catch (error) {
      toast.error('Erro ao salvar produto');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await axios.delete(`${API}/produtos/${id}`, getAuthHeader());
      toast.success('Produto excluído com sucesso!');
      fetchProdutos();
    } catch (error) {
      toast.error('Erro ao excluir produto');
    }
  };

  const handleEdit = (produto) => {
    setEditingProduto(produto);
    setFormData({
      codigo: produto.codigo,
      descricao: produto.descricao,
      preco_compra: produto.preco_compra.toString(),
      preco_venda: produto.preco_venda.toString(),
      margem: produto.margem.toString(),
      fornecedor: produto.fornecedor || '',
      variacoes: produto.variacoes || []
    });
    setOpen(true);
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      descricao: '',
      preco_compra: '',
      preco_venda: '',
      margem: '40',
      fornecedor: '',
      variacoes: []
    });
    setNovaVariacao({ cor: '', capacidade: '', material: '' });
    setEditingProduto(null);
  };

  const adicionarVariacao = () => {
    if (!novaVariacao.cor && !novaVariacao.capacidade && !novaVariacao.material) {
      toast.error('Preencha ao menos um campo da variação');
      return;
    }
    setFormData({
      ...formData,
      variacoes: [...formData.variacoes, { ...novaVariacao, id: Date.now().toString() }]
    });
    setNovaVariacao({ cor: '', capacidade: '', material: '' });
    toast.success('Variação adicionada!');
  };

  const removerVariacao = (id) => {
    setFormData({
      ...formData,
      variacoes: formData.variacoes.filter(v => v.id !== id)
    });
  };

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="produtos-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">Produtos</h1>
          <p className="text-muted-foreground mt-2">Gerencie seu catálogo de produtos</p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary/90" data-testid="add-produto-button">
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduto ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
              <DialogDescription>
                Preencha os dados do produto. O preço de venda é calculado automaticamente.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                  required
                  data-testid="produto-codigo-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  required
                  data-testid="produto-descricao-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fornecedor">Fornecedor (Opcional)</Label>
                <Input
                  id="fornecedor"
                  value={formData.fornecedor}
                  onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                  placeholder="Nome do fornecedor"
                  data-testid="produto-fornecedor-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preco_compra">Preço de Compra</Label>
                  <Input
                    id="preco_compra"
                    type="number"
                    step="0.01"
                    value={formData.preco_compra}
                    onChange={(e) => setFormData({...formData, preco_compra: e.target.value})}
                    required
                    data-testid="produto-preco-compra-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="margem">Margem (%)</Label>
                  <Input
                    id="margem"
                    type="number"
                    step="0.01"
                    value={formData.margem}
                    onChange={(e) => setFormData({...formData, margem: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preco_venda">Preço de Venda (Calculado)</Label>
                <Input
                  id="preco_venda"
                  type="number"
                  step="0.01"
                  value={formData.preco_venda}
                  onChange={(e) => setFormData({...formData, preco_venda: e.target.value})}
                  required
                  data-testid="produto-preco-venda-input"
                />
              </div>
              
              {/* Variações do Produto */}
              <div className="border-t pt-4">
                <Label className="text-base font-semibold">Variações do Produto</Label>
                <p className="text-sm text-muted-foreground mb-3">Adicione cores, capacidades ou materiais disponíveis</p>
                <div className="grid grid-cols-4 gap-2 items-end">
                  <div>
                    <Label className="text-xs">Cor</Label>
                    <Input
                      value={novaVariacao.cor}
                      onChange={(e) => setNovaVariacao({...novaVariacao, cor: e.target.value})}
                      placeholder="Ex: Azul"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Capacidade</Label>
                    <Input
                      value={novaVariacao.capacidade}
                      onChange={(e) => setNovaVariacao({...novaVariacao, capacidade: e.target.value})}
                      placeholder="Ex: 500ml"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Material</Label>
                    <Input
                      value={novaVariacao.material}
                      onChange={(e) => setNovaVariacao({...novaVariacao, material: e.target.value})}
                      placeholder="Ex: Plástico"
                    />
                  </div>
                  <Button type="button" onClick={adicionarVariacao} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.variacoes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.variacoes.map((v) => (
                      <Badge key={v.id} variant="secondary" className="flex items-center gap-1 py-1">
                        {[v.cor, v.capacidade, v.material].filter(Boolean).join(' / ')}
                        <button type="button" onClick={() => removerVariacao(v.id)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-secondary hover:bg-secondary/90" data-testid="save-produto-button">
                  {editingProduto ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading">Lista de Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          {produtos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum produto cadastrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Preço Compra</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right">Preço Venda</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((produto) => (
                  <TableRow key={produto.id} data-testid={`produto-row-${produto.id}`}>
                    <TableCell className="font-mono text-sm">{produto.codigo}</TableCell>
                    <TableCell className="font-medium">{produto.descricao}</TableCell>
                    <TableCell className="text-right">
                      R$ {produto.preco_compra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">{produto.margem}%</TableCell>
                    <TableCell className="text-right">
                      R$ {produto.preco_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(produto)}
                        data-testid={`edit-produto-${produto.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(produto.id)}
                        data-testid={`delete-produto-${produto.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setViewingProduto(produto);
                          setViewOpen(true);
                        }}
                        data-testid={`view-produto-${produto.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Visualização */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Produto</DialogTitle>
            <DialogDescription>Informações completas do produto</DialogDescription>
          </DialogHeader>
          {viewingProduto && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Código:</span> {viewingProduto.codigo}</div>
                <div><span className="font-medium">Fornecedor:</span> {viewingProduto.fornecedor || '-'}</div>
                <div className="col-span-2"><span className="font-medium">Descrição:</span> {viewingProduto.descricao}</div>
                <div><span className="font-medium">Preço Compra:</span> R$ {viewingProduto.preco_compra.toFixed(2)}</div>
                <div><span className="font-medium">Margem:</span> {viewingProduto.margem}%</div>
                <div className="col-span-2"><span className="font-medium">Preço Venda:</span> <span className="text-primary font-bold">R$ {viewingProduto.preco_venda.toFixed(2)}</span></div>
              </div>
              {viewingProduto.variacoes && viewingProduto.variacoes.length > 0 && (
                <div className="border-t pt-3">
                  <span className="font-medium text-sm">Variações:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {viewingProduto.variacoes.map((v, i) => (
                      <Badge key={i} variant="outline">
                        {[v.cor, v.capacidade, v.material].filter(Boolean).join(' / ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Fechar</Button>
            <Button 
              className="bg-secondary hover:bg-secondary/90"
              onClick={() => {
                setViewOpen(false);
                handleEdit(viewingProduto);
              }}
            >
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
