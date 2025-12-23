import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Building2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const CATEGORIAS = [
  { value: 'todos', label: 'Todos os Fornecedores' },
  { value: 'materiais_construcao', label: 'Materiais de Construção' },
  { value: 'tintas_pintura', label: 'Tintas e Pintura' },
  { value: 'material_eletrico', label: 'Material Elétrico' },
  { value: 'eletrodomesticos', label: 'Eletrodomésticos' },
  { value: 'audio_video', label: 'Áudio, Vídeo e Eletrônicos' },
  { value: 'pecas_acessorios', label: 'Peças e Acessórios Eletrônicos' },
  { value: 'moveis', label: 'Móveis' },
  { value: 'cama_mesa_banho', label: 'Cama, Mesa e Banho' },
  { value: 'utilidades_domesticas', label: 'Utilidades Domésticas' },
  { value: 'papelaria', label: 'Papelaria' },
  { value: 'livros', label: 'Livros' },
  { value: 'brinquedos', label: 'Brinquedos' },
  { value: 'artigos_esportivos', label: 'Artigos Esportivos' },
  { value: 'artigos_viagem', label: 'Artigos de Viagem' },
  { value: 'roupas_acessorios', label: 'Roupas e Acessórios' },
  { value: 'cosmeticos_perfumaria', label: 'Cosméticos e Perfumaria' },
  { value: 'higiene_pessoal', label: 'Higiene Pessoal' },
  { value: 'artigos_medicos', label: 'Artigos Médicos e Ortopédicos' },
  { value: 'produtos_saneantes', label: 'Produtos Saneantes' },
  { value: 'outros', label: 'Outros' }
];

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos');
  const [formData, setFormData] = useState({
    tipo_fornecedor: 'juridica',
    razao_social: '',
    nome_fantasia: '',
    cnpj_cpf: '',
    inscricao_estadual: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    nome_contato: '',
    telefone: '',
    whatsapp: '',
    email: '',
    banco: '',
    agencia: '',
    conta_corrente: '',
    tipo_conta: '',
    chave_pix: '',
    produtos_servicos: '',
    prazo_entrega: '',
    condicoes_pagamento: '',
    observacoes: '',
    categoria: 'materiais_construcao'
  });

  useEffect(() => {
    fetchFornecedores();
  }, [categoriaAtiva]);

  const fetchFornecedores = async () => {
    try {
      const params = categoriaAtiva !== 'todos' ? `?categoria=${categoriaAtiva}` : '';
      const response = await axios.get(`${API}/fornecedores${params}`, getAuthHeader());
      setFornecedores(response.data);
    } catch (error) {
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFornecedor) {
        await axios.put(`${API}/fornecedores/${editingFornecedor.id}`, formData, getAuthHeader());
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        await axios.post(`${API}/fornecedores`, formData, getAuthHeader());
        toast.success('Fornecedor cadastrado com sucesso!');
      }
      setOpen(false);
      resetForm();
      fetchFornecedores();
    } catch (error) {
      toast.error('Erro ao salvar fornecedor');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este fornecedor?')) return;
    try {
      await axios.delete(`${API}/fornecedores/${id}`, getAuthHeader());
      toast.success('Fornecedor excluído com sucesso!');
      fetchFornecedores();
    } catch (error) {
      toast.error('Erro ao excluir fornecedor');
    }
  };

  const handleEdit = (fornecedor) => {
    setEditingFornecedor(fornecedor);
    setFormData({
      tipo_fornecedor: fornecedor.tipo_fornecedor,
      razao_social: fornecedor.razao_social,
      nome_fantasia: fornecedor.nome_fantasia,
      cnpj_cpf: fornecedor.cnpj_cpf,
      inscricao_estadual: fornecedor.inscricao_estadual || '',
      cep: fornecedor.cep,
      logradouro: fornecedor.logradouro,
      numero: fornecedor.numero,
      complemento: fornecedor.complemento || '',
      bairro: fornecedor.bairro,
      cidade: fornecedor.cidade,
      estado: fornecedor.estado,
      nome_contato: fornecedor.nome_contato,
      telefone: fornecedor.telefone,
      whatsapp: fornecedor.whatsapp,
      email: fornecedor.email,
      banco: fornecedor.banco || '',
      agencia: fornecedor.agencia || '',
      conta_corrente: fornecedor.conta_corrente || '',
      tipo_conta: fornecedor.tipo_conta || '',
      chave_pix: fornecedor.chave_pix || '',
      produtos_servicos: fornecedor.produtos_servicos,
      prazo_entrega: fornecedor.prazo_entrega,
      condicoes_pagamento: fornecedor.condicoes_pagamento,
      observacoes: fornecedor.observacoes || '',
      categoria: fornecedor.categoria
    });
    setOpen(true);
  };

  const resetForm = () => {
    setFormData({
      tipo_fornecedor: 'juridica',
      razao_social: '',
      nome_fantasia: '',
      cnpj_cpf: '',
      inscricao_estadual: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      nome_contato: '',
      telefone: '',
      whatsapp: '',
      email: '',
      banco: '',
      agencia: '',
      conta_corrente: '',
      tipo_conta: '',
      chave_pix: '',
      produtos_servicos: '',
      prazo_entrega: '',
      condicoes_pagamento: '',
      observacoes: '',
      categoria: categoriaAtiva !== 'todos' ? categoriaAtiva : 'materiais_construcao'
    });
    setEditingFornecedor(null);
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
    <div className="flex gap-6" data-testid="fornecedores-page">
      <aside className="w-64 space-y-2">
        <div className="bg-primary rounded-md p-4 shadow-md">
          <h3 className="font-heading font-semibold mb-4 text-primary-foreground">Categorias</h3>
          <div className="space-y-1">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoriaAtiva(cat.value)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors duration-200 ${
                  categoriaAtiva === cat.value
                    ? 'bg-secondary text-secondary-foreground font-medium'
                    : 'text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground'
                }`}
                data-testid={`categoria-${cat.value}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">Fornecedores</h1>
            <p className="text-muted-foreground mt-2">
              {CATEGORIAS.find(c => c.value === categoriaAtiva)?.label || 'Todos'}
            </p>
          </div>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-secondary hover:bg-secondary/90" data-testid="add-fornecedor-button">
                <Plus className="h-4 w-4 mr-2" />
                Novo Fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
                <DialogDescription>
                  Preencha todos os dados do fornecedor
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Identificação</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Fornecedor</Label>
                      <Select value={formData.tipo_fornecedor} onValueChange={(v) => setFormData({...formData, tipo_fornecedor: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                          <SelectItem value="fisica">Pessoa Física</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select value={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIAS.filter(c => c.value !== 'todos').map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Razão Social / Nome Completo</Label>
                      <Input
                        value={formData.razao_social}
                        onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome Fantasia</Label>
                      <Input
                        value={formData.nome_fantasia}
                        onChange={(e) => setFormData({...formData, nome_fantasia: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CNPJ / CPF</Label>
                      <Input
                        value={formData.cnpj_cpf}
                        onChange={(e) => setFormData({...formData, cnpj_cpf: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Inscrição Estadual</Label>
                      <Input
                        value={formData.inscricao_estadual}
                        onChange={(e) => setFormData({...formData, inscricao_estadual: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Endereço</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <Input
                        value={formData.cep}
                        onChange={(e) => setFormData({...formData, cep: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Logradouro</Label>
                      <Input
                        value={formData.logradouro}
                        onChange={(e) => setFormData({...formData, logradouro: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Número</Label>
                      <Input
                        value={formData.numero}
                        onChange={(e) => setFormData({...formData, numero: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Complemento</Label>
                      <Input
                        value={formData.complemento}
                        onChange={(e) => setFormData({...formData, complemento: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bairro</Label>
                      <Input
                        value={formData.bairro}
                        onChange={(e) => setFormData({...formData, bairro: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input
                        value={formData.cidade}
                        onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input
                      value={formData.estado}
                      onChange={(e) => setFormData({...formData, estado: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Contato</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome do Contato</Label>
                      <Input
                        value={formData.nome_contato}
                        onChange={(e) => setFormData({...formData, nome_contato: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        value={formData.telefone}
                        onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp</Label>
                      <Input
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Dados Bancários</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Banco</Label>
                      <Input
                        value={formData.banco}
                        onChange={(e) => setFormData({...formData, banco: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Agência</Label>
                      <Input
                        value={formData.agencia}
                        onChange={(e) => setFormData({...formData, agencia: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Conta Corrente</Label>
                      <Input
                        value={formData.conta_corrente}
                        onChange={(e) => setFormData({...formData, conta_corrente: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Conta</Label>
                      <Select value={formData.tipo_conta} onValueChange={(v) => setFormData({...formData, tipo_conta: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="corrente">Corrente</SelectItem>
                          <SelectItem value="poupanca">Poupança</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Chave Pix</Label>
                      <Input
                        value={formData.chave_pix}
                        onChange={(e) => setFormData({...formData, chave_pix: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Informações Comerciais</h3>
                  <div className="space-y-2">
                    <Label>Produtos ou Serviços Fornecidos</Label>
                    <Textarea
                      value={formData.produtos_servicos}
                      onChange={(e) => setFormData({...formData, produtos_servicos: e.target.value})}
                      required
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prazo Médio de Entrega</Label>
                      <Input
                        value={formData.prazo_entrega}
                        onChange={(e) => setFormData({...formData, prazo_entrega: e.target.value})}
                        required
                        placeholder="Ex: 15 dias"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Condições de Pagamento</Label>
                      <Input
                        value={formData.condicoes_pagamento}
                        onChange={(e) => setFormData({...formData, condicoes_pagamento: e.target.value})}
                        required
                        placeholder="Ex: 30/60 dias"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Observações Gerais</Label>
                    <Textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-secondary hover:bg-secondary/90" data-testid="save-fornecedor-button">
                    {editingFornecedor ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Lista de Fornecedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fornecedores.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum fornecedor cadastrado nesta categoria</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome / Razão Social</TableHead>
                    <TableHead>CNPJ/CPF</TableHead>
                    <TableHead>Cidade/Estado</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fornecedores.map((fornecedor) => (
                    <TableRow key={fornecedor.id} data-testid={`fornecedor-row-${fornecedor.id}`}>
                      <TableCell className="font-mono text-sm">{fornecedor.codigo}</TableCell>
                      <TableCell className="font-medium">{fornecedor.razao_social}</TableCell>
                      <TableCell>{fornecedor.cnpj_cpf}</TableCell>
                      <TableCell>{fornecedor.cidade}/{fornecedor.estado}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{fornecedor.nome_contato}</div>
                          <div className="text-muted-foreground">{fornecedor.telefone}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(fornecedor)}
                          data-testid={`edit-fornecedor-${fornecedor.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(fornecedor.id)}
                          data-testid={`delete-fornecedor-${fornecedor.id}`}
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
    </div>
  );
}
