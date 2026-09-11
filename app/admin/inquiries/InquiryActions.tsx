'use client';

import { useState, useTransition } from 'react';
import { actionMarkInquiryReviewed, actionMarkInquiryDismissed } from './actions';
import s from '../admin.module.css';

interface InquiryActionsProps {
  inquiryId: string;
  status: string;
  canAct: boolean;
}

export function InquiryActions({ inquiryId, status, canAct }: InquiryActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canAct) return null;
  if (status === 'CONVERTED' || status === 'DISMISSED') return null;

  return (
    <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
      {error && (
        <span style={{ color: 'var(--drex-danger)', fontSize: '0.75rem' }}>{error}</span>
      )}
      {status === 'NEW' && (
        <button
          className={`${s.btnSmall}`}
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const r = await actionMarkInquiryReviewed(inquiryId);
              if (!r.ok) setError(r.reason ?? 'Failed');
            });
          }}
        >
          {isPending ? '…' : 'Review'}
        </button>
      )}
      <button
        className={`${s.btnSmall} ${s.btnDanger}`}
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await actionMarkInquiryDismissed(inquiryId);
            if (!r.ok) setError(r.reason ?? 'Failed');
          });
        }}
      >
        {isPending ? '…' : 'Dismiss'}
      </button>
    </div>
  );
}
