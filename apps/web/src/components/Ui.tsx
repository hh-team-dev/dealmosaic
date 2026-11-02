import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

/* ------------------------------- Button -------------------------------- */

type ButtonVariant = 'primary' | 'sun' | 'quiet' | 'ghost' | 'danger';

export function Button({
  variant = 'quiet',
  size,
  block,
  loading,
  children,
  className = '',
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'lg';
  block?: boolean;
  loading?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const span = document.createElement('span');
    span.className = 'ripple';
    span.style.width = span.style.height = `${size}px`;
    span.style.left = `${event.clientX - rect.left - size / 2}px`;
    span.style.top = `${event.clientY - rect.top - size / 2}px`;
    el.appendChild(span);
    window.setTimeout(() => span.remove(), 520);
  }

  const variantClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'sun'
        ? 'btn-sun'
        : variant === 'ghost'
          ? 'btn-ghost'
          : variant === 'danger'
            ? 'btn-danger'
            : 'btn-quiet';

  return (
    <button
      ref={ref}
      className={`btn ${variantClass} ${size ? `btn-${size}` : ''} ${block ? 'btn-block' : ''} ${className}`}
      onPointerDown={handlePointerDown}
      onClick={onClick}
      disabled={rest.disabled || loading}
      {...rest}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

/* -------------------------------- Field -------------------------------- */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {optional && <span className="optional">optional</span>}
      </label>
      {children}
      {hint && !error && (
        <span className="hint" id={`${htmlFor}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="error-text" id={`${htmlFor}-error`} role="alert">
          <span aria-hidden="true">⚠</span> {error}
        </span>
      )}
    </div>
  );
}

export function TextInput({
  invalid,
  hintId,
  errorId,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; hintId?: string; errorId?: string }) {
  return (
    <input
      className="input"
      aria-invalid={invalid || undefined}
      aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
      {...rest}
    />
  );
}

/* ------------------------- password visibility toggle ------------------- */

export function PasswordInput({
  id,
  value,
  onChange,
  invalid,
  errorId,
  autoComplete,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  errorId?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        className="input"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={errorId}
        autoComplete={autoComplete}
        placeholder={placeholder}
        style={{ paddingRight: 74 }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="btn btn-ghost btn-sm"
        style={{ position: 'absolute', right: 4, top: 4, minHeight: 40 }}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

/* ----------------------------- strength meter -------------------------- */

export function StrengthMeter({ score, label }: { score: number; label: string }) {
  return (
    <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
      <div className="strength" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`strength-bar ${score >= i && score > 0 ? `on-${score}` : ''}`} />
        ))}
      </div>
      <span className="strength-label">{label}</span>
    </div>
  );
}

/* ------------------------------- modal --------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const nodes = ref.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (nodes.length === 0) return;
        const first = nodes[0]!;
        const last = nodes[nodes.length - 1]!;
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => ref.current?.querySelector<HTMLElement>('button, input')?.focus(), 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <h3 id={titleId} style={{ margin: 0 }}>
            {title}
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------------------- count-up hook ---------------------------- */

/** Animated price reveal. Starts near the real value (never at 0 — this is not a
 *  casino) and lands exactly on it. Fully disabled for reduced-motion users. */
export function useCountUp(target: number, duration = 620): number {
  const [value, setValue] = useState(target);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    const from = Math.round(target * 0.94);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else setValue(target);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return value;
}

/* ------------------------------ demo flag ------------------------------ */

export function DemoFlag({ label = 'Illustrative pricing — live feed pending' }: { label?: string }) {
  return (
    <span className="demo-flag" data-origin="demo">
      <span aria-hidden="true">◈</span> {label}
    </span>
  );
}
