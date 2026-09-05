'use client';

import { useState, useTransition } from 'react';
import { actionDecideApproval } from './actions';
import s from '../portal.module.css';

interface ApprovalDecideProps {
  approvalId: string;
}

export function ApprovalDecide({ approvalId }: ApprovalDecideProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const decide = (decision: 'APPROVED' | 'REJECTED') => {
    setError(null);
    startTransition(async () => {
      const r = await actionDecideApproval(approvalId, decision);
      if (!r.ok) setError(r.reason ?? 'Failed');
    });
  };

  return (
    <div className={s.decideActions}>
      {error && (
        <span className={s.errorInline}>{error}</span>
      )}
      <button
        className={s.btnSuccessSmall}
        disabled={isPending}
        onClick={() => decide('APPROVED')}
      >
        Approve
      </button>
      <button
        className={s.btnDangerSmall}
        disabled={isPending}
        onClick={() => decide('REJECTED')}
      >
        Reject
      </button>
    </div>
  );
}
