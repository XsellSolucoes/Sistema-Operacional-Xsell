import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function DadosPagamento() {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingDados, setEditingDados] = useState(null);
  const [formData, setFormData] = useState({
    banco: '',
    tipo_conta: 'corrente',
    agencia: '',
    numero_conta: '',
    titular: '',
    cpf_cnpj_titular: '',
    pix: '',
    observacoes: ''
  });

  useEffect(() => {
    fetchDados();
  }, []);

  const fetchDados = async () => {
    try {
      const response = await axios.get(`${API}/dados-pagamento`, getAuthHeader());
      setDados(response.data);
    } catch (error) {
      toast.error('Erro ao carregar dados de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDados) {
        await axios.put(`${API}/dados-pagamento/${editingDados.id}`, formData, getAuthHeader());
        toast.success('Dados atualizados com sucesso!');
      } else {
        await axios.post(`${API}/dados-pagamento`, formData, getAuthHeader());
        toast.success('Dados cadastrados com sucesso!');
      }
      setOpen(false);
      resetForm();
      fetchDados();
    } catch (error) {
      toast.error('Erro ao salvar dados');
    }
  };

  const handleEdit = (item) => {
    setEditingDados(item);
    setFormData({
      banco: item.banco,
      tipo_conta: item.tipo_conta,
      agencia: item.agencia,
      numero_conta: item.numero_conta,
      titular: item.titular,
      cpf_cnpj_titular: item.cpf_cnpj_titular || '',
      pix: item.pix || '',
      observacoes: item.observacoes || ''
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir?')) return;
    try {
      await axios.delete(`${API}/dados-pagamento/${id}`, getAuthHeader());
      toast.success('Dados excluídos!');
      fetchDados();
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const resetForm = () => {
    setFormData({
      banco: '',
      tipo_conta: 'corrente',
      agencia: '',
      numero_conta: '',
      titular: '',
      cpf_cnpj_titular: '',
      pix: '',
      observacoes: ''
    });
    setEditingDados(null);
  };

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (!isOpen) resetForm();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">Dados de Pagamento</h1>
          <p className="text-muted-foreground">Gerencie suas contas bancárias</p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingDados ? 'Editar' : 'Nova'} Conta Bancária</DialogTitle>
              <DialogDescription>Cadastre os dados para recebimento</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Banco *</Label>
                  <Input value={formData.banco} onChange={(e) => setFormData({...formData, banco: e.target.value})} required placeholder="Ex: Banco do Brasil" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Conta *</Label>
                  <Select value={formData.tipo_conta} onValueChange={(v) => setFormData({...formData, tipo_conta: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Conta Corrente</SelectItem>
                      <SelectItem value="poupanca">Poupança</SelectItem>
                      <SelectItem value="pagamento">Conta Pagamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Agência *</Label>
                  <Input value={formData.agencia} onChange={(e) => setFormData({...formData, agencia: e.target.value})} required placeholder="0000" />
                </div>
                <div className="space-y-2">
                  <Label>Número da Conta *</Label>
                  <Input value={formData.numero_conta} onChange={(e) => setFormData({...formData, numero_conta: e.target.value})} required placeholder="00000-0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Titular *</Label>
                <Input value={formData.titular} onChange={(e) => setFormData({...formData, titular: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CPF/CNPJ do Titular</Label>
                  <Input value={formData.cpf_cnpj_titular} onChange={(e) => setFormData({...formData, cpf_cnpj_titular: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Chave PIX</Label>
                  <Input value={formData.pix} onChange={(e) => setFormData({...formData, pix: e.target.value})} placeholder="Email, telefone ou chave aleatória" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Input value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} placeholder="Informações adicionais" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
                <Button type="submit" className="bg-secondary hover:bg-secondary/90">{editingDados ? 'Atualizar' : 'Cadastrar'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Contas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {dados.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma conta cadastrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Agência</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead>PIX</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        {item.banco}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{item.tipo_conta}</TableCell>
                    <TableCell>{item.agencia}</TableCell>
                    <TableCell>{item.numero_conta}</TableCell>
                    <TableCell>{item.titular}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.pix || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
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