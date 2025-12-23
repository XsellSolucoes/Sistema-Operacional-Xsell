import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function Licitacoes() {
  const [licitacoes, setLicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLicitacoes();
  }, []);

  const fetchLicitacoes = async () => {
    try {
      const response = await axios.get(`${API}/licitacoes`, getAuthHeader());
      setLicitacoes(response.data);
    } catch (error) {
      toast.error('Erro ao carregar licitações');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'pendente': 'secondary',
      'programado': 'default',
      'pago': 'default'
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="licitacoes-page">
      <div>
        <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">Licitações</h1>
        <p className="text-muted-foreground mt-2">Gerencie contratos públicos</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading">Lista de Licitações</CardTitle>
        </CardHeader>
        <CardContent>
          {licitacoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma licitação cadastrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Órgão</TableHead>
                  <TableHead>Cidade/Estado</TableHead>
                  <TableHead>Nº Empenho</TableHead>
                  <TableHead className="text-right">Lucro Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licitacoes.map((lic) => (
                  <TableRow key={lic.id} data-testid={`licitacao-row-${lic.id}`}>
                    <TableCell className="font-medium">{lic.orgao_publico}</TableCell>
                    <TableCell>{lic.cidade}/{lic.estado}</TableCell>
                    <TableCell className="font-mono text-sm">{lic.numero_empenho}</TableCell>
                    <TableCell className="text-right">
                      R$ {lic.lucro_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{getStatusBadge(lic.status)}</TableCell>
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
