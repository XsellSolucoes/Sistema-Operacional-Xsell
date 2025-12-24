import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function Vendedores() {
  const [vendedores, setVendedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState(null);
  const [isPresidente, setIsPresidente] = useState(false);
  const [currentVendedor, setCurrentVendedor] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    nivel_acesso: 'administrativo',
    ativo: true
  });

  useEffect(() => {
    fetchVendedores();
    checkCurrentUserLevel();
  }, []);

  const checkCurrentUserLevel = async () => {
    try {
      const response = await axios.get(`${API}/vendedores/me`, getAuthHeader());
      setIsPresidente(response.data.is_presidente);
      setCurrentVendedor(response.data.vendedor);
    } catch (error) {
      console.error('Erro ao verificar nível:', error);
    }
  };

  const fetchVendedores = async () => {
    try {
      const response = await axios.get(`${API}/vendedores`, getAuthHeader());
      setVendedores(response.data);
    } catch (error) {
      toast.error('Erro ao carregar vendedores');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVendedor) {
        await axios.put(`${API}/vendedores/${editingVendedor.id}`, formData, getAuthHeader());
        toast.success('Vendedor atualizado com sucesso!');
      } else {
        await axios.post(`${API}/vendedores`, formData, getAuthHeader());
        toast.success('Vendedor cadastrado com sucesso!');
      }
      setOpen(false);
      resetForm();
      fetchVendedores();
    } catch (error) {
      const detail = error.response?.data?.detail || 'Erro ao salvar vendedor';
      toast.error(detail);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este vendedor?')) return;
    try {
      await axios.delete(`${API}/vendedores/${id}`, getAuthHeader());
      toast.success('Vendedor excluído com sucesso!');
      fetchVendedores();
    } catch (error) {
      const detail = error.response?.data?.detail || 'Erro ao excluir vendedor';
      toast.error(detail);
    }
  };

  const handleEdit = (vendedor) => {
    setEditingVendedor(vendedor);
    setFormData({
      nome: vendedor.nome,
      email: vendedor.email,
      telefone: vendedor.telefone,
      nivel_acesso: vendedor.nivel_acesso,
      ativo: vendedor.ativo
    });
    setOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      nivel_acesso: 'administrativo',
      ativo: true
    });
    setEditingVendedor(null);
  };

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  const getNivelBadge = (nivel) => {
    const config = {
      'administrativo': { variant: 'secondary', label: 'Administrativo' },
      'diretor': { variant: 'default', label: 'Diretor' },
      'presidente': { variant: 'default', label: 'Presidente' }
    };
    const { variant, label } = config[nivel] || config.administrativo;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getNivelDescricao = (nivel) => {
    const descricoes = {
      'administrativo': 'Pode cadastrar pedidos e orçamentos',
      'diretor': 'Acesso a fornecedores, pedidos, orçamentos e produtos',
      'presidente': 'Acesso total ao sistema'
    };
    return descricoes[nivel] || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="vendedores-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">Vendedores</h1>
          <p className="text-muted-foreground mt-2">Gerencie os vendedores e níveis de acesso</p>
          {currentVendedor && (
            <p className="text-sm text-muted-foreground mt-1">
              Seu nível: <Badge variant={isPresidente ? 'default' : 'secondary'} className={isPresidente ? 'bg-green-600' : ''}>
                {currentVendedor.nivel_acesso?.toUpperCase()}
              </Badge>
            </p>
          )}
        </div>
        {isPresidente ? (
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-secondary hover:bg-secondary/90" data-testid="add-vendedor-button">
                <Plus className="h-4 w-4 mr-2" />
                Novo Vendedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingVendedor ? 'Editar Vendedor' : 'Novo Vendedor'}</DialogTitle>
                <DialogDescription>
                  Preencha os dados do vendedor e defina o nível de acesso
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    required
                    data-testid="vendedor-nome-input"
                  />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  data-testid="vendedor-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  required
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nivel_acesso">Nível de Acesso *</Label>
                <Select value={formData.nivel_acesso} onValueChange={(v) => setFormData({...formData, nivel_acesso: v})}>
                  <SelectTrigger data-testid="vendedor-nivel-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="diretor">Diretor</SelectItem>
                    <SelectItem value="presidente">Presidente</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  {getNivelDescricao(formData.nivel_acesso)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="ativo" className="cursor-pointer">Vendedor Ativo</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-secondary hover:bg-secondary/90" data-testid="save-vendedor-button">
                  {editingVendedor ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              ⚠️ Acesso Restrito
            </Badge>
            <span className="text-sm text-muted-foreground">
              Apenas Presidente pode cadastrar/editar vendedores
            </span>
          </div>
        )}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Lista de Vendedores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vendedores.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum vendedor cadastrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Nível de Acesso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedores.map((vendedor) => (
                  <TableRow key={vendedor.id} data-testid={`vendedor-row-${vendedor.id}`}>
                    <TableCell className="font-mono text-sm">{vendedor.codigo}</TableCell>
                    <TableCell className="font-medium">{vendedor.nome}</TableCell>
                    <TableCell>{vendedor.email}</TableCell>
                    <TableCell>{vendedor.telefone}</TableCell>
                    <TableCell>{getNivelBadge(vendedor.nivel_acesso)}</TableCell>
                    <TableCell>
                      <Badge variant={vendedor.ativo ? 'default' : 'secondary'}>
                        {vendedor.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {isPresidente ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(vendedor)}
                            data-testid={`edit-vendedor-${vendedor.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(vendedor.id)}
                            data-testid={`delete-vendedor-${vendedor.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Níveis de Acesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-semibold text-sm">Administrativo</p>
            <p className="text-sm text-muted-foreground">Acesso limitado: pode cadastrar apenas pedidos e orçamentos</p>
          </div>
          <div>
            <p className="font-semibold text-sm">Diretor</p>
            <p className="text-sm text-muted-foreground">Acesso intermediário: fornecedores, pedidos, orçamentos e produtos</p>
          </div>
          <div>
            <p className="font-semibold text-sm">Presidente</p>
            <p className="text-sm text-muted-foreground">Acesso total: todas as funcionalidades do sistema</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
