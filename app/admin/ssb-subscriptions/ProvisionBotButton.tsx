'use client';

import { useState, useTransition } from 'react';
import { actionProvisionBot } from '../social-seller/actions';
import s from '../admin.module.css';

export function ProvisionBotButton({ subscriptionId }: { subscriptionId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    ok: boolean;
    botUrl?: string;
    reason?: string;
  } | null>(null);

  if (result?.ok && result.botUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <span className={`${s.badge} ${s.badgeSuccess}`}>Bot provisioned ✓</span>
        <a
          href={result.botUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '0.75rem', color: 'var(--drex-accent)' }}
        >
          {result.botUrl} ↗
        </a>
        <span style={{ fontSize: '0.7rem', color: 'var(--drex-text-secondary)' }}>
          Send this URL to the client via WhatsApp
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
          startTransition(async () => setResult(await actionProvisionBot(subscriptionId)))
        }
      >
        {isPending ? 'Provisioning…' : '⚙ Provision Bot'}
      </button>
      {result && !result.ok && <div className={s.errorInline}>{result.reason}</div>}
    </div>
  );
}
