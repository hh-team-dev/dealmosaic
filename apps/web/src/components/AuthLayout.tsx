import { Link } from 'react-router-dom';
import { LogoMark } from './Logo';
import type { ReactNode } from 'react';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="auth-shell">
      <div className="auth-top">
        <Link to="/" className="brand" aria-label="DEALMOSAIC home" style={{ display: 'inline-flex' }}>
          <LogoMark size={32} animated />
          <span className="brand-word">
            DEALMOSAIC<span>.</span>
          </span>
        </Link>
      </div>
      <main className="auth-main" id="main">
        <div className="auth-card">
          <h1 style={{ fontSize: 'clamp(1.5rem, 5.4vw, 1.85rem)', marginBottom: 6 }}>{title}</h1>
          {subtitle && <p className="small" style={{ marginBottom: 18 }}>{subtitle}</p>}
          {children}
          {footer}
        </div>
      </main>
      <div className="auth-foot">
        <p style={{ margin: '0 auto 6px', maxWidth: '44ch' }}>
          India first · INR ₹ · Your data stays yours.
        </p>
        <p style={{ margin: 0 }}>
          <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link> ·{' '}
          <Link to="/disclosure">Affiliate disclosure</Link>
        </p>
      </div>
    </div>
  );
}
