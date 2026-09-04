'use client';

import { useState, useTransition } from 'react';
import { actionSendQuote } from './actions';
import s from '../admin.module.css';

interface SendQuoteButtonProps {
  quoteId: string;
}

export function SendQuoteButton({ quoteId }: SendQuoteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; reason?: string } | null>(null);

  if (result?.ok) {
    return <span className={`${s.badge} ${s.badgeSuccess}`}>Sent</span>;
  }

  function handleClick() {
    startTransition(async () => {
      const res = await actionSendQuote(quoteId);
      setResult(res);
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className={s.btnPrimary}
      >
        {isPending ? 'Sending…' : 'Send Quote'}
      </button>
      {result && !result.ok && (
        <div className={s.errorInline}>{result.reason}</div>
      )}
    </div>
  );
}
