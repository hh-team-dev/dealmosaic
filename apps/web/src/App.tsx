import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/session';
import { ToastProvider } from './components/Toast';
import Landing from './routes/Landing';
import Register from './routes/Register';
import Login from './routes/Login';
import VerifyEmail from './routes/VerifyEmail';
import ForgotPassword from './routes/ForgotPassword';
import ResetPassword from './routes/ResetPassword';
import Dashboard from './routes/Dashboard';
import Settings from './routes/Settings';
import { Contact, Disclosure, NotFound, Privacy, Terms } from './routes/Legal';
import Search from './routes/Search';
import Product from './routes/Product';
import Browse from './routes/Browse';
import Deals from './routes/Deals';
import Admin from './routes/Admin';
import Saved from './routes/Saved';
import { DataSources, HowWeRank } from './routes/Method';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);
  return null;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-shell" style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
        <div className="stack" style={{ alignItems: 'center' }}>
          <span className="spinner spinner-ink" style={{ width: 26, height: 26 }} aria-hidden="true" />
          <p className="small" role="status">
            Loading your account…
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/search" element={<Search />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/admin" element={<Admin />} />
          <Route path="/saved" element={<Saved />} />
            <Route path="/c/:slug" element={<Browse />} />
            <Route path="/p/:slug" element={<Product />} />
            <Route path="/how-we-rank" element={<HowWeRank />} />
            <Route path="/data-sources" element={<DataSources />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/disclosure" element={<Disclosure />} />
            <Route path="/contact" element={<Contact />} />
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/app/settings"
              element={
                <RequireAuth>
                  <Settings />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
