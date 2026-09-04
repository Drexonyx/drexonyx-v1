'use client';

import { useState, useTransition } from 'react';
import { actionAcceptQuote } from './actions';
import s from '../portal.module.css';

export function AcceptQuoteButton({ quoteId }: { quoteId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await actionAcceptQuote(quoteId);
      if (result && !result.ok) {
        setError(result.reason);
      }
    });
  }

  return (
    <span>
      <button
        className={s.btnPrimary}
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? 'Accepting…' : 'Accept Quote'}
      </button>
      {error && <span className={s.errorInline}>{error}</span>}
    </span>
  );
}
