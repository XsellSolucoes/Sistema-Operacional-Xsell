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

export default function Orcamentos() {
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrcamentos();
  }, []);

  const fetchOrcamentos = async () => {
    try {
      const response = await axios.get(`${API}/orcamentos`, getAuthHeader());
      setOrcamentos(response.data);
    } catch (error) {
      toast.error('Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'aberto': 'secondary',
      'convertido': 'default',
      'expirado': 'destructive'
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
    <div className="space-y-6" data-testid="orcamentos-page">
      <div>
        <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">Orçamentos</h1>
        <p className="text-muted-foreground mt-2">Gerencie seus orçamentos</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading">Lista de Orçamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {orcamentos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum orçamento cadastrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orcamentos.map((orc) => (
                  <TableRow key={orc.id} data-testid={`orcamento-row-${orc.id}`}>
                    <TableCell className="font-mono text-sm font-medium">{orc.numero}</TableCell>
                    <TableCell>
                      {new Date(orc.data).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{orc.cliente_nome}</TableCell>
                    <TableCell className="text-right">
                      R$ {orc.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{orc.validade_dias} dias</TableCell>
                    <TableCell>{getStatusBadge(orc.status)}</TableCell>
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
