'use client';

import { useState, useTransition } from 'react';
import { actionInitiateCheckout } from './actions';
import type { Package } from '@/lib/pricing';
import styles from './page.module.css';

interface Props {
  selectedPackage: Package;
}

export default function CheckoutForm({ selectedPackage }: Props) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const result = await actionInitiateCheckout(selectedPackage.id);
      // redirect() throws NEXT_REDIRECT — only an error result reaches here
      if (result && !result.ok) {
        setErrorMsg(result.reason);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.paymentCard} aria-label="Payment details">
      <h2 className={styles.paymentHeading}>Payment</h2>

      {errorMsg && (
        <div className={styles.paymentError} role="alert">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        className={styles.proceedBtn}
        disabled={isPending}
      >
        {isPending ? 'Redirecting to payment…' : 'Proceed to Payment'}
      </button>
    </form>
  );
}
