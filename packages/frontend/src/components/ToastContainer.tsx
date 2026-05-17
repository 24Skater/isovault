import { useEffect, useState } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const DURATION_MS = 6000;

export function ToastContainer({ toasts, onDismiss }: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    if (toasts.length === 0) return;
    const latest = toasts[toasts.length - 1];
    const t = setTimeout(() => onDismiss(latest.id), DURATION_MS);
    return () => clearTimeout(t);
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  const borderColor: Record<string, string> = {
    success: 'var(--color-success)',
    error: 'var(--color-danger)',
    warning: 'var(--color-warning)',
    info: 'var(--border-default)',
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 340,
    }}>
      {toasts.map((toast) => (
        <div key={toast.id} style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '10px 14px',
          background: 'var(--bg-surface)',
          border: `1px solid ${borderColor[toast.type]}`,
          borderLeft: `3px solid ${borderColor[toast.type]}`,
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          animation: 'slideInUp 140ms ease-out',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: toast.type === 'info' ? 'var(--accent)' : borderColor[toast.type],
            flexShrink: 0,
            marginTop: 1,
          }}>
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : '·'}
          </span>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--text-primary)',
            flex: 1,
            lineHeight: 1.5,
          }}>
            {toast.message}
          </span>
          <button
            onClick={() => onDismiss(toast.id)}
            style={{
              background: 'none', border: 'none', padding: 0,
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
