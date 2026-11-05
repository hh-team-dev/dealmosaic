import { useState } from 'react';
import { Seo } from '../lib/seo';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Button, Field, PasswordInput, TextInput } from '../components/Ui';
import { ApiError } from '../lib/api';
import { safeReturnPath } from '../lib/navigation';
import { useAuth } from '../lib/session';
import { useToast } from '../components/Toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [unverifiedHelp, setUnverifiedHelp] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnverifiedHelp(null);
    setSubmitting(true);
    try {
      await login(email, password);
      toast.push('Welcome back.', 'success');
      // The live deal wall, not the account page: the home screen is the product.
      navigate(safeReturnPath(params.get('next')), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'email_unverified') {
          setError(err.message);
          const url = err.payload?.devActionUrl as string | undefined;
          if (url) setUnverifiedHelp(url);
        } else {
          setError(err.message);
          setFields(err.fields ?? {});
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
      <>
      <Seo
        title="Sign in"
        description="Sign in to DealMosaic to watch prices, save deals and report whether a coupon code worked."
        path="/login"
        index={false}
      />
    <AuthLayout
      title="Welcome back"
      subtitle="Manage saved-offer reminders, report code results and choose account preferences. Browsing needs no account."
    >
      {error && (
        <div className="callout callout-danger" role="alert" style={{ marginBottom: 16 }}>
          <p className="small" style={{ margin: 0, color: 'var(--ink)' }}>
            {error}
          </p>
          {unverifiedHelp && (
            <Link className="btn btn-sm btn-primary" to={unverifiedHelp} style={{ marginTop: 10 }}>
              Open the confirmation link
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Field label="Email address" htmlFor="email" error={fields.email}>
          <TextInput
            id="email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            invalid={Boolean(fields.email)}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={fields.password}>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>

        <div className="row-between" style={{ marginBottom: 16 }}>
          <Link to="/forgot-password" className="small">
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" block loading={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="small" style={{ textAlign: 'center', margin: '16px 0 0' }}>
        New here? <Link to="/register">Create a free account</Link>
      </p>
    </AuthLayout>
      </>
  );
}
