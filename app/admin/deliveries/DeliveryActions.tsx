'use client';

import { useState, useTransition } from 'react';
import {
  actionCreateDelivery,
  actionSendDelivery,
  actionCompleteDelivery,
  actionFailDelivery,
  actionCancelDelivery,
} from './actions';
import s from '../admin.module.css';

type Order = { id: string; status: string };
type Asset = { id: string; order_id: string; name: string | null; status: string };

interface DeliveryActionsProps {
  // When deliveryId is set: row-level actions for an existing delivery
  deliveryId?: string;
  deliveryStatus?: string;
  // Always required for create form context
  orders: Order[];
  assets: Asset[];
}

export function DeliveryActions({ deliveryId, deliveryStatus, orders, assets }: DeliveryActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFailForm, setShowFailForm] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [failureReason, setFailureReason] = useState('');

  const orderAssets = assets.filter((a) => a.order_id === selectedOrderId);

  function handleError(reason: string) {
    setError(reason);
  }

  // Row-level actions for an existing delivery
  if (deliveryId && deliveryStatus) {
    return (
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {error && <span style={{ color: 'var(--drex-danger)', fontSize: '0.75rem' }}>{error}</span>}
        {deliveryStatus === 'PREPARING' && (
          <button
            className={s.btnSmall}
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const r = await actionSendDelivery(deliveryId);
                if (!r.ok) handleError(r.reason ?? 'Failed');
              });
            }}
          >
            Send
          </button>
        )}
        {deliveryStatus === 'SENDING' && (
          <>
            <button
              className={s.btnSmall}
              disabled={isPending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const r = await actionCompleteDelivery(deliveryId);
                  if (!r.ok) handleError(r.reason ?? 'Failed');
                });
              }}
            >
              Complete
            </button>
            {!showFailForm ? (
              <button
                className={`${s.btnSmall} ${s.btnDanger}`}
                disabled={isPending}
                onClick={() => setShowFailForm(true)}
              >
                Fail
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <input
                  className={s.input}
                  placeholder="Failure reason"
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
                />
                <button
                  className={`${s.btnSmall} ${s.btnDanger}`}
                  disabled={isPending || !failureReason.trim()}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const r = await actionFailDelivery(deliveryId, failureReason);
                      if (!r.ok) handleError(r.reason ?? 'Failed');
                      else setShowFailForm(false);
                    });
                  }}
                >
                  Confirm
                </button>
                <button className={s.btnSmall} onClick={() => setShowFailForm(false)}>Cancel</button>
              </div>
            )}
          </>
        )}
        {(deliveryStatus === 'PREPARING' || deliveryStatus === 'SENDING') && (
          <button
            className={`${s.btnSmall} ${s.btnDanger}`}
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const r = await actionCancelDelivery(deliveryId);
                if (!r.ok) handleError(r.reason ?? 'Failed');
              });
            }}
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  // Top-level create form
  return (
    <div>
      {!showCreateForm ? (
        <button className={s.btn} onClick={() => setShowCreateForm(true)}>
          + New Delivery
        </button>
      ) : (
        <div className={s.formCard}>
          <h3 className={s.formTitle}>Create Delivery</h3>
          {error && <div className={s.formError}>{error}</div>}

          <div className={s.formRow}>
            <label className={s.label}>Order</label>
            <select
              className={s.select}
              value={selectedOrderId}
              onChange={(e) => {
                setSelectedOrderId(e.target.value);
                setSelectedAssetIds([]);
              }}
            >
              <option value="">— select order —</option>
              {orders.filter((o) => o.status === 'ACTIVE').map((o) => (
                <option key={o.id} value={o.id}>{o.id.slice(0, 8)}… (ACTIVE)</option>
              ))}
            </select>
          </div>

          {selectedOrderId && orderAssets.length > 0 && (
            <div className={s.formRow}>
              <label className={s.label}>Assets</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {orderAssets.map((a) => (
                  <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedAssetIds.includes(a.id)}
                      onChange={(e) => {
                        setSelectedAssetIds(
                          e.target.checked
                            ? [...selectedAssetIds, a.id]
                            : selectedAssetIds.filter((id) => id !== a.id),
                        );
                      }}
                    />
                    {a.name ?? a.id.slice(0, 8) + '…'} ({a.status})
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedOrderId && orderAssets.length === 0 && (
            <p style={{ fontSize: '0.875rem', color: 'var(--drex-text-muted)' }}>No assets found for this order.</p>
          )}

          <div className={s.formActions}>
            <button
              className={s.btn}
              disabled={isPending || !selectedOrderId || selectedAssetIds.length === 0}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const r = await actionCreateDelivery(selectedOrderId, selectedAssetIds);
                  if (r.ok) {
                    setShowCreateForm(false);
                    setSelectedOrderId('');
                    setSelectedAssetIds([]);
                  } else {
                    handleError(r.reason ?? 'Failed');
                  }
                });
              }}
            >
              {isPending ? 'Creating…' : 'Create Delivery'}
            </button>
            <button className={s.btnSecondary} onClick={() => { setShowCreateForm(false); setError(null); }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
