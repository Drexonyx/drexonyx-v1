'use client';

import { useState, useTransition } from 'react';
import { actionInitiateCheckout } from './actions';
import type { Package } from '@/lib/pricing';
import styles from './page.module.css';

interface Props {
  selectedPackage: Package;
}

export default function CheckoutForm({ selectedPackage }: Props) {
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const result = await actionInitiateCheckout(selectedPackage.id, email);
      // redirect() throws NEXT_REDIRECT — only an error result reaches here
      if (result && !result.ok) {
        setErrorMsg(result.reason);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.paymentCard} aria-label="Payment details">
      <h2 className={styles.paymentHeading}>Payment</h2>

      <div className={styles.paymentField}>
        <label htmlFor="checkout-email" className={styles.paymentLabel}>
          Email address
        </label>
        <input
          id="checkout-email"
          type="email"
          className={styles.paymentInput}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          autoComplete="email"
          disabled={isPending}
        />
        <p className={styles.paymentNote}>
          Your order confirmation and project updates will be sent here.
        </p>
      </div>

      {errorMsg && (
        <div className={styles.paymentError} role="alert">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        className={styles.proceedBtn}
        disabled={isPending || !email}
      >
        {isPending ? 'Redirecting to payment…' : 'Proceed to Payment'}
      </button>
    </form>
  );
}
