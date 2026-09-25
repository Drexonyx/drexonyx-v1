'use client';

// Direct Facebook Publish form — no AI QC steps.
// Runs qc.facebook_policy.check (deterministic) then facebook.page.publish directly.
// Intentionally separate from LaunchFacebookPostForm to prevent accidental QC bypass.

import { useState } from 'react';
import { actionDirectFacebookPublish } from './actions';
import s from '../admin.module.css';

interface Props {
  campaigns: { id: string; name: string }[];
}

export function DirectFacebookPublishForm({ campaigns }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [publishMode, setPublishMode] = useState<'IMMEDIATE' | 'SCHEDULED'>('IMMEDIATE');

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
    const result = await actionDirectFacebookPublish(new FormData(form));

    if (result.ok) {
      const outcomeLabel = result.outcome === 'TASK_COMPLETED' ? 'Published' : result.outcome ?? 'Done';
      setSuccess(
        `${outcomeLabel} — Task ${result.taskId?.slice(0, 8)}… (${result.stepsRun ?? 0} steps run)`,
      );
      form.reset();
      setPublishMode('IMMEDIATE');
    } else {
      setError(result.reason ?? 'Unknown error');
    }
    setPending(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
    >
      <div
        style={{
          padding: '0.5rem 0.75rem',
          background: 'rgba(234,179,8,0.08)',
          border: '1px solid rgba(234,179,8,0.25)',
          borderRadius: '4px',
          fontSize: '0.8rem',
          lineHeight: 1.5,
          color: 'var(--drex-text-secondary, #999)',
        }}
      >
        AI review skipped (qc.script.review and qc.brand.alignment). Facebook policy check and direct publish only.
      </div>

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
          <option value="">— select campaign —</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
        Caption
        <textarea
          name="captionText"
          required
          minLength={1}
          maxLength={2000}
          rows={4}
          placeholder="Post caption — published verbatim after Facebook policy check"
          disabled={pending}
          style={{ ...fieldStyle, resize: 'vertical' }}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
        Headline <span style={{ opacity: 0.5 }}>(optional)</span>
        <input
          name="headline"
          maxLength={255}
          placeholder="Ad headline (Facebook policy check)"
          disabled={pending}
          style={fieldStyle}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
          Page
          <select name="pageTarget" disabled={pending} style={fieldStyle}>
            <option value="PAGE_1">PAGE_1</option>
            <option value="PAGE_2">PAGE_2</option>
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
          Placement
          <select name="placement" disabled={pending} style={fieldStyle}>
            <option value="feed">Feed</option>
            <option value="story">Story</option>
            <option value="reel">Reel</option>
            <option value="marketplace">Marketplace</option>
            <option value="search">Search</option>
          </select>
        </label>
      </div>

      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ fontSize: '0.875rem', marginBottom: '0.375rem' }}>Publish Mode</legend>
        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.875rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="publishMode"
              value="IMMEDIATE"
              checked={publishMode === 'IMMEDIATE'}
              onChange={() => setPublishMode('IMMEDIATE')}
              disabled={pending}
            />
            Immediate
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="publishMode"
              value="SCHEDULED"
              checked={publishMode === 'SCHEDULED'}
              onChange={() => setPublishMode('SCHEDULED')}
              disabled={pending}
            />
            Scheduled
          </label>
        </div>
      </fieldset>

      {publishMode === 'SCHEDULED' && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
          Scheduled At (ISO 8601)
          <input
            name="scheduledAt"
            type="datetime-local"
            required={publishMode === 'SCHEDULED'}
            disabled={pending}
            style={fieldStyle}
          />
        </label>
      )}

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
          {pending ? 'Publishing…' : 'Direct Publish to Facebook'}
        </button>
      </div>
    </form>
  );
}
