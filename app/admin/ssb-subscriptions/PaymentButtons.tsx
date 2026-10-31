'use client';

import { useState, useTransition } from 'react';
import { actionCreatePayment, actionCheckPayment } from '../social-seller/actions';
import s from '../admin.module.css';

// ── Create Payment Button ──────────────────────────────────────────────────
export function CreatePaymentButton({ subscriptionId }: { subscriptionId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    ok: boolean;
    redirectUrl?: string;
    paymentId?: string;
    reason?: string;
  } | null>(null);

  if (result?.ok && result.redirectUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxWidth: 260 }}>
        <span className={`${s.badge} ${s.badgeSuccess}`}>Payment link created ✓</span>
        <a
          href={result.redirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={s.cellMono}
          style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}
        >
          {result.redirectUrl}
        </a>
        <span style={{ fontSize: '0.7rem', color: 'var(--drex-text-secondary)' }}>
          Copy link → send to client via WhatsApp
        </span>
      </div>
    );
  }

  return (
    <div>
      <button
        className={s.btnPrimary}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => setResult(await actionCreatePayment(subscriptionId)))
        }
      >
        {isPending ? 'Creating…' : 'Request Payment'}
      </button>
      {result && !result.ok && <div className={s.errorInline}>{result.reason}</div>}
    </div>
  );
}

// ── Check Payment Button ───────────────────────────────────────────────────
export function CheckPaymentButton({ paymentId }: { paymentId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    ok: boolean;
    status?: string;
    activated?: boolean;
    reason?: string;
  } | null>(null);

  const statusBadge =
    result?.status === 'COMPLETED'
      ? s.badgeSuccess
      : result?.status === 'FAILED' || result?.status === 'CANCELLED'
        ? s.badgeDanger
        : s.badgeNeutral;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <button
        className={s.btnSecondary}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => setResult(await actionCheckPayment(paymentId)))
        }
      >
        {isPending ? 'Checking…' : 'Check Status'}
      </button>
      {result?.ok && result.status && (
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`${s.badge} ${statusBadge}`}>{result.status}</span>
          {result.activated && (
            <span className={`${s.badge} ${s.badgeSuccess}`}>Subscription activated ✓</span>
          )}
        </div>
      )}
      {result && !result.ok && <div className={s.errorInline}>{result.reason}</div>}
    </div>
  );
}
