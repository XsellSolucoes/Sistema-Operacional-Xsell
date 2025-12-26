import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Wallet, TrendingUp, TrendingDown, Check, Bell, Mail, AlertTriangle, Pencil, Trash2, Upload, FileText, Download, X, Eye, Calendar, DollarSign } from 'lucide-react';
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
  const [editingDespesa, setEditingDespesa] = useState(null);
  const [openMovimento, setOpenMovimento] = useState(false);
  const [despesasVencimento, setDespesasVencimento] = useState([]);
  const [notificacaoConfig, setNotificacaoConfig] = useState({});
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedDespesa, setSelectedDespesa] = useState(null);
  const [formData, setFormData] = useState({
    tipo: 'agua',
    descricao: '',
    valor: '',
    data_despesa: new Date().toISOString().split('T')[0],
    data_vencimento: new Date().toISOString().split('T')[0],
    status: 'pendente'
  });
  const [arquivoBoleto, setArquivoBoleto] = useState(null);
  const [uploadingBoleto, setUploadingBoleto] = useState(false);
  const [movimento, setMovimento] = useState({
    tipo: 'credito',
    valor: '',
    descricao: ''
  });

  // Função para download de boleto com autenticação
  const handleDownloadBoleto = async (despesa) => {
    if (!despesa.boleto) {
      toast.error('Esta despesa não possui boleto anexado');
      return;
    }
    
    try {
      const response = await axios.get(
        `${API}/despesas/${despesa.id}/boleto/download`,
        {
          ...getAuthHeader(),
          responseType: 'blob'
        }
      );
      
      // Criar URL do blob e fazer download
      const blob = new Blob([response.data], { type: despesa.boleto.tipo || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', despesa.boleto.nome || 'boleto');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Download iniciado!');
    } catch (error) {
      console.error('Erro ao baixar boleto:', error);
      toast.error('Erro ao baixar boleto');
    }
  };

  // Função para visualizar despesa
  const handleVisualizarDespesa = (despesa) => {
    setSelectedDespesa(despesa);
    setViewDialogOpen(true);
  };

  useEffect(() => {
    fetchData();
    checkDespesasVencimento();
    fetchNotificacaoConfig();
  }, []);

  const checkDespesasVencimento = async () => {
    try {
      const response = await axios.get(`${API}/notificacoes/despesas-vencimento`, getAuthHeader());
      setDespesasVencimento(response.data.despesas || []);
    } catch (error) {
      console.error('Erro ao verificar vencimentos:', error);
    }
  };

  const fetchNotificacaoConfig = async () => {
    try {
      const response = await axios.get(`${API}/notificacoes/config`, getAuthHeader());
      setNotificacaoConfig(response.data);
    } catch (error) {
      console.error('Erro ao carregar config:', error);
    }
  };

  const enviarNotificacaoEmail = async () => {
    try {
      const response = await axios.post(`${API}/notificacoes/enviar-email-vencimentos`, {}, getAuthHeader());
      if (response.data.enviado) {
        toast.success(response.data.message);
      } else {
        toast.info(response.data.message);
      }
    } catch (error) {
      toast.error('Erro ao enviar notificação');
    }
  };

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
        data_despesa: new Date(formData.data_despesa + 'T12:00:00').toISOString(),
        data_vencimento: new Date(formData.data_vencimento + 'T12:00:00').toISOString()
      };
      
      let despesaId;
      if (editingDespesa) {
        await axios.put(`${API}/despesas/${editingDespesa.id}`, payload, getAuthHeader());
        despesaId = editingDespesa.id;
        toast.success('Despesa atualizada com sucesso!');
      } else {
        const response = await axios.post(`${API}/despesas`, payload, getAuthHeader());
        despesaId = response.data.id;
        toast.success('Despesa cadastrada com sucesso!');
      }

      // Upload do boleto se houver arquivo selecionado
      if (arquivoBoleto && despesaId) {
        setUploadingBoleto(true);
        const formDataUpload = new FormData();
        formDataUpload.append('file', arquivoBoleto);
        
        try {
          await axios.post(
            `${API}/despesas/${despesaId}/upload-boleto`,
            formDataUpload,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'multipart/form-data'
              }
            }
          );
          toast.success('Boleto anexado com sucesso!');
        } catch (uploadError) {
          toast.error('Despesa salva, mas erro ao anexar boleto');
        }
        setUploadingBoleto(false);
      }

      setOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar despesa');
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

  const handleEditDespesa = (despesa) => {
    setEditingDespesa(despesa);
    const dataDespesa = despesa.data_despesa ? new Date(despesa.data_despesa).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const dataVencimento = despesa.data_vencimento ? new Date(despesa.data_vencimento).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setFormData({
      tipo: despesa.tipo,
      descricao: despesa.descricao,
      valor: despesa.valor.toString(),
      data_despesa: dataDespesa,
      data_vencimento: dataVencimento,
      status: despesa.status
    });
    setOpen(true);
  };

  const handleDeleteDespesa = async (despesaId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta despesa?')) return;
    try {
      await axios.delete(`${API}/despesas/${despesaId}`, getAuthHeader());
      toast.success('Despesa excluída com sucesso!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir despesa');
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
    setEditingDespesa(null);
    setArquivoBoleto(null);
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
    <div className="space-y-6" data-testid="financeiro-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">Financeiro</h1>
          <p className="text-muted-foreground mt-2">Controle financeiro e despesas</p>
        </div>
        <div className="flex gap-2">
          {/* Botão de Notificação por Email */}
          <Button 
            variant="outline" 
            onClick={enviarNotificacaoEmail}
            className={despesasVencimento.length > 0 ? 'border-orange-500 text-orange-600' : ''}
            data-testid="enviar-notificacao-button"
          >
            <Mail className="h-4 w-4 mr-2" />
            Enviar Alerta por Email
            {despesasVencimento.length > 0 && (
              <Badge className="ml-2 bg-orange-500">{despesasVencimento.length}</Badge>
            )}
          </Button>
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
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-secondary hover:bg-secondary/90" data-testid="add-despesa-button">
                <Plus className="h-4 w-4 mr-2" />
                Nova Despesa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDespesa ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
                <DialogDescription>{editingDespesa ? 'Atualize os dados da despesa' : 'Cadastre uma nova despesa'}</DialogDescription>
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

                {/* Upload de Boleto */}
                <div className="space-y-2">
                  <Label>Anexar Boleto (PDF, JPG, PNG)</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {arquivoBoleto ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-red-500" />
                          <span className="text-sm font-medium">{arquivoBoleto.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(arquivoBoleto.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setArquivoBoleto(null)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Arraste o boleto ou clique para selecionar
                        </p>
                        <input
                          type="file"
                          id="boleto-upload"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setArquivoBoleto(file);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('boleto-upload')?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Selecionar Arquivo
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Mostrar boleto existente ao editar */}
                  {editingDespesa?.boleto && (
                    <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700">Boleto anexado: {editingDespesa.boleto.nome}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadBoleto(editingDespesa)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Baixar
                      </Button>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-secondary hover:bg-secondary/90" data-testid="save-despesa-button">
                    {editingDespesa ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alerta de Vencimentos */}
      {despesasVencimento.length > 0 && (
        <Card className="border-orange-300 bg-orange-50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Despesas Próximas ao Vencimento ({despesasVencimento.length})
            </CardTitle>
            <CardDescription className="text-orange-600">
              As seguintes despesas vencem hoje ou amanhã
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despesasVencimento.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.descricao}</TableCell>
                    <TableCell>{d.tipo}</TableCell>
                    <TableCell className="text-right text-red-600 font-bold">
                      R$ {d.valor?.toFixed(2)}
                    </TableCell>
                    <TableCell>{new Date(d.data_vencimento).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <Badge className={d.dias_para_vencer === 0 ? 'bg-red-600' : 'bg-orange-500'}>
                        {d.dias_para_vencer === 0 ? 'VENCE HOJE!' : 'Vence amanhã'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-orange-700">
                Email de destino: <strong>{notificacaoConfig.email_destino || 'Não configurado'}</strong>
              </p>
              <Button 
                onClick={enviarNotificacaoEmail}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Mail className="h-4 w-4 mr-2" />
                Enviar Alerta por Email
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <TableHead className="text-center">Boleto</TableHead>
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
                    <TableCell className="text-center">
                      {despesa.boleto ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => handleDownloadBoleto(despesa)}
                          title={`Baixar: ${despesa.boleto.nome}`}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          <Download className="h-3 w-3" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleVisualizarDespesa(despesa)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {despesa.status === 'pendente' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarcarPago(despesa.id)}
                          data-testid={`marcar-pago-${despesa.id}`}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Pago
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditDespesa(despesa)}
                        data-testid={`edit-despesa-${despesa.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDespesa(despesa.id)}
                        data-testid={`delete-despesa-${despesa.id}`}
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

      {/* Modal de Visualização de Despesa */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Detalhes da Despesa
            </DialogTitle>
            <DialogDescription>
              Visualização completa da despesa
            </DialogDescription>
          </DialogHeader>

          {selectedDespesa && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge 
                  variant={selectedDespesa.status === 'pago' ? 'default' : 'secondary'}
                  className={selectedDespesa.status === 'pago' ? 'bg-green-500' : 'bg-yellow-500'}
                >
                  {selectedDespesa.status?.toUpperCase()}
                </Badge>
              </div>

              {/* Tipo e Descrição */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-semibold capitalize">{selectedDespesa.tipo}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-bold text-red-600 text-xl">
                    R$ {selectedDespesa.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Descrição */}
              {selectedDespesa.descricao && (
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                  <p className="text-sm">{selectedDespesa.descricao}</p>
                </div>
              )}

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Data da Despesa</p>
                  </div>
                  <p className="font-medium">
                    {selectedDespesa.data_despesa 
                      ? new Date(selectedDespesa.data_despesa).toLocaleDateString('pt-BR')
                      : '-'}
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <p className="text-xs text-muted-foreground">Vencimento</p>
                  </div>
                  <p className="font-medium">
                    {selectedDespesa.data_vencimento 
                      ? new Date(selectedDespesa.data_vencimento).toLocaleDateString('pt-BR')
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Boleto Anexado */}
              <div className="p-4 border-2 border-dashed rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-red-500" />
                  <p className="font-semibold">Boleto Anexado</p>
                </div>
                
                {selectedDespesa.boleto ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-700">{selectedDespesa.boleto.nome}</p>
                        <p className="text-xs text-green-600">
                          {((selectedDespesa.boleto.tamanho || 0) / 1024).toFixed(1)} KB • 
                          Enviado em {new Date(selectedDespesa.boleto.uploaded_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => window.open(`${API}/despesas/${selectedDespesa.id}/boleto/download`, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Boleto
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum boleto anexado</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fechar
            </Button>
            <Button 
              variant="default"
              onClick={() => {
                setViewDialogOpen(false);
                handleEditDespesa(selectedDespesa);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
