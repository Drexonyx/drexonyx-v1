'use client';

// Agent-first campaign interface.
//
// 'full-qc' (Autonomous Agent):
//   User writes a natural-language brief → submit.
//   The agent does everything: parse brief → strategy → caption/headline →
//   auto-create campaign → qc.script.review → qc.brand.alignment →
//   qc.facebook_policy.check → facebook.page.publish → NOTIFICATION.
//   No campaign selection, no page/placement/schedule inputs — all derived from brief.
//
// 'direct' (Direct Publish):
//   User selects/creates campaign, writes caption, sets publish options manually.
//   Agent runs qc.facebook_policy.check → facebook.page.publish only.

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
  const [generatedCaption, setGeneratedCaption] = useState<string | null>(null);
  const [generatedCampaignName, setGeneratedCampaignName] = useState<string | null>(null);
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
    setGeneratedCaption(null);
    setGeneratedCampaignName(null);

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
        `${label} · Campaign ${result.campaignId?.slice(0, 8)}… · Task ${result.taskId?.slice(0, 8)}… · ${result.stepsRun ?? 0} steps`,
      );
      if (result.generatedCaption) setGeneratedCaption(result.generatedCaption);
      if (result.generatedCampaignName) setGeneratedCampaignName(result.generatedCampaignName);
      form.reset();
      setAgentPath('full-qc');
      setCampaignMode(campaigns.length > 0 ? 'existing' : 'new');
      setPublishMode('IMMEDIATE');
    } else {
      setError(result.reason ?? 'Unknown error');
    }
    setPending(false);
  }

  const isFullQc = agentPath === 'full-qc';

  return (
    <form
      onSubmit={handleSubmit}
      style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '1.125rem' }}
    >
      {/* ── Agent path selector ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {(
          [
            {
              value: 'full-qc' as AgentPath,
              label: 'Autonomous Agent',
              desc: 'Write a brief → agent develops strategy, generates caption, QC, then publishes',
            },
            {
              value: 'direct' as AgentPath,
              label: 'Direct Publish',
              desc: 'Write the final caption → policy check only → publish',
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

      {!isFullQc && (
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
            {success}
          </div>
          {generatedCampaignName && (
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
              <span style={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Campaign: </span>
              {generatedCampaignName}
            </div>
          )}
          {generatedCaption && (
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
              <div style={{ fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Generated caption
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{generatedCaption}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Full-QC: brief only ───────────────────────────────────────────── */}
      {isFullQc && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
          <span style={SECTION_LABEL}>Campaign Brief</span>
          <textarea
            name="brief"
            required
            minLength={10}
            maxLength={2000}
            rows={7}
            placeholder={
              'Describe the campaign. The agent will handle everything else.\n\nInclude:\n' +
              '• What to promote and why\n' +
              '• Target audience\n' +
              '• Desired tone (professional, energetic, inspiring…)\n' +
              '• Timing — e.g. "publish now" or "schedule for Friday at 10am"\n' +
              '• Page or placement preference (optional)'
            }
            disabled={pending}
            style={{ ...FIELD, resize: 'vertical' }}
          />
        </label>
      )}

      {/* ── Direct: campaign + caption + controls ────────────────────────── */}
      {!isFullQc && (
        <>
          {/* Campaign selection */}
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
                      pending || (m === 'existing' && campaigns.length === 0) ? 'not-allowed' : 'pointer',
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
                placeholder="Campaign name"
                disabled={pending}
                style={FIELD}
              />
            )}
          </div>

          {/* Caption */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
            <span style={SECTION_LABEL}>Post Caption</span>
            <textarea
              name="captionText"
              required
              minLength={1}
              maxLength={2000}
              rows={5}
              placeholder="Post caption — published verbatim after Facebook policy check."
              disabled={pending}
              style={{ ...FIELD, resize: 'vertical' }}
            />
          </label>

          {/* Headline */}
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

          {/* Page + Placement */}
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

          {/* Publish mode */}
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
                <input name="scheduledAt" type="datetime-local" required disabled={pending} style={FIELD} />
              </label>
            )}
          </div>
        </>
      )}

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
            ? isFullQc ? 'Agent running…' : 'Publishing…'
            : isFullQc ? 'Run Autonomous Agent' : 'Run Direct Publish'}
        </button>
      </div>
    </form>
  );
}
