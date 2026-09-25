'use client';

import { useState, useTransition } from 'react';
import { actionPortalBuyCredits } from './actions';
import type { CreditPackageRow } from '@/lib/credits/packages';
import s from '../../portal.module.css';

interface Props {
  packages: CreditPackageRow[];
  organizationId: string;
}

function formatCredits(n: number): string {
  return n.toLocaleString('en-US');
}

function formatAed(aed: string): string {
  const n = parseFloat(aed);
  return `AED ${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function PortalCreditBuyForm({ packages }: Props) {
  const [selectedId, setSelectedId] = useState<string>(packages[0]?.id ?? '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = packages.find((p) => p.id === selectedId) ?? packages[0];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedId) return;
    setErrorMsg(null);

    startTransition(async () => {
      const result = await actionPortalBuyCredits(selectedId);
      if (result && !result.ok) setErrorMsg(result.reason);
    });
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Buy credit package">
      <div className={s.creditPackageGrid}>
        {packages.map((pkg) => (
          <label
            key={pkg.id}
            className={[
              s.creditPackageCard,
              selectedId === pkg.id ? s.creditPackageCardSelected : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <input
              type="radio"
              name="credit_package"
              value={pkg.id}
              checked={selectedId === pkg.id}
              onChange={() => setSelectedId(pkg.id)}
              className={s.srOnly}
            />
            <div className={s.creditPackageName}>{pkg.name}</div>
            <div className={s.creditPackageCredits}>{formatCredits(pkg.credits)}</div>
            <div className={s.creditPackageCreditsLabel}>credits</div>
            <div className={s.creditPackagePrice}>{formatAed(pkg.price_aed)}</div>
          </label>
        ))}
      </div>

      {selected && (
        <div className={s.creditConfirmRow}>
          <span className={s.creditConfirmLabel}>
            {formatCredits(selected.credits)} credits for {formatAed(selected.price_aed)}
          </span>
        </div>
      )}

      {errorMsg && (
        <div className={s.errorBanner} role="alert">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        className={s.primaryBtn}
        disabled={isPending || !selectedId}
      >
        {isPending ? 'Redirecting to payment…' : 'Proceed to Payment'}
      </button>
    </form>
  );
}
