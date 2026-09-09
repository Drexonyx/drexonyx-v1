'use client';

import { useState, useTransition } from 'react';
import { actionCreateApproval, actionCancelApproval } from './actions';
import s from '../admin.module.css';

type Order = { id: string; status: string };
type Asset = { id: string; order_id: string; name: string | null; status: string };

interface ApprovalActionsProps {
  // Row-level cancel action
  approvalId?: string;
  approvalStatus?: string;
  // Top-level create form data
  orders: Order[];
  assets: Asset[];
}

export function ApprovalActions({ approvalId, approvalStatus, orders, assets }: ApprovalActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [targetType, setTargetType] = useState<'ASSET' | 'QUOTE'>('ASSET');
  const [targetId, setTargetId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const orderAssets = assets.filter(
    (a) => a.order_id === orderId && a.status === 'CLIENT_PREVIEW',
  );

  // Row-level cancel
  if (approvalId && approvalStatus) {
    if (approvalStatus !== 'PENDING') return null;
    return (
      <div>
        {error && <span style={{ color: 'var(--drex-danger)', fontSize: '0.75rem', display: 'block' }}>{error}</span>}
        <button
          className={`${s.btnSmall} ${s.btnDanger}`}
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const r = await actionCancelApproval(approvalId);
              if (!r.ok) setError(r.reason ?? 'Failed');
            });
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  // Top-level create form
  if (!showForm) {
    return (
      <button className={s.btn} onClick={() => setShowForm(true)}>
        + New Approval
      </button>
    );
  }

  return (
    <div className={s.formCard}>
      <h3 className={s.formTitle}>Create Approval</h3>
      {error && <div className={s.formError}>{error}</div>}

      <div className={s.formRow}>
        <label className={s.label}>Order</label>
        <select
          className={s.select}
          value={orderId}
          onChange={(e) => {
            setOrderId(e.target.value);
            setTargetId('');
          }}
        >
          <option value="">— select order —</option>
          {orders.filter((o) => o.status === 'ACTIVE').map((o) => (
            <option key={o.id} value={o.id}>{o.id.slice(0, 8)}… (ACTIVE)</option>
          ))}
        </select>
      </div>

      <div className={s.formRow}>
        <label className={s.label}>Target Type</label>
        <select
          className={s.select}
          value={targetType}
          onChange={(e) => {
            setTargetType(e.target.value as 'ASSET' | 'QUOTE');
            setTargetId('');
          }}
        >
          <option value="ASSET">ASSET</option>
          <option value="QUOTE">QUOTE</option>
        </select>
      </div>

      {targetType === 'ASSET' && orderId && (
        <div className={s.formRow}>
          <label className={s.label}>Asset (CLIENT_PREVIEW only)</label>
          <select className={s.select} value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">— select asset —</option>
            {orderAssets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name ?? a.id.slice(0, 8) + '…'} (CLIENT_PREVIEW)
              </option>
            ))}
          </select>
          {orderId && orderAssets.length === 0 && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--drex-text-muted)', marginTop: '0.25rem' }}>
              No assets in CLIENT_PREVIEW for this order.
            </p>
          )}
        </div>
      )}

      {targetType === 'QUOTE' && (
        <div className={s.formRow}>
          <label className={s.label}>Quote ID</label>
          <input
            className={s.input}
            placeholder="Quote UUID"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          />
        </div>
      )}

      <div className={s.formRow}>
        <label className={s.label}>Expires At (optional)</label>
        <input
          className={s.input}
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>

      <div className={s.formActions}>
        <button
          className={s.btn}
          disabled={isPending || !orderId || !targetId}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const r = await actionCreateApproval(
                orderId,
                targetType,
                targetId,
                expiresAt || undefined,
              );
              if (r.ok) {
                setShowForm(false);
                setOrderId('');
                setTargetId('');
                setExpiresAt('');
              } else {
                setError(r.reason ?? 'Failed');
              }
            });
          }}
        >
          {isPending ? 'Creating…' : 'Create Approval'}
        </button>
        <button className={s.btnSecondary} onClick={() => { setShowForm(false); setError(null); }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
