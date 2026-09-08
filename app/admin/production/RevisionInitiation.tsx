'use client';

// DR 0093: Admin UI for revision initiation.
// Surfaces "Initiate Revision Job" for REVISION_REQUIRED assets.
// orderId is derived from the asset row — never typed by the admin.
// No business logic here — all mutations go through the server action.

import { useState, useTransition } from 'react';
import { actionCreateRevisionJob } from './actions';
import s from '../admin.module.css';

type RevisionAsset = {
  id: string;
  order_id: string | null;
  name: string | null;
  status: string;
};

interface RevisionInitiationProps {
  // REVISION_REQUIRED non-archived assets with an order_id
  revisionAssets: RevisionAsset[];
}

export function RevisionInitiation({ revisionAssets }: RevisionInitiationProps) {
  const eligible = revisionAssets.filter((a) => a.status === 'REVISION_REQUIRED' && a.order_id);

  if (eligible.length === 0) return null;

  return (
    <div className={s.formCard}>
      <h3 className={s.formTitle}>Initiate Revision Jobs</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--drex-text-muted)', marginBottom: '1rem' }}>
        Creates a new production job for each selected asset. The original asset remains at
        REVISION_REQUIRED as an immutable historical record.
      </p>
      {eligible.map((asset) => (
        <RevisionForm key={asset.id} asset={asset} />
      ))}
    </div>
  );
}

function RevisionForm({ asset }: { asset: RevisionAsset }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [jobType, setJobType] = useState<'AI_GENERATION' | 'MANUAL_UPLOAD'>('MANUAL_UPLOAD');
  const [description, setDescription] = useState('');

  // orderId is derived from the asset row — not entered by the admin (DR 0093 §2.2)
  const orderId = asset.order_id!;

  if (success) {
    return (
      <div style={{ fontSize: '0.8rem', color: '#4ade80', marginBottom: '0.5rem' }}>
        Revision job created for asset <span style={{ fontFamily: 'monospace' }}>{asset.id.slice(0, 8)}…</span>
        {' '}({success})
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--drex-border)' }}>
      <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>
        Asset <span style={{ fontFamily: 'monospace' }}>{asset.id.slice(0, 8)}…</span>
        {asset.name && ` — ${asset.name}`}
        {' '}
        <span className={`${s.badge} ${s.badgeDanger}`}>REVISION_REQUIRED</span>
        {' '}
        <span style={{ color: 'var(--drex-text-muted)' }}>
          Order: <span style={{ fontFamily: 'monospace' }}>{orderId.slice(0, 8)}…</span>
        </span>
      </div>

      <div className={s.formRow}>
        <label className={s.label}>Job Type</label>
        <select
          className={s.select}
          value={jobType}
          onChange={(e) => setJobType(e.target.value as 'AI_GENERATION' | 'MANUAL_UPLOAD')}
        >
          <option value="MANUAL_UPLOAD">MANUAL_UPLOAD</option>
          <option value="AI_GENERATION">AI_GENERATION</option>
        </select>
      </div>

      <div className={s.formRow}>
        <label className={s.label}>Description (optional)</label>
        <textarea
          className={s.textarea}
          rows={2}
          placeholder="Revision instructions…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {error && <div className={s.formError}>{error}</div>}

      <div className={s.formActions}>
        <button
          className={s.btn}
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const r = await actionCreateRevisionJob(
                asset.id,
                orderId,
                jobType,
                description || undefined,
              );
              if (r.ok) {
                setSuccess(r.newProductionJobId ? r.newProductionJobId.slice(0, 8) + '…' : 'created');
                setDescription('');
              } else {
                setError(r.reason ?? 'Failed to create revision job');
              }
            });
          }}
        >
          {isPending ? 'Creating…' : 'Initiate Revision Job (creates new production job)'}
        </button>
      </div>
    </div>
  );
}
