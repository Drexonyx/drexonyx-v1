'use client';

// Autonomous Campaign Agent — the only campaign workflow.
// User writes a natural-language brief and submits.
// The agent handles everything: brief parsing → strategy → caption/headline →
// campaign creation → script QC → brand alignment → Facebook policy check →
// publish → notification. No manual inputs required.

import { useState } from 'react';
import { actionAgentCampaignRun } from './actions';
import s from '../admin.module.css';

const FIELD: React.CSSProperties = {
  padding: '0.5rem 0.625rem',
  borderRadius: '4px',
  border: '1px solid var(--drex-border, #444)',
  background: 'var(--drex-input-bg, transparent)',
  color: 'inherit',
  fontSize: '0.875rem',
  width: '100%',
  boxSizing: 'border-box',
};

export function AgentCampaignForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    label: string;
    campaignName: string;
    campaignId: string;
    taskId: string;
    stepsRun: number;
    caption: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);

    const form = e.currentTarget;
    const data = await actionAgentCampaignRun(new FormData(form));

    if (data.ok) {
      setResult({
        label:
          data.outcome === 'TASK_COMPLETED'
            ? 'Published'
            : data.outcome === 'TASK_BLOCKED'
              ? 'Blocked — awaiting approval'
              : data.outcome ?? 'Done',
        campaignName: data.generatedCampaignName ?? '',
        campaignId: data.campaignId?.slice(0, 8) ?? '',
        taskId: data.taskId?.slice(0, 8) ?? '',
        stepsRun: data.stepsRun ?? 0,
        caption: data.generatedCaption ?? '',
      });
      form.reset();
    } else {
      setError(data.reason ?? 'Unknown error');
    }
    setPending(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '1.125rem' }}
    >
      {/* ── Error ────────────────────────────────────────────────────────── */}
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

      {/* ── Success ──────────────────────────────────────────────────────── */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
            {result.label} · {result.stepsRun} steps · Task {result.taskId}…
          </div>
          {result.campaignName && (
            <div
              style={{
                padding: '0.5rem 0.75rem',
                background: 'rgba(96,165,250,0.05)',
                border: '1px solid rgba(96,165,250,0.15)',
                borderRadius: '4px',
                fontSize: '0.8rem',
                color: 'var(--drex-text-secondary)',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Campaign:{' '}
              </span>
              {result.campaignName}
            </div>
          )}
          {result.caption && (
            <div
              style={{
                padding: '0.625rem 0.875rem',
                background: 'rgba(96,165,250,0.06)',
                border: '1px solid rgba(96,165,250,0.2)',
                borderRadius: '4px',
                fontSize: '0.8rem',
                color: 'var(--drex-text-secondary)',
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: '0.25rem',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Published caption
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{result.caption}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Brief ────────────────────────────────────────────────────────── */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem' }}>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: 'var(--drex-text-secondary)',
          }}
        >
          Campaign Brief
        </span>
        <textarea
          name="brief"
          required
          minLength={10}
          maxLength={2000}
          rows={7}
          placeholder={
            'Describe the campaign in natural language. The agent handles everything else.\n\nInclude:\n' +
            '• What to promote and why\n' +
            '• Target audience\n' +
            '• Desired tone (professional, energetic, inspiring…)\n' +
            '• Timing — e.g. "publish now" or "schedule for next Friday at 10am"\n' +
            '• Page or placement preference (optional)'
          }
          disabled={pending}
          style={{ ...FIELD, resize: 'vertical' }}
        />
      </label>

      {/* ── Submit ───────────────────────────────────────────────────────── */}
      <div>
        <button
          type="submit"
          disabled={pending}
          className={`${s.badge} ${s.badgeAccent}`}
          style={{
            cursor: pending ? 'not-allowed' : 'pointer',
            border: 'none',
            padding: '0.5rem 1.5rem',
            opacity: pending ? 0.7 : 1,
            fontSize: '0.875rem',
          }}
        >
          {pending ? 'Agent running…' : 'Run Autonomous Agent'}
        </button>
      </div>
    </form>
  );
}
