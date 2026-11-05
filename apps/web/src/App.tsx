import { lazy, Suspense, useEffect } from 'react';
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
import StoreLinkHelp from './routes/StoreLinkHelp';
import Install from './routes/Install';
import { PwaExperience } from './components/PwaExperience';
import { DataSources, HowWeRank } from './routes/Method';

const PetFriendly = lazy(() => import('./routes/PetFriendly'));
const Stays = lazy(() => import('./routes/Hospitality').then(m => ({default:m.Stays})));
const Dining = lazy(() => import('./routes/Hospitality').then(m => ({default:m.Dining})));

const DirectCollection = lazy(() => import('./routes/DirectShop').then(m => ({default:m.DirectCollection})));
const DirectProductPage = lazy(() => import('./routes/DirectShop').then(m => ({default:m.DirectProductPage})));
const DirectOrderPage = lazy(() => import('./routes/DirectShop').then(m => ({default:m.DirectOrderPage})));

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
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
          <PwaExperience>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/stays" element={<Suspense fallback={<main id="main" className="public-main"><p role="status">Opening Hotels & Stays…</p></main>}><Stays /></Suspense>} />
            <Route path="/dining" element={<Suspense fallback={<main id="main" className="public-main"><p role="status">Opening Dining & Food…</p></main>}><Dining /></Suspense>} />
            <Route path="/pet-friendly" element={<Suspense fallback={<main id="main" className="public-main"><p role="status">Opening pet-friendly places…</p></main>}><PetFriendly /></Suspense>} />
            <Route path="/install" element={<Install />} />
            <Route path="/search" element={<Search />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/handcrafted" element={<Suspense fallback={<p role="status">Loading…</p>}><DirectCollection /></Suspense>} />
            <Route path="/buy/:id" element={<Suspense fallback={<p role="status">Loading…</p>}><DirectProductPage /></Suspense>} />
            <Route path="/direct-orders/:id" element={<Suspense fallback={<p role="status">Loading…</p>}><DirectOrderPage /></Suspense>} />
          <Route path="/saved" element={<Saved />} />
            <Route path="/store-link-help" element={<StoreLinkHelp />} />
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
          </PwaExperience>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
