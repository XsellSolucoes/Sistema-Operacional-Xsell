import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingCliente, setViewingCliente] = useState(null);
  const [editingCliente, setEditingCliente] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '',
    cnpj: '',
    nome: '',
    razao_social: '',
    nome_fantasia: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: ''
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const response = await axios.get(`${API}/clientes`, getAuthHeader());
      setClientes(response.data);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCliente) {
        await axios.put(`${API}/clientes/${editingCliente.id}`, formData, getAuthHeader());
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await axios.post(`${API}/clientes`, formData, getAuthHeader());
        toast.success('Cliente cadastrado com sucesso!');
      }
      setOpen(false);
      resetForm();
      fetchClientes();
    } catch (error) {
      toast.error('Erro ao salvar cliente');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      await axios.delete(`${API}/clientes/${id}`, getAuthHeader());
      toast.success('Cliente excluído com sucesso!');
      fetchClientes();
    } catch (error) {
      toast.error('Erro ao excluir cliente');
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      codigo: cliente.codigo,
      cnpj: cliente.cnpj,
      nome: cliente.nome,
      razao_social: cliente.razao_social,
      nome_fantasia: cliente.nome_fantasia,
      endereco: cliente.endereco,
      cidade: cliente.cidade,
      estado: cliente.estado,
      cep: cliente.cep
    });
    setOpen(true);
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      cnpj: '',
      nome: '',
      razao_social: '',
      nome_fantasia: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: ''
    });
    setEditingCliente(null);
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
    <div className="space-y-6" data-testid="clientes-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">Clientes</h1>
          <p className="text-muted-foreground mt-2">Gerencie seus clientes</p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary/90" data-testid="add-cliente-button">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
              <DialogDescription>
                Preencha os dados do cliente
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    required
                    data-testid="cliente-codigo-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                    required
                    data-testid="cliente-cnpj-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                  data-testid="cliente-nome-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="razao_social">Razão Social</Label>
                <Input
                  id="razao_social"
                  value={formData.razao_social}
                  onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                <Input
                  id="nome_fantasia"
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({...formData, nome_fantasia: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => setFormData({...formData, estado: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => setFormData({...formData, cep: e.target.value})}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-secondary hover:bg-secondary/90" data-testid="save-cliente-button">
                  {editingCliente ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading">Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {clientes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum cliente cadastrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Cidade/Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((cliente) => (
                  <TableRow key={cliente.id} data-testid={`cliente-row-${cliente.id}`}>
                    <TableCell className="font-mono text-sm">{cliente.codigo}</TableCell>
                    <TableCell className="font-medium">{cliente.nome}</TableCell>
                    <TableCell>{cliente.cnpj}</TableCell>
                    <TableCell>{cliente.cidade}/{cliente.estado}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(cliente)}
                        data-testid={`edit-cliente-${cliente.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cliente.id)}
                        data-testid={`delete-cliente-${cliente.id}`}
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