import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Eye, History, AlertTriangle, FileText } from 'lucide-react';
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
  const [novaOcorrencia, setNovaOcorrencia] = useState({ tipo: 'observacao', descricao: '' });
  const [formData, setFormData] = useState({
    tipo_pessoa: 'juridica',
    cpf_cnpj: '',
    nome: '',
    razao_social: '',
    nome_fantasia: '',
    nome_contato: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    email: '',
    inscricao_estadual: '',
    telefone: '',
    whatsapp: ''
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
      tipo_pessoa: cliente.tipo_pessoa || 'juridica',
      cpf_cnpj: cliente.cpf_cnpj || cliente.cnpj || '',
      nome: cliente.nome || '',
      razao_social: cliente.razao_social || '',
      nome_fantasia: cliente.nome_fantasia || '',
      nome_contato: cliente.nome_contato || '',
      rua: cliente.rua || cliente.endereco || '',
      numero: cliente.numero || '',
      complemento: cliente.complemento || '',
      bairro: cliente.bairro || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      cep: cliente.cep || '',
      email: cliente.email || '',
      inscricao_estadual: cliente.inscricao_estadual || '',
      telefone: cliente.telefone || '',
      whatsapp: cliente.whatsapp || ''
    });
    setOpen(true);
  };

  const handleAddOcorrencia = async () => {
    if (!novaOcorrencia.descricao.trim()) {
      toast.error('Digite uma descrição para a ocorrência');
      return;
    }
    
    try {
      await axios.post(
        `${API}/clientes/${viewingCliente.id}/ocorrencias`,
        novaOcorrencia,
        getAuthHeader()
      );
      toast.success('Ocorrência adicionada com sucesso!');
      setNovaOcorrencia({ tipo: 'observacao', descricao: '' });
      
      // Atualizar dados do cliente visualizado
      const response = await axios.get(`${API}/clientes`, getAuthHeader());
      const clienteAtualizado = response.data.find(c => c.id === viewingCliente.id);
      if (clienteAtualizado) {
        setViewingCliente(clienteAtualizado);
      }
      fetchClientes();
    } catch (error) {
      toast.error('Erro ao adicionar ocorrência');
    }
  };

  const resetForm = () => {
    setFormData({
      tipo_pessoa: 'juridica',
      cpf_cnpj: '',
      nome: '',
      razao_social: '',
      nome_fantasia: '',
      nome_contato: '',
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
      email: '',
      inscricao_estadual: '',
      telefone: '',
      whatsapp: ''
    });
    setEditingCliente(null);
  };

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  const getOcorrenciaBadge = (tipo) => {
    const config = {
      'observacao': { variant: 'secondary', label: 'Observação' },
      'pagamento_atrasado': { variant: 'destructive', label: 'Pagamento Atrasado' },
      'reclamacao': { variant: 'default', label: 'Reclamação' },
      'elogio': { variant: 'default', label: 'Elogio' },
      'outro': { variant: 'outline', label: 'Outro' }
    };
    const { variant, label } = config[tipo] || config.observacao;
    return <Badge variant={variant}>{label}</Badge>;
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
              <DialogDescription>
                {editingCliente ? `Editando cliente ${editingCliente.codigo}` : 'Preencha os dados do cliente. O código será gerado automaticamente.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tipo de Pessoa */}
              <div className="space-y-2">
                <Label>Tipo de Pessoa *</Label>
                <Select 
                  value={formData.tipo_pessoa} 
                  onValueChange={(v) => setFormData({...formData, tipo_pessoa: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fisica">Pessoa Física</SelectItem>
                    <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf_cnpj">{formData.tipo_pessoa === 'fisica' ? 'CPF' : 'CNPJ'} *</Label>
                  <Input
                    id="cpf_cnpj"
                    value={formData.cpf_cnpj}
                    onChange={(e) => setFormData({...formData, cpf_cnpj: e.target.value})}
                    required
                    data-testid="cliente-cnpj-input"
                    placeholder={formData.tipo_pessoa === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                  <Input
                    id="inscricao_estadual"
                    value={formData.inscricao_estadual}
                    onChange={(e) => setFormData({...formData, inscricao_estadual: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                  data-testid="cliente-nome-input"
                />
              </div>

              {formData.tipo_pessoa === 'juridica' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="razao_social">Razão Social</Label>
                    <Input
                      id="razao_social"
                      value={formData.razao_social}
                      onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                    <Input
                      id="nome_fantasia"
                      value={formData.nome_fantasia}
                      onChange={(e) => setFormData({...formData, nome_fantasia: e.target.value})}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="nome_contato">Nome do Contato</Label>
                <Input
                  id="nome_contato"
                  value={formData.nome_contato}
                  onChange={(e) => setFormData({...formData, nome_contato: e.target.value})}
                  placeholder="Nome da pessoa de contato"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    placeholder="(00) 0000-0000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                  placeholder="(00) 00000-0000"
                />
              </div>

              {/* Endereço Completo */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Endereço</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="rua">Rua/Logradouro *</Label>
                    <Input
                      id="rua"
                      value={formData.rua}
                      onChange={(e) => setFormData({...formData, rua: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={formData.numero}
                      onChange={(e) => setFormData({...formData, numero: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={formData.complemento}
                      onChange={(e) => setFormData({...formData, complemento: e.target.value})}
                      placeholder="Sala, Bloco, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={formData.bairro}
                      onChange={(e) => setFormData({...formData, bairro: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade *</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade}
                      onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado *</Label>
                    <Input
                      id="estado"
                      value={formData.estado}
                      onChange={(e) => setFormData({...formData, estado: e.target.value})}
                      required
                      maxLength={2}
                      placeholder="UF"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP *</Label>
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => setFormData({...formData, cep: e.target.value})}
                      required
                      placeholder="00000-000"
                    />
                  </div>
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
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Cidade/Estado</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((cliente) => (
                  <TableRow key={cliente.id} data-testid={`cliente-row-${cliente.id}`}>
                    <TableCell className="font-mono text-sm">{cliente.codigo}</TableCell>
                    <TableCell className="font-medium">{cliente.nome}</TableCell>
                    <TableCell>{cliente.cpf_cnpj || cliente.cnpj}</TableCell>
                    <TableCell>{cliente.cidade}/{cliente.estado}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cliente.telefone || cliente.whatsapp || '-'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setViewingCliente(cliente);
                          setViewOpen(true);
                        }}
                        data-testid={`view-cliente-${cliente.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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

      {/* Dialog de Visualização com Tabs */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogDescription>Informações completas, histórico e ocorrências</DialogDescription>
          </DialogHeader>
          {viewingCliente && (
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dados">
                  <FileText className="h-4 w-4 mr-2" />
                  Dados
                </TabsTrigger>
                <TabsTrigger value="historico">
                  <History className="h-4 w-4 mr-2" />
                  Histórico ({viewingCliente.historico?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="ocorrencias">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Ocorrências ({viewingCliente.ocorrencias?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium">Código:</span> {viewingCliente.codigo}</div>
                    <div><span className="font-medium">Tipo:</span> {viewingCliente.tipo_pessoa === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}</div>
                    <div><span className="font-medium">{viewingCliente.tipo_pessoa === 'fisica' ? 'CPF' : 'CNPJ'}:</span> {viewingCliente.cpf_cnpj || viewingCliente.cnpj}</div>
                    <div><span className="font-medium">Inscrição Estadual:</span> {viewingCliente.inscricao_estadual || '-'}</div>
                    <div className="col-span-2"><span className="font-medium">Nome:</span> {viewingCliente.nome}</div>
                    {viewingCliente.tipo_pessoa === 'juridica' && (
                      <>
                        <div className="col-span-2"><span className="font-medium">Razão Social:</span> {viewingCliente.razao_social || '-'}</div>
                        <div className="col-span-2"><span className="font-medium">Nome Fantasia:</span> {viewingCliente.nome_fantasia || '-'}</div>
                      </>
                    )}
                    <div><span className="font-medium">Nome do Contato:</span> {viewingCliente.nome_contato || '-'}</div>
                    <div><span className="font-medium">E-mail:</span> {viewingCliente.email || '-'}</div>
                    <div><span className="font-medium">Telefone:</span> {viewingCliente.telefone || '-'}</div>
                    <div><span className="font-medium">WhatsApp:</span> {viewingCliente.whatsapp || '-'}</div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Endereço</h4>
                    <div className="text-sm">
                      <p>{viewingCliente.rua || viewingCliente.endereco}, {viewingCliente.numero}</p>
                      {viewingCliente.complemento && <p>{viewingCliente.complemento}</p>}
                      <p>{viewingCliente.bairro}</p>
                      <p>{viewingCliente.cidade}/{viewingCliente.estado} - CEP: {viewingCliente.cep}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="historico" className="mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Histórico de pedidos realizados por este cliente
                  </p>
                  {viewingCliente.historico && viewingCliente.historico.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nº Pedido</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Vendedor</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingCliente.historico.map((h, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono">{h.numero}</TableCell>
                            <TableCell>{new Date(h.data).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell>{h.vendedor || '-'}</TableCell>
                            <TableCell className="text-right">
                              R$ {(h.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>Nenhum pedido registrado para este cliente</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="ocorrencias" className="mt-4">
                <div className="space-y-4">
                  {/* Formulário para adicionar ocorrência */}
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <Label className="text-sm font-medium">Nova Ocorrência</Label>
                    <div className="grid grid-cols-4 gap-3">
                      <Select 
                        value={novaOcorrencia.tipo} 
                        onValueChange={(v) => setNovaOcorrencia({...novaOcorrencia, tipo: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="observacao">Observação</SelectItem>
                          <SelectItem value="pagamento_atrasado">Pagamento Atrasado</SelectItem>
                          <SelectItem value="reclamacao">Reclamação</SelectItem>
                          <SelectItem value="elogio">Elogio</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="col-span-2">
                        <Textarea
                          value={novaOcorrencia.descricao}
                          onChange={(e) => setNovaOcorrencia({...novaOcorrencia, descricao: e.target.value})}
                          placeholder="Descreva a ocorrência..."
                          rows={2}
                        />
                      </div>
                      <Button onClick={handleAddOcorrencia} className="h-full">
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  {/* Lista de ocorrências */}
                  {viewingCliente.ocorrencias && viewingCliente.ocorrencias.length > 0 ? (
                    <div className="space-y-3">
                      {viewingCliente.ocorrencias.map((oc, idx) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {getOcorrenciaBadge(oc.tipo)}
                              <span className="text-xs text-muted-foreground">
                                {new Date(oc.data).toLocaleDateString('pt-BR')} às {new Date(oc.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">{oc.usuario}</span>
                          </div>
                          <p className="mt-2 text-sm">{oc.descricao}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>Nenhuma ocorrência registrada</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Fechar</Button>
            <Button 
              className="bg-secondary hover:bg-secondary/90"
              onClick={() => {
                setViewOpen(false);
                handleEdit(viewingCliente);
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
