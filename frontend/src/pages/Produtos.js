import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
  const [editingProduto, setEditingProduto] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '',
    descricao: '',
    preco_compra: '',
    preco_venda: '',
    margem: '40',
    fornecedor: ''
  });

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
        margem: parseFloat(formData.margem)
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
      fornecedor: produto.fornecedor || ''
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
      fornecedor: ''
    });
    setEditingProduto(null);
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
