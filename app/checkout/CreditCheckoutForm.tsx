'use client';

import { useState, useTransition } from 'react';
import { actionInitiateCheckout } from './actions';
import type { CreditPackageRow } from '@/lib/credits/packages';
import styles from './page.module.css';

interface Props {
  packages: CreditPackageRow[];
  preSelectedId: string | null;
}

function formatCredits(n: number): string {
  return n.toLocaleString('en-US');
}

function formatAed(aed: string): string {
  const n = parseFloat(aed);
  return `AED ${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function CreditCheckoutForm({ packages, preSelectedId }: Props) {
  const [selectedId, setSelectedId] = useState<string>(
    preSelectedId ?? packages[0]?.id ?? '',
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = packages.find((p) => p.id === selectedId) ?? packages[0];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedId) return;
    setErrorMsg(null);

    startTransition(async () => {
      const result = await actionInitiateCheckout(selectedId);
      if (result && !result.ok) {
        setErrorMsg(result.reason);
      }
    });
  }

  return (
    <div className={styles.checkoutLayout}>
      <div className={styles.orderCard}>
        <h2 className={styles.orderHeading}>Select a Credit Package</h2>
        <div role="radiogroup" aria-label="Credit packages" className={styles.pkgList ?? ''}>
          {packages.map((pkg) => (
            <label
              key={pkg.id}
              className={[
                styles.pkgOption,
                selectedId === pkg.id ? styles.pkgOptionSelected : '',
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
                className={styles.pkgRadio}
              />
              <span className={styles.pkgName}>{pkg.name}</span>
              <span className={styles.pkgCredits}>{formatCredits(pkg.credits)} credits</span>
              <span className={styles.pkgPrice}>{formatAed(pkg.price_aed)}</span>
            </label>
          ))}
        </div>

        {selected && (
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalPrice}>{formatAed(selected.price_aed)}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className={styles.paymentCard} aria-label="Confirm purchase">
        <h2 className={styles.paymentHeading}>Confirm</h2>

        {selected && (
          <div className={styles.confirmSummary}>
            <p className={styles.confirmLine}>
              <span>Package</span>
              <strong>{selected.name}</strong>
            </p>
            <p className={styles.confirmLine}>
              <span>Credits</span>
              <strong>{formatCredits(selected.credits)}</strong>
            </p>
            <p className={styles.confirmLine}>
              <span>Amount</span>
              <strong>{formatAed(selected.price_aed)}</strong>
            </p>
          </div>
        )}

        <p className={styles.paymentNote}>
          Credits are added to your account immediately after payment. Use them in the client portal to start productions.
        </p>

        {errorMsg && (
          <div className={styles.paymentError} role="alert">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          className={styles.proceedBtn}
          disabled={isPending || !selectedId}
        >
          {isPending ? 'Redirecting to payment…' : 'Proceed to Payment'}
        </button>
      </form>
    </div>
  );
}
