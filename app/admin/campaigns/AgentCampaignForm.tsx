'use client';

// Agent-first campaign interface.
// Replaces the three separate manual forms (CreateCampaignForm, LaunchFacebookPostForm,
// DirectFacebookPublishForm) with a single orchestrated workflow.
//
// agentPath 'full-qc'  → marketing-campaign specialist
//   (qc.script.review → qc.brand.alignment → qc.facebook_policy.check → facebook.page.publish)
// agentPath 'direct'   → direct-facebook-publish specialist
//   (qc.facebook_policy.check → facebook.page.publish)

import { useState } from 'react';
import { actionAgentCampaignRun } from './actions';
import s from '../admin.module.css';

interface Props {
  campaigns: { id: string; name: string }[];
}

type AgentPath = 'full-qc' | 'direct';
type CampaignMode = 'existing' | 'new';
type PublishMode = 'IMMEDIATE' | 'SCHEDULED';

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

const SECTION_LABEL: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: 'var(--drex-text-secondary)',
  marginBottom: '0.5rem',
};

export function AgentCampaignForm({ campaigns }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [agentPath, setAgentPath] = useState<AgentPath>('full-qc');
  const [campaignMode, setCampaignMode] = useState<CampaignMode>(
    campaigns.length > 0 ? 'existing' : 'new',
  );
  const [publishMode, setPublishMode] = useState<PublishMode>('IMMEDIATE');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const form = e.currentTarget;
    const result = await actionAgentCampaignRun(new FormData(form));

    if (result.ok) {
      const label =
        result.outcome === 'TASK_COMPLETED'
          ? 'Published'
          : result.outcome === 'TASK_BLOCKED'
            ? 'Blocked — awaiting approval'
            : result.outcome ?? 'Done';
      setSuccess(
        `${label} — Task ${result.taskId?.slice(0, 8)}… · Campaign ${result.campaignId?.slice(0, 8)}… · ${result.stepsRun ?? 0} steps run`,
      );
      form.reset();
      setCampaignMode(campaigns.length > 0 ? 'existing' : 'new');
      setAgentPath('full-qc');
      setPublishMode('IMMEDIATE');
    } else {
      setError(result.reason ?? 'Unknown error');
    }
    setPending(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '1.125rem' }}
    >
      {/* ── Agent path selector ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
        }}
      >
        {(
          [
            {
              value: 'full-qc' as AgentPath,
              label: 'Full AI Review',
              desc: 'Script QC → Brand alignment → Policy check → Publish',
            },
            {
              value: 'direct' as AgentPath,
              label: 'Direct Publish',
              desc: 'Policy check only → Publish (no AI QC)',
            },
          ] as const
        ).map(({ value, label, desc }) => (
          <button
            key={value}
            type="button"
            onClick={() => setAgentPath(value)}
            disabled={pending}
            style={{
              padding: '0.625rem 0.875rem',
              borderRadius: '4px',
              border: `1px solid ${agentPath === value ? 'var(--drex-accent, #60a5fa)' : 'var(--drex-border, #444)'}`,
              background:
                agentPath === value ? 'rgba(96,165,250,0.08)' : 'var(--drex-input-bg, transparent)',
              color: agentPath === value ? 'var(--drex-accent, #60a5fa)' : 'inherit',
              cursor: pending ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              opacity: pending ? 0.6 : 1,
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>{label}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7, lineHeight: 1.4 }}>{desc}</div>
          </button>
        ))}
      </div>
      <input type="hidden" name="agentPath" value={agentPath} />

      {agentPath === 'direct' && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            background: 'rgba(234,179,8,0.07)',
            border: '1px solid rgba(234,179,8,0.2)',
            borderRadius: '4px',
            fontSize: '0.75rem',
            color: 'var(--drex-text-secondary)',
          }}
        >
          AI review skipped — qc.facebook_policy.check only.
        </div>
      )}

      {/* ── Status messages ──────────────────────────────────────────────── */}
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

      {/* ── Campaign ─────────────────────────────────────────────────────── */}
      <div>
        <p style={SECTION_LABEL}>Campaign</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {(['existing', 'new'] as CampaignMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setCampaignMode(m)}
              disabled={pending || (m === 'existing' && campaigns.length === 0)}
              style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.625rem',
                borderRadius: '3px',
                border: `1px solid ${campaignMode === m ? 'var(--drex-accent, #60a5fa)' : 'var(--drex-border, #444)'}`,
                background: campaignMode === m ? 'rgba(96,165,250,0.1)' : 'transparent',
                color: campaignMode === m ? 'var(--drex-accent, #60a5fa)' : 'var(--drex-text-secondary)',
                cursor:
                  pending || (m === 'existing' && campaigns.length === 0)
                    ? 'not-allowed'
                    : 'pointer',
                opacity: m === 'existing' && campaigns.length === 0 ? 0.4 : pending ? 0.6 : 1,
              }}
            >
              {m === 'existing' ? 'Select existing' : 'Create new'}
            </button>
          ))}
        </div>
        <input type="hidden" name="campaignMode" value={campaignMode} />

        {campaignMode === 'existing' ? (
          <select name="campaignId" required disabled={pending} style={FIELD}>
            <option value="">— select campaign —</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            name="newCampaignName"
            required
            minLength={1}
            maxLength={255}
            placeholder="Campaign name, e.g. Q4 UGC Launch"
            disabled={pending}
            style={FIELD}
          />
        )}
      </div>

      {/* ── Brief / caption ──────────────────────────────────────────────── */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
        <span style={SECTION_LABEL}>Campaign Brief / Caption</span>
        <textarea
          name="captionText"
          required
          minLength={1}
          maxLength={2000}
          rows={5}
          placeholder={
            agentPath === 'full-qc'
              ? 'Describe the campaign or paste the post caption. The agent will QC the content, check brand alignment, verify Facebook policy, then publish.'
              : 'Post caption — published verbatim after Facebook policy check.'
          }
          disabled={pending}
          style={{ ...FIELD, resize: 'vertical' }}
        />
      </label>

      {/* ── Headline ─────────────────────────────────────────────────────── */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
        Headline <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>(optional)</span>
        <input
          name="headline"
          maxLength={255}
          placeholder="Ad headline (included in policy check)"
          disabled={pending}
          style={FIELD}
        />
      </label>

      {/* ── Page + Placement ─────────────────────────────────────────────── */}
      <div>
        <p style={SECTION_LABEL}>Publish Target</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
            Page
            <select name="pageTarget" disabled={pending} style={FIELD}>
              <option value="PAGE_1">PAGE_1</option>
              <option value="PAGE_2">PAGE_2</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
            Placement
            <select name="placement" disabled={pending} style={FIELD}>
              <option value="feed">Feed</option>
              <option value="story">Story</option>
              <option value="reel">Reel</option>
              <option value="marketplace">Marketplace</option>
              <option value="search">Search</option>
            </select>
          </label>
        </div>
      </div>

      {/* ── Publish mode ─────────────────────────────────────────────────── */}
      <div>
        <p style={SECTION_LABEL}>Publish Mode</p>
        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.875rem' }}>
          {(['IMMEDIATE', 'SCHEDULED'] as PublishMode[]).map((m) => (
            <label
              key={m}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: pending ? 'not-allowed' : 'pointer' }}
            >
              <input
                type="radio"
                name="publishMode"
                value={m}
                checked={publishMode === m}
                onChange={() => setPublishMode(m)}
                disabled={pending}
              />
              {m === 'IMMEDIATE' ? 'Immediate' : 'Scheduled'}
            </label>
          ))}
        </div>
        {publishMode === 'SCHEDULED' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', marginTop: '0.625rem' }}>
            Scheduled At
            <input
              name="scheduledAt"
              type="datetime-local"
              required
              disabled={pending}
              style={FIELD}
            />
          </label>
        )}
      </div>

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
          {pending
            ? 'Agent running…'
            : agentPath === 'full-qc'
              ? 'Run Campaign Agent'
              : 'Run Direct Publish'}
        </button>
      </div>
    </form>
  );
}
