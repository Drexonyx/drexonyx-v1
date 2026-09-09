'use client';

import { useState, useTransition } from 'react';
import { actionCreateProductionJob, actionCancelProductionJob } from './actions';
import s from '../admin.module.css';

type Order = { id: string; status: string };

interface ProductionJobActionsProps {
  // Row-level cancel
  jobId?: string;
  jobStatus?: string;
  canCancel: boolean;
  // Top-level create form data
  orders: Order[];
}

export function ProductionJobActions({ jobId, jobStatus, canCancel, orders }: ProductionJobActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [jobType, setJobType] = useState<'AI_GENERATION' | 'MANUAL_UPLOAD'>('MANUAL_UPLOAD');
  const [description, setDescription] = useState('');

  // Row-level cancel
  if (jobId && jobStatus) {
    if (!canCancel || jobStatus !== 'QUEUED') return null;
    return (
      <div>
        {error && <span style={{ color: 'var(--drex-danger)', fontSize: '0.75rem', display: 'block' }}>{error}</span>}
        <button
          className={`${s.btnSmall} ${s.btnDanger}`}
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const r = await actionCancelProductionJob(jobId);
              if (!r.ok) setError(r.reason ?? 'Failed');
            });
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  // Top-level create form
  if (!showForm) {
    return (
      <button className={s.btn} onClick={() => setShowForm(true)}>
        + New Job
      </button>
    );
  }

  return (
    <div className={s.formCard}>
      <h3 className={s.formTitle}>Create Production Job</h3>
      {error && <div className={s.formError}>{error}</div>}

      <div className={s.formRow}>
        <label className={s.label}>Order</label>
        <select
          className={s.select}
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        >
          <option value="">— select order —</option>
          {orders.filter((o) => o.status === 'ACTIVE').map((o) => (
            <option key={o.id} value={o.id}>{o.id.slice(0, 8)}… (ACTIVE)</option>
          ))}
        </select>
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
          rows={3}
          placeholder="Brief description of the job…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className={s.formActions}>
        <button
          className={s.btn}
          disabled={isPending || !orderId}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const r = await actionCreateProductionJob(orderId, jobType, description);
              if (r.ok) {
                setShowForm(false);
                setOrderId('');
                setDescription('');
                setJobType('MANUAL_UPLOAD');
              } else {
                setError(r.reason ?? 'Failed');
              }
            });
          }}
        >
          {isPending ? 'Creating…' : 'Create Job'}
        </button>
        <button className={s.btnSecondary} onClick={() => { setShowForm(false); setError(null); }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
