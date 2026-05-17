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

  const borderColor: Record<Toast['type'], string> = {
    success: 'var(--color-success)',
    error: 'var(--color-error)',
    info: 'var(--accent)',
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
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          animation: 'fadeInUp 150ms ease',
        }}>
          <span style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 11,
            color: borderColor[toast.type],
            flexShrink: 0,
            marginTop: 1,
          }}>
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : '·'}
          </span>
          <span style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 11,
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
