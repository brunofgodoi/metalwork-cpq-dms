import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Categories } from './pages/Categories';
import { Clients } from './pages/Clients';
import { Quotes } from './pages/Quotes';
import { QuoteViewPage } from './pages/quotes/QuoteViewPage';
import { QuoteEditPage, NewQuotePage } from './pages/quotes/QuoteEditPage';
import { Dashboard } from './pages/Dashboard';
import { Search } from './pages/Search';
import { Catalog } from './pages/Catalog';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { ChangePassword } from './pages/ChangePassword';
import { Lgpd } from './pages/Lgpd';
import { Analytics } from './pages/Analytics';
import { QuotePrint } from './pages/QuotePrint';
import { Approvals } from './pages/Approvals';

export function AppRoutes() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/quotes/:id/print" element={<QuotePrint />} />

            <Route element={<Layout />}>
              {/* Todas as rotas de sistema entrarão aqui */}
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Rotas gerais de usuário */}
              <Route path="/search" element={<Search />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/quotes/new" element={<NewQuotePage />} />
              <Route path="/quotes/:id" element={<QuoteViewPage />} />
              <Route path="/quotes/:id/edit" element={<QuoteEditPage />} />
              <Route path="/clients" element={<Clients />} />

              {/* Rotas administrativas agrupadas e protegidas */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/admin/categories" element={<Categories />} />
                <Route path="/admin/users" element={<Users />} />
                <Route path="/admin/settings" element={<Settings />} />
                <Route path="/admin/lgpd" element={<Lgpd />} />
                <Route path="/admin/analytics" element={<Analytics />} />
                <Route path="/admin/approvals" element={<Approvals />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
