'use client';

import { useState, useTransition } from 'react';
import { actionCreateCheckout } from '../payments/actions';
import s from '../portal.module.css';

export function PayNowButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await actionCreateCheckout(orderId);
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
        {isPending ? 'Redirecting…' : 'Pay Now'}
      </button>
      {error && <span className={s.errorInline}>{error}</span>}
    </span>
  );
}
