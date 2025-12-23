import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pedidos from './pages/Pedidos';
import Clientes from './pages/Clientes';
import Produtos from './pages/Produtos';
import Fornecedores from './pages/Fornecedores';
import Vendedores from './pages/Vendedores';
import Relatorios from './pages/Relatorios';
import Financeiro from './pages/Financeiro';
import Licitacoes from './pages/Licitacoes';
import Orcamentos from './pages/Orcamentos';
import DashboardLayout from './components/DashboardLayout';
import { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setUser(res.data);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/" element={
          <PrivateRoute>
            <DashboardLayout user={user}>
              <Dashboard />
            </DashboardLayout>
          </PrivateRoute>
        } />
        <Route path="/pedidos" element={
          <PrivateRoute>
            <DashboardLayout user={user}>
              <Pedidos />
            </DashboardLayout>
          </PrivateRoute>
        } />
        <Route path="/clientes" element={
          <PrivateRoute>
            <DashboardLayout user={user}>
              <Clientes />
            </DashboardLayout>
          </PrivateRoute>
        } />
        <Route path="/produtos" element={
          <PrivateRoute>
            <DashboardLayout user={user}>
              <Produtos />
            </DashboardLayout>
          </PrivateRoute>
        } />
        <Route path="/fornecedores" element={
          <PrivateRoute>
            <DashboardLayout user={user}>
              <Fornecedores />
            </DashboardLayout>
          </PrivateRoute>
        } />
        <Route path="/relatorios" element={
          <PrivateRoute>
            <DashboardLayout user={user}>
              <Relatorios />
            </DashboardLayout>
          </PrivateRoute>
        } />
        <Route path="/financeiro" element={
          <PrivateRoute>
            <DashboardLayout user={user}>
              <Financeiro />
            </DashboardLayout>
          </PrivateRoute>
        } />
        <Route path="/licitacoes" element={
          <PrivateRoute>
            <DashboardLayout user={user}>
              <Licitacoes />
            </DashboardLayout>
          </PrivateRoute>
        } />
        <Route path="/orcamentos" element={
          <PrivateRoute>
            <DashboardLayout user={user}>
              <Orcamentos />
            </DashboardLayout>
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;