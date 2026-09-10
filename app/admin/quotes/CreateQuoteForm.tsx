'use client';

import { useState } from 'react';
import { actionCreateQuote } from './actions';
import s from '../admin.module.css';

type Campaign = { id: string; name: string };

export function CreateQuoteForm({ campaigns }: { campaigns: Campaign[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fieldStyle: React.CSSProperties = {
    padding: '0.5rem 0.625rem',
    borderRadius: '4px',
    border: '1px solid var(--drex-border, #444)',
    background: 'var(--drex-input-bg, transparent)',
    color: 'inherit',
    fontSize: '0.875rem',
    width: '100%',
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const form = e.currentTarget;
    const result = await actionCreateQuote(new FormData(form));

    if (result.ok) {
      setSuccess(`Quote created (ID: ${result.quoteId?.slice(0, 8)}…)`);
      form.reset();
    } else {
      setError(result.reason ?? 'Unknown error');
    }
    setPending(false);
  }

  if (campaigns.length === 0) {
    return (
      <p style={{ fontSize: '0.875rem', color: 'var(--drex-text-muted)', fontStyle: 'italic' }}>
        No active campaigns available. Create a campaign first.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
    >
      {error && (
        <div
          style={{
            padding: '0.625rem 0.875rem',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            padding: '0.625rem 0.875rem',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '4px',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          {success}
        </div>
      )}

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
        Campaign
        <select name="campaignId" required disabled={pending} style={fieldStyle}>
          <option value="">Select a campaign…</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
        <span>
          Total Amount (USD){' '}
          <span style={{ fontWeight: 400, opacity: 0.65 }}>— client-facing price</span>
        </span>
        <input
          name="totalAmount"
          type="number"
          min="0.01"
          step="0.01"
          required
          placeholder="e.g. 5000.00"
          disabled={pending}
          style={fieldStyle}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
        <span>
          Estimated Cost (USD){' '}
          <span style={{ fontWeight: 400, opacity: 0.65 }}>— optional, required for Margin Check</span>
        </span>
        <input
          name="estimatedCost"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="e.g. 2000.00"
          disabled={pending}
          style={fieldStyle}
        />
      </label>

      <div>
        <button
          type="submit"
          disabled={pending}
          className={`${s.badge} ${s.badgeAccent}`}
          style={{
            cursor: pending ? 'not-allowed' : 'pointer',
            border: 'none',
            padding: '0.5rem 1.25rem',
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? 'Creating…' : 'Create Quote'}
        </button>
      </div>
    </form>
  );
}
