'use client';

import { useState, useTransition } from 'react';
import { actionAdjustCredits } from './actions';
import s from '../admin.module.css';

export function CreditAdjustForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await actionAdjustCredits(fd);
      if (result && !result.ok) setError(result.reason);
    });
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Adjust credit balance" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 480 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label htmlFor="adj-delta" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--drex-text-muted)' }}>
          Credits delta (positive = add, negative = deduct)
        </label>
        <input
          id="adj-delta"
          name="creditsDelta"
          type="number"
          required
          placeholder="e.g. 500 or -200"
          disabled={isPending}
          className={s.cellMono}
          style={{ padding: '0.5rem 0.75rem', background: 'var(--drex-surface-2)', border: '1px solid var(--drex-border)', borderRadius: 6, color: 'var(--drex-text)', width: '100%' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label htmlFor="adj-reason" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--drex-text-muted)' }}>
          Reason (required for audit trail)
        </label>
        <input
          id="adj-reason"
          name="reason"
          type="text"
          required
          placeholder="e.g. Goodwill credit for Q3 campaign"
          disabled={isPending}
          style={{ padding: '0.5rem 0.75rem', background: 'var(--drex-surface-2)', border: '1px solid var(--drex-border)', borderRadius: 6, color: 'var(--drex-text)', width: '100%' }}
        />
      </div>

      {error && (
        <div role="alert" style={{ padding: '0.5rem 0.75rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 6, color: '#f87171', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        style={{ alignSelf: 'flex-start', padding: '0.5rem 1.25rem', background: 'var(--drex-accent)', color: '#fff', fontWeight: 600, fontSize: '0.85rem', border: 'none', borderRadius: 6, cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}
      >
        {isPending ? 'Applying…' : 'Apply Adjustment'}
      </button>
    </form>
  );
}
