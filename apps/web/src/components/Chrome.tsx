import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogoMark, Wordmark } from './Logo';
import { Button } from './Ui';
import { useAuth } from '../lib/session';
import { initials } from '../lib/format';
import { useToast } from './Toast';
import { Icon } from './Icon';

export function SiteHeader() {
  const { user } = useAuth();
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link to={user ? '/app' : '/'} className="brand" aria-label="DEALMOSAIC home">
          <Wordmark sub />
        </Link>
        <nav className="site-nav" aria-label="Sections">
          <Link to="/deals">Deals</Link>
          <Link to="/saved">Saved</Link>
          <Link to="/browse">Browse</Link>
          <Link to="/how-we-rank">How we rank</Link>
          <Link to="/data-sources">Data sources</Link>
        </nav>
        {/*
          Signed in: the account, not an advert. A visitor who already has an
          account was being shown a big primary "Dashboard" button on every public
          page — the loudest thing in the header, and a call to action they had
          already answered. They now get their initial and a quiet link; someone
          who is signed out gets "Sign in" plus one compact primary.
        */}
        <div className="header-actions">
          {user ? (
            <>
              {/*
                Only an administrator ever sees this. Until now /admin existed and
                nothing linked to it, so the owner had no way to discover the one
                page built for him — the feature was shipped and invisible, which
                is indistinguishable from not shipped.
              */}
              {(user.role === 'admin' || user.role === 'super_admin') && (
                <Link to="/admin" className="btn btn-header-ghost" title="Owner controls">
                  Admin
                </Link>
              )}
              <Link to="/app" className="btn btn-header-ghost" title="Your dashboard">
                Dashboard
              </Link>
              <Link to="/app/settings" className="header-avatar" aria-label="Your account settings">
                {initials(user.displayName ?? 'You')}
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-header-ghost">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary">
                <span className="hide-xs">Create free account</span>
                <span className="show-xs-inline">Sign up</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="brand" style={{ marginBottom: 10 }}>
            <LogoMark size={30} />
            <span className="brand-word">
              DEALMOSAIC<span>.</span>
            </span>
          </div>
          <p className="small" style={{ maxWidth: '44ch' }}>
            We don’t just show you a cheaper listed price. We help you discover the better purchase — three offers,
            itemised costs, and a ranking we can explain.
          </p>
          <p className="tiny" style={{ maxWidth: '48ch' }}>
            <strong>Affiliate disclosure:</strong> when you buy through some retailer links we may earn a commission.
            It never changes the price you pay, and it is never an input to our ranking. Some links are not monetised
            and are shown as plain links.
          </p>
        </div>
        <div>
          <h4 style={{ marginBottom: 10 }}>The honest small print</h4>
          <div className="footer-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms of use</Link>
            <Link to="/disclosure">Affiliate disclosure</Link>
            <Link to="/contact">Contact & support</Link>
            <Link to="/register">Create account</Link>
            <Link to="/how-we-rank">How we rank</Link>
            <Link to="/data-sources">Where our prices come from</Link>
            <Link to="/deals">Today's deals and coupons</Link>
            <Link to="/browse">Browse every product</Link>
          </div>
          <p className="tiny" style={{ marginTop: 14 }}>
            Built for India first · Your data stays yours · No trackers, no ad networks, no selling of personal data.
          </p>
        </div>
      </div>
    </footer>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  async function handleLogout() {
    await logout();
    toast.push('Signed out. See you soon.', 'info');
    navigate('/');
  }

  return (
    <div className="auth-shell" style={{ background: 'var(--surface)' }}>
      <header className="app-header">
        <div className="container site-header-inner">
          <Link to="/app" className="brand" aria-label="DEALMOSAIC dashboard">
            <LogoMark size={32} />
            <span className="brand-word">
              DEALMOSAIC<span>.</span>
            </span>
          </Link>
          <div className="header-actions">
            <Link
              to="/app/settings"
              className="row"
              style={{ textDecoration: 'none', color: 'inherit', gap: 8 }}
              aria-label="Account settings"
            >
              <span className="avatar" aria-hidden="true">
                {initials(user?.displayName ?? 'You')}
              </span>
              <span className="small" style={{ display: 'none', color: 'var(--ink)' }}>
                {user?.displayName}
              </span>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container app-main" id="main">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}

/**
 * THE PHONE NAVIGATION, ON EVERY SCREEN.
 *
 * It used to exist only inside the signed-in app shell, so a visitor browsing the
 * public site on a phone had no way to reach Deals or Saved without scrolling to
 * the footer. The same four destinations now appear everywhere, with drawn SVG
 * icons rather than Unicode glyphs — ◉ ◎ ⚙ were a different typeface from the page,
 * a different optical size on every device, and ⚙ renders as a colour emoji on
 * some Android builds.
 */
export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        <Icon name="chart" size={19} />
        Home
      </NavLink>
      <NavLink to="/deals" className={({ isActive }) => (isActive ? 'active' : '')}>
        <Icon name="tag" size={19} />
        Deals
      </NavLink>
      <NavLink to="/browse" className={({ isActive }) => (isActive ? 'active' : '')}>
        <Icon name="search" size={19} />
        Browse
      </NavLink>
      <NavLink to="/saved" className={({ isActive }) => (isActive ? 'active' : '')}>
        <Icon name="heart" size={19} />
        Saved
      </NavLink>
    </nav>
  );
}
