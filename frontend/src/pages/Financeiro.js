import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Wallet, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function Financeiro() {
  const [caixa, setCaixa] = useState({ saldo: 0 });
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [openMovimento, setOpenMovimento] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'agua',
    descricao: '',
    valor: '',
    data_despesa: new Date().toISOString().split('T')[0],
    data_vencimento: new Date().toISOString().split('T')[0],
    status: 'pendente'
  });
  const [movimento, setMovimento] = useState({
    tipo: 'credito',
    valor: '',
    descricao: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [caixaRes, despesasRes] = await Promise.all([
        axios.get(`${API}/financeiro/caixa`, getAuthHeader()),
        axios.get(`${API}/despesas`, getAuthHeader())
      ]);
      setCaixa(caixaRes.data);
      setDespesas(despesasRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDespesa = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        valor: parseFloat(formData.valor),
        data_despesa: new Date(formData.data_despesa).toISOString(),
        data_vencimento: new Date(formData.data_vencimento).toISOString()
      };
      await axios.post(`${API}/despesas`, payload, getAuthHeader());
      toast.success('Despesa cadastrada com sucesso!');
      setOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Erro ao cadastrar despesa');
    }
  };

  const handleSubmitMovimento = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        tipo: movimento.tipo,
        valor: parseFloat(movimento.valor),
        descricao: movimento.descricao
      };
      await axios.post(`${API}/financeiro/caixa/movimento`, payload, getAuthHeader());
      toast.success('Movimento registrado com sucesso!');
      setOpenMovimento(false);
      setMovimento({ tipo: 'credito', valor: '', descricao: '' });
      fetchData();
    } catch (error) {
      toast.error('Erro ao registrar movimento');
    }
  };

  const handleMarcarPago = async (despesaId) => {
    try {
      await axios.put(`${API}/despesas/${despesaId}/status?status=pago`, {}, getAuthHeader());
      toast.success('Despesa marcada como paga!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const resetForm = () => {
    setFormData({
      tipo: 'agua',
      descricao: '',
      valor: '',
      data_despesa: new Date().toISOString().split('T')[0],
      data_vencimento: new Date().toISOString().split('T')[0],
      status: 'pendente'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="financeiro-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">Financeiro</h1>
          <p className="text-muted-foreground mt-2">Controle financeiro e despesas</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openMovimento} onOpenChange={setOpenMovimento}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="add-movimento-button">
                <Wallet className="h-4 w-4 mr-2" />
                Movimento Caixa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Movimento de Caixa</DialogTitle>
                <DialogDescription>Adicione crédito ou débito manual no caixa</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitMovimento} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={movimento.tipo} onValueChange={(v) => setMovimento({...movimento, tipo: v})}>
                    <SelectTrigger data-testid="movimento-tipo-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credito">Crédito</SelectItem>
                      <SelectItem value="debito">Débito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={movimento.valor}
                    onChange={(e) => setMovimento({...movimento, valor: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={movimento.descricao}
                    onChange={(e) => setMovimento({...movimento, descricao: e.target.value})}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpenMovimento(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-secondary hover:bg-secondary/90">Registrar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-secondary hover:bg-secondary/90" data-testid="add-despesa-button">
                <Plus className="h-4 w-4 mr-2" />
                Nova Despesa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Despesa</DialogTitle>
                <DialogDescription>Cadastre uma nova despesa</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitDespesa} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})}>
                    <SelectTrigger data-testid="despesa-tipo-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agua">Água</SelectItem>
                      <SelectItem value="luz">Luz</SelectItem>
                      <SelectItem value="telefone">Telefone</SelectItem>
                      <SelectItem value="impostos">Impostos</SelectItem>
                      <SelectItem value="boletos">Boletos</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    required
                    data-testid="despesa-descricao-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({...formData, valor: e.target.value})}
                    required
                    data-testid="despesa-valor-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data da Despesa</Label>
                    <Input
                      type="date"
                      value={formData.data_despesa}
                      onChange={(e) => setFormData({...formData, data_despesa: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Vencimento</Label>
                    <Input
                      type="date"
                      value={formData.data_vencimento}
                      onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger data-testid="despesa-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-secondary hover:bg-secondary/90" data-testid="save-despesa-button">Cadastrar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-sm" data-testid="saldo-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <Wallet className="h-5 w-5" />
              Saldo em Caixa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-secondary">
              R$ {caixa.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading">Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          {despesas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma despesa cadastrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despesas.map((despesa) => (
                  <TableRow key={despesa.id} data-testid={`despesa-row-${despesa.id}`}>
                    <TableCell className="capitalize">{despesa.tipo}</TableCell>
                    <TableCell>{despesa.descricao}</TableCell>
                    <TableCell className="text-right">
                      R$ {despesa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {new Date(despesa.data_vencimento).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={despesa.status === 'pago' ? 'default' : 'secondary'}>
                        {despesa.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {despesa.status === 'pendente' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarcarPago(despesa.id)}
                          data-testid={`marcar-pago-${despesa.id}`}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Marcar Pago
                        </Button>
                      )}
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
