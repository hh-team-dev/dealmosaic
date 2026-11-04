import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<{ push: (message: string, kind?: ToastKind) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-2), { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  useEffect(() => {
    const onStorageError = () => push('Your browser could not save this change. Allow site storage or free some space, then try again.', 'error');
    window.addEventListener('dealmosaic:storage-error', onStorageError);
    return () => window.removeEventListener('dealmosaic:storage-error', onStorageError);
  }, [push]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast ${toast.kind === 'error' ? 'toast-error' : toast.kind === 'info' ? 'toast-info' : ''}`}
          >
            <span
              aria-hidden="true"
              style={{
                color: toast.kind === 'error' ? 'var(--coral-d)' : toast.kind === 'info' ? 'var(--ember-d)' : 'var(--grass-d)',
                marginTop: 1,
              }}
            >
              <Icon name={toast.kind === 'error' ? 'warn' : toast.kind === 'info' ? 'info' : 'check'} size={17} />
            </span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
