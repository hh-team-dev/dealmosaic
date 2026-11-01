import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Icon } from '../components/Icon';
import { Button, Field, TextInput } from '../components/Ui';
import { apiRequest, ApiError } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<{ message: string; devActionUrl?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{ message: string; devActionUrl?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
      setSent(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email on your account and we will send a single-use link that expires in 60 minutes."
    >
      {sent ? (
        <>
          <div className="callout callout-success">
            <p className="small" style={{ margin: 0, color: 'var(--ink)' }}>
              {sent.message}
            </p>
          </div>
          {sent.devActionUrl && (
            <div className="callout callout-info" style={{ marginTop: 14 }}>
              <div className="callout-title">
                <Icon name="warn" size={16} /> Development outbox
              </div>
              <p className="small" style={{ margin: '0 0 10px', color: 'var(--ink)' }}>
                No email provider is connected yet, so here is the link directly. It disappears in production.
              </p>
              <Link className="btn btn-primary btn-block" to={sent.devActionUrl}>
                Open the reset link
              </Link>
            </div>
          )}
          <Link to="/login" className="btn btn-ghost btn-block" style={{ marginTop: 14 }}>
            Back to sign in
          </Link>
        </>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="callout callout-danger" role="alert" style={{ marginBottom: 16 }}>
              <p className="small" style={{ margin: 0, color: 'var(--ink)' }}>
                {error}
              </p>
            </div>
          )}
          <Field label="Email address" htmlFor="email" hint="We reply the same way whether or not an account exists.">
            <TextInput
              id="email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </Field>
          <Button type="submit" variant="primary" size="lg" block loading={submitting}>
            Send reset link
          </Button>
          <Link to="/login" className="btn btn-ghost btn-block" style={{ marginTop: 10 }}>
            Back to sign in
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
