import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { passwordStrength, validatePassword } from '@dealmosaic/core';
import { AuthLayout } from '../components/AuthLayout';
import { Button, Field, PasswordInput, StrengthMeter } from '../components/Ui';
import { apiRequest, ApiError } from '../lib/api';
import { useToast } from '../components/Toast';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const strength = useMemo(() => passwordStrength(password), [password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const next: Record<string, string> = {};
    const pwErr = validatePassword(password);
    if (pwErr) next.password = pwErr;
    if (password !== passwordConfirm) next.passwordConfirm = 'The two passwords do not match.';
    setFields(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: { token, password, passwordConfirm },
      });
      toast.push('Password updated. Sign in with the new one.', 'success');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="That link is incomplete">
        <div className="callout callout-danger">
          <p className="small" style={{ margin: 0, color: 'var(--ink)' }}>
            The reset link is missing its token. Request a fresh one — they are single-use and expire after an hour.
          </p>
        </div>
        <Link to="/forgot-password" className="btn btn-primary btn-block" style={{ marginTop: 16 }}>
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Resetting your password signs you out of every device — that is deliberate."
    >
      {error && (
        <div className="callout callout-danger" role="alert" style={{ marginBottom: 16 }}>
          <p className="small" style={{ margin: 0, color: 'var(--ink)' }}>
            {error}
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <Field label="New password" htmlFor="password" error={fields.password} hint="At least 10 characters, two character classes.">
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            invalid={Boolean(fields.password)}
            errorId={fields.password ? 'password-error' : undefined}
          />
          {password.length > 0 && <StrengthMeter score={strength.score} label={strength.label} />}
        </Field>
        <Field label="Confirm new password" htmlFor="passwordConfirm" error={fields.passwordConfirm}>
          <PasswordInput
            id="passwordConfirm"
            value={passwordConfirm}
            onChange={setPasswordConfirm}
            autoComplete="new-password"
            invalid={Boolean(fields.passwordConfirm)}
            errorId={fields.passwordConfirm ? 'passwordConfirm-error' : undefined}
          />
        </Field>
        <Button type="submit" variant="primary" size="lg" block loading={submitting}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
