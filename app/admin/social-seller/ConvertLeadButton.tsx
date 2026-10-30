'use client';

import { useState, useTransition } from 'react';
import { actionCreateSubscription } from './actions';
import s from '../admin.module.css';

interface Props {
  leadId: string;
  defaultSlug: string;
}

export function ConvertLeadButton({ leadId, defaultSlug }: Props) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(defaultSlug);
  const [result, setResult] = useState<{ ok: boolean; id?: string; reason?: string } | null>(null);

  if (result?.ok) {
    return <span className={`${s.badge} ${s.badgeSuccess}`}>Subscription created ✓</span>;
  }

  if (!open) {
    return (
      <button className={s.btnSecondary} onClick={() => setOpen(true)}>
        + Subscription
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 180 }}>
      <input
        className={s.input}
        style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
        placeholder="merchant-slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        disabled={isPending}
      />
      <div style={{ display: 'flex', gap: '0.35rem' }}>
        <button
          className={s.btnPrimary}
          disabled={isPending || !slug.trim()}
          onClick={() =>
            startTransition(async () =>
              setResult(await actionCreateSubscription(leadId, slug)),
            )
          }
        >
          {isPending ? 'Creating…' : 'Confirm'}
        </button>
        <button className={s.btnSmall} onClick={() => setOpen(false)} disabled={isPending}>
          ✕
        </button>
      </div>
      {result && !result.ok && <div className={s.errorInline}>{result.reason}</div>}
    </div>
  );
}
