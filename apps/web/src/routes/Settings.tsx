import { useState } from 'react';
import { Seo } from '../lib/seo';
import { useNavigate } from 'react-router-dom';
import { COUNTRIES, CURRENCIES } from '@dealmosaic/core';
import { AppShell } from '../components/Chrome';
import { Icon } from '../components/Icon';
import { Button, Field, Modal, TextInput } from '../components/Ui';
import { useAuth } from '../lib/session';
import { useToast } from '../components/Toast';
import { apiRequest, ApiError } from '../lib/api';

export default function Settings() {
  const { user, preferences, updateProfile, updatePreferences, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [pincode, setPincode] = useState(preferences?.pincode ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingNotification, setSavingNotification] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ displayName, phone: phone.trim() === '' ? null : phone });
      toast.push('Profile updated.', 'success');
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : 'Could not save your profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePreferences(e: React.FormEvent) {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      await updatePreferences({ pincode: pincode.trim() === '' ? null : pincode.trim() });
      toast.push('Preferences saved.', 'success');
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : 'Could not save preferences.', 'error');
    } finally {
      setSavingPrefs(false);
    }
  }

  async function toggleNotification(key: 'notifyInApp' | 'notifyEmail', value: boolean) {
    setSavingNotification(true);
    try {
      await updatePreferences({ [key]: value } as never);
      toast.push('Notification preference updated.', 'info');
    } catch {
      toast.push('Could not update that preference.', 'error');
    } finally { setSavingNotification(false); }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await apiRequest('/api/me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dealmosaic-data-${user?.id.slice(0, 8)}.json`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.push('Your account-data download is ready.', 'success');
    } catch {
      toast.push('Export failed. Please try again.', 'error');
    } finally { setExporting(false); }
  }

  async function handleDelete() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await apiRequest('/api/me', {
        method: 'DELETE',
        body: { password: deletePassword, confirmation: deleteConfirm },
      });
      toast.push('Account deleted. Direct-shop order records are handled separately under our privacy policy.', 'info');
      await logout().catch(() => undefined);
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete the account.');
    } finally {
      setDeleting(false);
    }
  }

  return (
      <>
      <Seo
        title="Account settings"
        description="Your DealMosaic account settings."
        path="/app/settings"
        index={false}
      />
    <AppShell>
      <div className="stack stack-lg" style={{ maxWidth: 720 }}>
        <header>
          <h1 style={{ fontSize: 'clamp(1.5rem, 5.4vw, 2rem)', marginBottom: 4 }}>Account settings</h1>
          <p className="small" style={{ margin: 0 }}>
            Signed in as {user?.email} {user?.emailVerified && <span className="badge badge-grass">Verified</span>}
          </p>
        </header>

        {/* profile */}
        <section className="card card-top-magenta">
          <h3 style={{ marginTop: 0 }}>Profile</h3>
          <form onSubmit={saveProfile}>
            <Field label="Display name" htmlFor="displayName">
              <TextInput
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
              />
            </Field>
            <Field label="Phone number" htmlFor="phone" optional hint="Optional contact detail. Sign-in and password recovery use your email, not this number.">
              <TextInput
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91"
              />
            </Field>
            <Button type="submit" variant="primary" loading={savingProfile}>
              Save profile
            </Button>
          </form>
        </section>

        {/* preferences */}
        <section className="card card-top-grass">
          <h3 style={{ marginTop: 0 }}>Market & prices</h3>
          <form onSubmit={savePreferences}>
            <Field label="Country market" htmlFor="country" hint="DEALMOSAIC is launching in India. Other markets are listed with the reason they are switched off.">
              <select className="select" id="country" value="IN" disabled>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code} disabled={!c.enabled}>
                    {c.flag} {c.name}
                    {!c.enabled ? ` — ${c.note ?? 'not available yet'}` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Display currency" htmlFor="currency" hint="Prices are compared in INR. A different display currency shows a converted estimate, never an amount payable.">
              <select
                className="select"
                id="currency"
                value={preferences?.displayCurrency ?? 'INR'}
                onChange={(e) => void updatePreferences({ displayCurrency: e.target.value })}
              >
                {Object.values(CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="PIN code"
              htmlFor="pincode"
              optional
              hint="Needed only for 10-minute delivery comparison, because those prices change per dark store. Stored as six digits — no GPS, no address."
            >
              <TextInput
                id="pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="712201"
                maxLength={6}
              />
            </Field>

            <Button type="submit" variant="primary" loading={savingPrefs}>
              Save preferences
            </Button>
          </form>
        </section>

        {/* notifications */}
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Notifications</h3>
          <div className="switch">
            <div className="switch-text">
              <strong>In-app notifications</strong>
              <span className="tiny">Show qualifying price-target updates on your dashboard. This does not enable phone push or SMS.</span>
            </div>
            <button
              className="switch-toggle"
              role="switch"
              disabled={savingNotification}
              aria-checked={preferences?.notifyInApp ?? true}
              aria-label="In-app notifications"
              onClick={() => void toggleNotification('notifyInApp', !(preferences?.notifyInApp ?? true))}
            />
          </div>
          <div className="switch">
            <div className="switch-text">
              <strong>A weekly email about what you saved</strong>
              <span className="tiny">
                One email a week at most: saved deals that are about to end, ones that have just ended, and
                anything you saved since we last wrote. No marketing, no daily nagging. Price-target emails are separate requests; cancel them from your dashboard.
              </span>
            </div>
            <button
              className="switch-toggle"
              role="switch"
              disabled={savingNotification}
              aria-checked={preferences?.notifyEmail ?? false}
              aria-label="Email notifications"
              onClick={() => void toggleNotification('notifyEmail', !(preferences?.notifyEmail ?? false))}
            />
          </div>
        </section>

        {/* privacy */}
        <section className="card card-top-coral" id="danger">
          <h3 style={{ marginTop: 0 }}>Privacy & data</h3>
          <p className="small">
            Export your account data, or permanently delete your account and its related records. Direct-shop orders are separate and retained as explained in our privacy policy. Clear device-only saved deals from Your list.
          </p>
          <div className="row" style={{ gap: 8 }}>
            <Button variant="quiet" size="sm" loading={exporting} onClick={handleExport}>
              <Icon name="download" size={15} /> Export my data
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              Delete account
            </Button>
          </div>
        </section>
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete your account">
        <p className="small">
          This permanently removes your account profile, preferences, sessions and account-linked data. It does not remove device-only saved deals or separately retained direct-shop order records.
        </p>
        {deleteError && (
          <div className="callout callout-danger" role="alert" style={{ marginBottom: 12 }}>
            <p className="small" style={{ margin: 0, color: 'var(--ink)' }}>
              {deleteError}
            </p>
          </div>
        )}
        <Field label="Confirm your password" htmlFor="deletePassword">
          <input
            id="deletePassword"
            className="input"
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <Field label="Type DELETE to confirm" htmlFor="deleteConfirm">
          <input
            id="deleteConfirm"
            className="input"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
          />
        </Field>
        <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
            Keep my account
          </Button>
          <Button
            variant="danger"
            loading={deleting}
            disabled={deleteConfirm !== 'DELETE' || deletePassword.length === 0}
            onClick={handleDelete}
          >
            Delete permanently
          </Button>
        </div>
      </Modal>
    </AppShell>
      </>
  );
}
