'use client';

import { useState } from 'react';
import { actionCreateCampaign } from './actions';
import s from '../admin.module.css';

export function CreateCampaignForm() {
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
    const result = await actionCreateCampaign(new FormData(form));

    if (result.ok) {
      setSuccess(`Campaign created (ID: ${result.campaignId?.slice(0, 8)}…)`);
      form.reset();
    } else {
      setError(result.reason ?? 'Unknown error');
    }
    setPending(false);
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
        Campaign Name
        <input
          name="name"
          required
          minLength={1}
          maxLength={255}
          placeholder="e.g. Q4 UGC Launch"
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
          {pending ? 'Creating…' : 'Create Campaign'}
        </button>
      </div>
    </form>
  );
}
