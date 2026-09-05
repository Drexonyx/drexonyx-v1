'use client';

import { useState, useTransition } from 'react';
import { actionCreateQcReview } from './actions';
import s from '../admin.module.css';

type Asset = { id: string; name: string | null; status: string };

export function QcForm({ assets }: { assets: Asset[] }) {
  const [isPending, startTransition] = useTransition();
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetId, setAssetId] = useState('');
  const [verdict, setVerdict] = useState<'PASS' | 'FAIL'>('PASS');
  const [notes, setNotes] = useState('');

  const readyAssets = assets.filter((a) => a.status === 'READY_FOR_QC');

  if (!show) {
    return (
      <button className={s.btn} onClick={() => setShow(true)}>
        + Submit QC Review
      </button>
    );
  }

  return (
    <div className={s.formCard}>
      <h3 className={s.formTitle}>Submit QC Review</h3>
      {error && <div className={s.formError}>{error}</div>}

      {readyAssets.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--drex-text-muted)' }}>
          No assets in READY_FOR_QC status.
        </p>
      ) : (
        <>
          <div className={s.formRow}>
            <label className={s.label}>Asset</label>
            <select className={s.select} value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              <option value="">— select asset —</option>
              {readyAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name ?? a.id.slice(0, 8) + '…'} — READY_FOR_QC
                </option>
              ))}
            </select>
          </div>

          <div className={s.formRow}>
            <label className={s.label}>Verdict</label>
            <select
              className={s.select}
              value={verdict}
              onChange={(e) => setVerdict(e.target.value as 'PASS' | 'FAIL')}
            >
              <option value="PASS">PASS — move to CLIENT_PREVIEW</option>
              <option value="FAIL">FAIL — move to REVISION_REQUIRED</option>
            </select>
          </div>

          <div className={s.formRow}>
            <label className={s.label}>Notes (optional)</label>
            <textarea
              className={s.textarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="QC notes…"
            />
          </div>
        </>
      )}

      <div className={s.formActions}>
        {readyAssets.length > 0 && (
          <button
            className={s.btn}
            disabled={isPending || !assetId}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const r = await actionCreateQcReview(assetId, verdict, notes);
                if (r.ok) {
                  setShow(false);
                  setAssetId('');
                  setVerdict('PASS');
                  setNotes('');
                } else {
                  setError(r.reason ?? 'Failed');
                }
              });
            }}
          >
            {isPending ? 'Submitting…' : 'Submit Review'}
          </button>
        )}
        <button
          className={s.btnSecondary}
          onClick={() => {
            setShow(false);
            setError(null);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
