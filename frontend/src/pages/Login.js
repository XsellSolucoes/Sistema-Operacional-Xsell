import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Login({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin ? { email, password } : { email, password, name };
      
      const response = await axios.post(`${API}${endpoint}`, payload);
      localStorage.setItem('token', response.data.access_token);
      
      const userResponse = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${response.data.access_token}` }
      });
      
      setUser(userResponse.data);
      toast.success(isLogin ? 'Login realizado com sucesso!' : 'Cadastro realizado com sucesso!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao processar requisição');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md" data-testid="login-card">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_xsellmanager/artifacts/isjxf46l_logo%20alternativo.png" 
                alt="XSELL Logo" 
                className="h-16"
              />
            </div>
            <CardTitle className="text-2xl font-heading text-center">
              {isLogin ? 'Bem-vindo de volta' : 'Criar conta'}
            </CardTitle>
            <CardDescription className="text-center">
              {isLogin ? 'Entre com suas credenciais' : 'Cadastre-se para começar'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    data-testid="name-input"
                    type="text"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  data-testid="email-input"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  data-testid="password-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-secondary hover:bg-secondary/90"
                data-testid="submit-button"
                disabled={loading}
              >
                {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-secondary hover:underline"
                data-testid="toggle-mode-button"
              >
                {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
      <div 
        className="hidden lg:flex flex-1 items-center justify-center bg-primary p-12"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1748934871239-22cdb836f07b?crop=entropy&cs=srgb&fm=jpg&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="max-w-lg text-center">
          <div className="bg-primary/80 backdrop-blur-sm p-8 rounded-lg">
            <h2 className="text-3xl font-heading font-bold text-primary-foreground mb-4">
              Sistema de Gestão XSELL
            </h2>
            <p className="text-lg text-primary-foreground/90">
              Gerencie pedidos, licitações, clientes e finanças em um só lugar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}