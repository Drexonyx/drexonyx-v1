'use client';

import { useState, useTransition } from 'react';
import { actionSendOutreach } from './actions';
import s from '../admin.module.css';

export function SendOutreachButton({ leadId }: { leadId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; reason?: string; redirected?: boolean } | null>(null);

  if (result?.ok) {
    return (
      <span className={`${s.badge} ${s.badgeSuccess}`}>
        {result.redirected ? 'Sent (test mode)' : 'Sent ✓'}
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={() =>
          startTransition(async () => setResult(await actionSendOutreach(leadId)))
        }
        disabled={isPending}
        className={s.btnPrimary}
      >
        {isPending ? 'Sending…' : 'Send Now'}
      </button>
      {result && !result.ok && (
        <div className={s.errorInline}>{result.reason}</div>
      )}
    </div>
  );
}
