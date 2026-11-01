import { Link } from 'react-router-dom';
import { AppShell } from '../components/Chrome';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/session';
import { formatDate } from '../lib/format';
import { useToast } from '../components/Toast';
import { apiRequest } from '../lib/api';

const ROADMAP = [
  { label: 'Accounts, sessions, verification, country & PIN', state: 'done' },
  { label: 'Design system, landing page, mobile shell', state: 'done' },
  { label: 'Comparison engine: matching, Price Truth, ranking', state: 'next' },
  { label: 'Connectors: marketplaces + quick commerce', state: 'later' },
  { label: 'Watchlist, price alerts, Mosaic Rewards', state: 'later' },
];

export default function Dashboard() {
  const { user, preferences } = useAuth();
  const toast = useToast();

  async function handleExport() {
    try {
      const res = await fetch('/api/me/export', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dealmosaic-data-${user?.id.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.push('Your data export has been downloaded.', 'success');
    } catch {
      toast.push('Export failed. Please try again.', 'error');
    }
  }

  return (
    <AppShell>
      <div className="stack stack-lg">
        <header>
          <span className="badge badge-lime">
            <span className="dot dot-turq" aria-hidden="true" />
            India · beta
          </span>
          <h1 style={{ fontSize: 'clamp(1.6rem, 6vw, 2.2rem)', margin: '10px 0 4px' }}>
            Namaste, {user?.displayName.split(' ')[0]}.
          </h1>
          <p className="small" style={{ margin: 0 }}>
            Member since {user ? formatDate(user.createdAt) : '—'} · {user?.email}
          </p>
        </header>

        <div className="callout callout-info">
          <div className="callout-title">
            <Icon name="info" size={16} /> Phase 1 is live. The comparison engine arrives in Phase 2.
          </div>
          <p className="small" style={{ margin: '0 0 10px', color: 'var(--ink)' }}>
            Your account, preferences and PIN code are working now. Rather than showing invented prices, the search
            area stays locked until the real engine and its connectors are wired up. Here is exactly what is built and
            what is next.
          </p>
          <div className="stack stack-sm">
            {ROADMAP.map((item) => (
              <div className="row" key={item.label} style={{ gap: 8, flexWrap: 'nowrap' }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 18,
                    flex: '0 0 auto',
                    color:
                      item.state === 'done'
                        ? 'var(--turq-d)'
                        : item.state === 'next'
                          ? 'var(--sun-d)'
                          : 'var(--ink-soft)',
                  }}
                >
                  <Icon name={item.state === 'done' ? 'check' : item.state === 'next' ? 'bolt' : 'clock'} size={16} />
                </span>
                <span className="small" style={{ color: 'var(--ink)' }}>
                  {item.label}
                </span>
                <span
                  className={`badge ${item.state === 'done' ? 'badge-turq' : item.state === 'next' ? 'badge-sun' : 'badge-neutral'}`}
                  style={{ marginLeft: 'auto' }}
                >
                  {item.state === 'done' ? 'Live' : item.state === 'next' ? 'Next' : 'Later'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card card-top-violet">
            <h3 style={{ marginTop: 0 }}>Your comparison context</h3>
            <dl className="offer-meta" style={{ borderTop: 'none', paddingTop: 0 }}>
              <div>
                <dt>Market</dt>
                <dd>India</dd>
              </div>
              <div>
                <dt>Display currency</dt>
                <dd>{preferences?.displayCurrency ?? 'INR'} ₹</dd>
              </div>
              <div>
                <dt>PIN code</dt>
                <dd>{preferences?.pincode ?? 'Not set'}</dd>
              </div>
              <div>
                <dt>Quick commerce</dt>
                <dd>{preferences?.pincode ? 'PIN-scoped prices enabled' : 'Add a PIN to enable'}</dd>
              </div>
            </dl>
            <Link to="/app/settings" className="btn btn-quiet btn-sm" style={{ marginTop: 12 }}>
              {preferences?.pincode ? 'Change preferences' : 'Add your PIN code'}
            </Link>
          </div>

          <div className="card card-top-sun">
            <h3 style={{ marginTop: 0 }}>Why we ask for a PIN code</h3>
            <p className="small">
              Blinkit, Zepto, Instamart and BigBasket price products <strong>per dark store</strong>, not per country.
              Without a PIN code a grocery comparison would be a guess. We store the PIN only — never GPS, never your
              address — and it is deleted with your account.
            </p>
            <p className="tiny" style={{ marginBottom: 0 }}>
              You can use DEALMOSAIC without a PIN code; quick-commerce comparison simply stays switched off.
            </p>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Your data, your call</h3>
            <p className="small">
              Download everything we hold on you as JSON, or delete the account and every related row — sessions,
              preferences and searches included. No 30-day “retention” window.
            </p>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-quiet btn-sm" onClick={handleExport}>
                <Icon name="download" size={15} /> Export my data
              </button>
              <Link to="/app/settings#danger" className="btn btn-danger btn-sm">
                Delete account
              </Link>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>What we never ask for</h3>
            <ul className="small" style={{ marginBottom: 0, paddingLeft: 18 }}>
              <li>Your retailer login or shopping-account password</li>
              <li>Card, UPI or bank details — we never process payments</li>
              <li>Your date of birth (an age confirmation is enough)</li>
              <li>A phone number, unless you choose to add one</li>
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
