import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { apiRequest, ApiError, setCsrfToken } from '../lib/api';
import { useAuth } from '../lib/session';
import { useToast } from '../components/Toast';

type State = 'working' | 'ok' | 'error';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { setSession } = useAuth();
  const [state, setState] = useState<State>('working');
  const [message, setMessage] = useState('Confirming your email address…');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = params.get('token');
    if (!token) {
      setState('error');
      setMessage('This link is missing its confirmation token. Copy the full link from your email.');
      return;
    }

    void (async () => {
      try {
        const data = await apiRequest<{
          user: Parameters<typeof setSession>[0];
          preferences: Parameters<typeof setSession>[1];
          csrfToken: string;
        }>('/api/auth/verify-email', { method: 'POST', body: { token } });
        setCsrfToken(data.csrfToken);
        setSession(data.user, data.preferences, data.csrfToken);
        setState('ok');
        setMessage('Your email is confirmed. You are signed in.');
        toast.push('Email confirmed — welcome to DEALMOSAIC.', 'success');
        let stashed: string | null = null;
        try {
          stashed = sessionStorage.getItem('dm_pending_query');
          sessionStorage.removeItem('dm_pending_query');
        } catch {
          stashed = null;
        }
        const next = params.get('next') ?? (stashed ? `/search?q=${encodeURIComponent(stashed)}` : '/app');
        window.setTimeout(() => navigate(next, { replace: true }), 900);
      } catch (err) {
        setState('error');
        setMessage(err instanceof ApiError ? err.message : 'We could not confirm that link.');
      }
    })();
  }, [params, navigate, setSession, toast]);

  return (
    <AuthLayout title={state === 'ok' ? 'You’re in' : state === 'error' ? 'That link didn’t work' : 'Confirming your email'}>
      <div
        className={`callout ${state === 'ok' ? 'callout-success' : state === 'error' ? 'callout-danger' : 'callout-info'}`}
        role="status"
        aria-live="polite"
      >
        <p className="small" style={{ margin: 0, color: 'var(--ink)' }}>
          {state === 'working' && <span className="spinner spinner-ink" aria-hidden="true" style={{ marginRight: 8 }} />}
          {message}
        </p>
      </div>

      {state === 'ok' && (
        <Link to="/app" className="btn btn-primary btn-block" style={{ marginTop: 16 }}>
          Go to my dashboard
        </Link>
      )}

      {state === 'error' && (
        <div className="stack" style={{ marginTop: 16 }}>
          <Link to="/login" className="btn btn-primary btn-block">
            Sign in and request a new link
          </Link>
          <Link to="/register" className="btn btn-quiet btn-block">
            Create account again
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
