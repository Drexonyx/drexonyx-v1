'use client';

import { useState, useTransition } from 'react';
import { actionPortalBuyCredits } from './actions';
import type { CreditPackageRow } from '@/lib/credits/packages';
import s from '../../portal.module.css';

interface Props {
  pkg: CreditPackageRow;
}

function formatAed(aed: string): string {
  const n = parseFloat(aed);
  return `AED ${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function PayConfirmForm({ pkg }: Props) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      const result = await actionPortalBuyCredits(pkg.id);
      if (result && !result.ok) setErrorMsg(result.reason);
    });
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Confirm credit purchase">
      <div className={s.payRedirectCard}>
        <p className={s.payRedirectPackage}>{pkg.name}</p>
        <p className={s.payRedirectAmount}>{formatAed(pkg.price_aed)}</p>
        {errorMsg && (
          <div className={s.errorBanner} role="alert">
            {errorMsg}
          </div>
        )}
        <button type="submit" className={s.primaryBtn} disabled={isPending}>
          {isPending ? 'Redirecting to payment…' : 'Complete Payment'}
        </button>
      </div>
    </form>
  );
}
