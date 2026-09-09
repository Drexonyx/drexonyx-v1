'use client';

// DR 0092: Admin UI for MANUAL_UPLOAD workflow.
// Surfaces "Create Asset" and "Mark Ready for QC" for eligible MANUAL_UPLOAD jobs.
// No business logic here — all mutations go through server actions.

import { useState, useTransition } from 'react';
import { actionCreateManualUploadAsset, actionMarkManualAssetReadyForQc } from './actions';
import s from '../admin.module.css';

type ManualJob = {
  id: string;
  order_id: string | null;
  status: string;
};

type UploadedAsset = {
  id: string;
  order_id: string | null;
  name: string | null;
  status: string;
};

interface ManualUploadWorkflowProps {
  // QUEUED MANUAL_UPLOAD jobs
  jobs: ManualJob[];
  // UPLOADED assets (non-archived)
  uploadedAssets: UploadedAsset[];
}

export function ManualUploadWorkflow({ jobs, uploadedAssets }: ManualUploadWorkflowProps) {
  const eligibleJobs = jobs.filter((j) => j.status === 'QUEUED' && j.order_id);

  if (eligibleJobs.length === 0 && uploadedAssets.length === 0) return null;

  return (
    <div className={s.formCard}>
      <h3 className={s.formTitle}>MANUAL_UPLOAD Workflow</h3>

      {eligibleJobs.map((job) => (
        <CreateAssetForm key={job.id} job={job} />
      ))}

      {uploadedAssets.map((asset) => {
        const job = eligibleJobs.find((j) => j.order_id === asset.order_id);
        if (!job) return null;
        return <MarkReadyForm key={asset.id} asset={asset} productionJobId={job.id} />;
      })}
    </div>
  );
}

function CreateAssetForm({ job }: { job: ManualJob }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState('');

  return (
    <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--drex-border)' }}>
      <div className={s.formRow}>
        <label className={s.label}>
          Create Asset for Job <span style={{ fontFamily: 'monospace' }}>{job.id.slice(0, 8)}…</span>
        </label>
        <input
          type="text"
          className={s.select}
          placeholder="Asset name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {error && <div className={s.formError}>{error}</div>}
      {success && <div style={{ color: '#4ade80', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{success}</div>}
      <div className={s.formActions}>
        <button
          className={s.btn}
          disabled={isPending}
          onClick={() => {
            setError(null);
            setSuccess(null);
            startTransition(async () => {
              const r = await actionCreateManualUploadAsset(job.id, name || undefined);
              if (r.ok) {
                setSuccess(`Asset created (${r.assetId?.slice(0, 8)}…)`);
                setName('');
              } else {
                setError(r.reason ?? 'Failed to create asset');
              }
            });
          }}
        >
          {isPending ? 'Creating…' : 'Create Asset'}
        </button>
      </div>
    </div>
  );
}

function MarkReadyForm({ asset, productionJobId }: { asset: UploadedAsset; productionJobId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div style={{ fontSize: '0.8rem', color: '#4ade80', marginBottom: '0.5rem' }}>
        Asset <span style={{ fontFamily: 'monospace' }}>{asset.id.slice(0, 8)}…</span> marked READY_FOR_QC
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
        Asset <span style={{ fontFamily: 'monospace' }}>{asset.id.slice(0, 8)}…</span>
        {asset.name && ` — ${asset.name}`}
        {' '}
        <span className={`${s.badge} ${s.badgeWarning}`}>UPLOADED</span>
      </div>
      {error && <div className={s.formError}>{error}</div>}
      <button
        className={s.btnSmall}
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await actionMarkManualAssetReadyForQc(asset.id, productionJobId);
            if (r.ok) {
              setDone(true);
            } else {
              setError(r.reason ?? 'Failed');
            }
          });
        }}
      >
        {isPending ? 'Advancing…' : 'Mark Ready for QC'}
      </button>
    </div>
  );
}
