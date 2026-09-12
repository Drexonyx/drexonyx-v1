'use client';

import { useState } from 'react';
import { actionCreateBrief } from './actions';
import s from '../admin.module.css';

type Campaign = { id: string; name: string };

const fieldStyle: React.CSSProperties = {
  padding: '0.5rem 0.625rem',
  borderRadius: '4px',
  border: '1px solid var(--drex-border, #444)',
  background: 'var(--drex-input-bg, transparent)',
  color: 'inherit',
  fontSize: '0.875rem',
  width: '100%',
};

const textareaStyle: React.CSSProperties = {
  ...fieldStyle,
  resize: 'vertical',
  minHeight: '80px',
  fontFamily: 'inherit',
};

export function CreateBriefForm({ campaigns }: { campaigns: Campaign[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const form = e.currentTarget;
    const result = await actionCreateBrief(new FormData(form));

    if (result.ok) {
      setSuccess(`Brief created (ID: ${result.briefId?.slice(0, 8)}…)`);
      form.reset();
    } else {
      setError(result.reason ?? 'Unknown error');
    }
    setPending(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
    >
      {error && (
        <div style={{ padding: '0.625rem 0.875rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '0.625rem 0.875rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 600 }}>
          {success}
        </div>
      )}

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
        Campaign
        <select name="campaign_id" required disabled={pending} style={fieldStyle}>
          <option value="">Select a campaign…</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
        Brief Text
        <textarea name="brief_text" disabled={pending} placeholder="Client brief overview…" style={textareaStyle} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
        Deliverables
        <textarea name="deliverables" disabled={pending} placeholder="Requested deliverables…" style={textareaStyle} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
        Target Audience
        <textarea name="target_audience" disabled={pending} placeholder="Audience description…" style={{ ...textareaStyle, minHeight: '60px' }} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
        Timeline Notes
        <textarea name="timeline_notes" disabled={pending} placeholder="Timeline expectations…" style={{ ...textareaStyle, minHeight: '60px' }} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
        Additional Notes
        <textarea name="additional_notes" disabled={pending} placeholder="Supplementary context…" style={{ ...textareaStyle, minHeight: '60px' }} />
      </label>

      <div>
        <button
          type="submit"
          disabled={pending}
          className={`${s.badge} ${s.badgeAccent}`}
          style={{ cursor: pending ? 'not-allowed' : 'pointer', border: 'none', padding: '0.5rem 1.25rem', opacity: pending ? 0.7 : 1 }}
        >
          {pending ? 'Creating…' : 'Create Brief'}
        </button>
      </div>
    </form>
  );
}
