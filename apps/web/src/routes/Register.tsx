import { useEffect, useMemo, useState } from 'react';
import { Seo } from '../lib/seo';
import { Link, useSearchParams } from 'react-router-dom';
import { passwordStrength, validateDisplayName, validateEmail, validatePassword } from '@dealmosaic/core';
import { AuthLayout } from '../components/AuthLayout';
import { Icon } from '../components/Icon';
import { Button, Field, PasswordInput, StrengthMeter, TextInput } from '../components/Ui';
import { apiRequest, ApiError } from '../lib/api';
import { useToast } from '../components/Toast';

interface RegisterResponse {
  ok: boolean;
  email: string;
  devActionUrl?: string;
}

export default function Register() {
  const [params] = useSearchParams();
  const toast = useToast();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<RegisterResponse | null>(null);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const searchedFor = params.get('q');

  // The visitor arrived from a search. Stash it (sessionStorage, non-sensitive)
  // so that after they confirm their email we can take them to those results
  // instead of dumping them on a dashboard with no context.
  useEffect(() => {
    if (!searchedFor) return;
    try {
      sessionStorage.setItem('dm_pending_query', searchedFor);
    } catch {
      // private mode: fall back to the dashboard, no harm done
    }
  }, [searchedFor]);

  function validateLocally() {
    const next: Record<string, string> = {};
    const nameErr = validateDisplayName(displayName);
    if (nameErr) next.displayName = nameErr;
    const emailErr = validateEmail(email);
    if (emailErr) next.email = emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) next.password = pwErr;
    if (password !== passwordConfirm) next.passwordConfirm = 'The two passwords do not match.';
    if (!ageConfirmed) next.ageConfirmed = 'Please confirm you are 13 or older.';
    setFields(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validateLocally()) return;
    setSubmitting(true);
    try {
      const res = await apiRequest<RegisterResponse>('/api/auth/register', {
        method: 'POST',
        body: { displayName, email, password, passwordConfirm, ageConfirmed },
      });
      setDone(res);
      toast.push('Account created. Confirm your email to sign in.', 'success');
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields ?? {});
        setFormError(err.fields ? null : err.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle={
          <>
            We sent a confirmation link to <strong>{done.email}</strong>. It expires in 24 hours.
          </>
        }
      >
        <div className="callout callout-success">
          <div className="callout-title">
            <Icon name="info" size={16} /> One step left
          </div>
          <p className="small" style={{ margin: 0, color: 'var(--ink)' }}>
            Accounts must be confirmed before search unlocks — it keeps the comparison data clean and your account
            safe.
          </p>
        </div>

        {done.devActionUrl && (
          <div className="callout callout-info" style={{ marginTop: 14 }}>
            <div className="callout-title">
              <Icon name="warn" size={16} /> Development outbox
            </div>
            <p className="small" style={{ margin: '0 0 10px', color: 'var(--ink)' }}>
              No email provider is connected yet, so the message is waiting in a development inbox instead. This panel
              is visible only in development builds and disappears in production.
            </p>
            <Link className="btn btn-primary btn-block" to={done.devActionUrl}>
              Open the confirmation link
            </Link>
          </div>
        )}

        <div className="row" style={{ marginTop: 16, justifyContent: 'center' }}>
          <Link to="/login" className="btn btn-ghost btn-sm">
            Go to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
      <>
      <Seo
        title="Create an account"
        description="A free DealMosaic account watches prices for you and keeps your saved deals on any device."
        path="/register"
        index={false}
      />
    <AuthLayout
      title="Create your account"
      subtitle={
        searchedFor
          ? `Free. Confirm your email and we will take you straight to the comparison for “${searchedFor}”.`
          : 'Free. No card, no ads in your results, and you can delete everything in one click.'
      }
    >
      {formError && (
        <div className="callout callout-danger" role="alert" style={{ marginBottom: 16 }}>
          <p className="small" style={{ margin: 0, color: 'var(--ink)' }}>
            {formError}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Field label="Display name" htmlFor="displayName" error={fields.displayName} hint="How we greet you. No surnames needed.">
          <TextInput
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            placeholder="Ananya"
            invalid={Boolean(fields.displayName)}
            errorId={fields.displayName ? 'displayName-error' : undefined}
          />
        </Field>

        <Field label="Email address" htmlFor="email" error={fields.email} hint="Used for sign-in, verification and price alerts.">
          <TextInput
            id="email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            invalid={Boolean(fields.email)}
            errorId={fields.email ? 'email-error' : undefined}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={fields.password}
          hint="At least 10 characters, mixing letters, numbers or symbols."
        >
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

        <Field label="Confirm password" htmlFor="passwordConfirm" error={fields.passwordConfirm}>
          <PasswordInput
            id="passwordConfirm"
            value={passwordConfirm}
            onChange={setPasswordConfirm}
            autoComplete="new-password"
            invalid={Boolean(fields.passwordConfirm)}
            errorId={fields.passwordConfirm ? 'passwordConfirm-error' : undefined}
          />
        </Field>

        <div className="field">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              aria-invalid={Boolean(fields.ageConfirmed)}
            />
            <span>
              I am 13 or older. <span className="tiny">We ask this instead of your date of birth — we do not need it.</span>
            </span>
          </label>
          {fields.ageConfirmed && (
            <span className="error-text" role="alert">
              <span aria-hidden="true">⚠</span> {fields.ageConfirmed}
            </span>
          )}
        </div>

        <Button type="submit" variant="primary" size="lg" block loading={submitting}>
          {submitting ? 'Creating account…' : 'Create free account'}
        </Button>

        <p className="tiny" style={{ marginTop: 12, textAlign: 'center' }}>
          By creating an account you agree to our <Link to="/terms">terms</Link> and{' '}
          <Link to="/privacy">privacy policy</Link>. We never ask for retailer logins or card details.
        </p>
      </form>

      <p className="small" style={{ textAlign: 'center', margin: '16px 0 0' }}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
      </>
  );
}
