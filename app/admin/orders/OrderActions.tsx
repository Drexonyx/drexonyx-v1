'use client';

import { useState } from 'react';
import { actionCompleteOrder, actionCancelOrder } from './actions';
import s from '../admin.module.css';

export function OrderActions({ orderId }: { orderId: string }) {
  const [pending, setPending] = useState<'complete' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    setPending('complete');
    setError(null);
    const result = await actionCompleteOrder(orderId);
    if (!result.ok) setError(result.reason ?? 'Failed to complete order');
    setPending(null);
  }

  async function handleCancel() {
    setPending('cancel');
    setError(null);
    const result = await actionCancelOrder(orderId);
    if (!result.ok) setError(result.reason ?? 'Failed to cancel order');
    setPending(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      {error && (
        <span
          style={{
            color: 'var(--drex-danger, #ef4444)',
            fontSize: '0.75rem',
            maxWidth: '18rem',
          }}
        >
          {error}
        </span>
      )}
      <div style={{ display: 'flex', gap: '0.375rem' }}>
        <button
          onClick={handleComplete}
          disabled={pending !== null}
          className={`${s.badge} ${s.badgeSuccess}`}
          style={{
            cursor: pending ? 'not-allowed' : 'pointer',
            border: 'none',
            padding: '0.2rem 0.5rem',
            opacity: pending === 'cancel' ? 0.5 : 1,
          }}
        >
          {pending === 'complete' ? '…' : 'Complete'}
        </button>
        <button
          onClick={handleCancel}
          disabled={pending !== null}
          className={`${s.badge} ${s.badgeDanger}`}
          style={{
            cursor: pending ? 'not-allowed' : 'pointer',
            border: 'none',
            padding: '0.2rem 0.5rem',
            opacity: pending === 'complete' ? 0.5 : 1,
          }}
        >
          {pending === 'cancel' ? '…' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
