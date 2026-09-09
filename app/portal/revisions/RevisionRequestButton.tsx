'use client';

import { useState, useTransition } from 'react';
import { actionRequestRevision } from './actions';
import s from '../portal.module.css';

export function RevisionRequestButton({ assetId }: { assetId: string }) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = () => {
    setError(null);
    startTransition(async () => {
      const r = await actionRequestRevision(assetId);
      if (r.ok) {
        setSubmitted(true);
      } else {
        setError(r.reason ?? 'Request failed');
      }
    });
  };

  if (submitted) {
    return (
      <span className={`${s.badge} ${s.badgeSuccess}`}>Revision Requested</span>
    );
  }

  return (
    <span className={s.decideActions}>
      {error && <span className={s.errorInline}>{error}</span>}
      <button
        className={s.btnPrimary}
        disabled={isPending}
        onClick={handleRequest}
        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
      >
        {isPending ? 'Requesting…' : 'Request Revision'}
      </button>
    </span>
  );
}
