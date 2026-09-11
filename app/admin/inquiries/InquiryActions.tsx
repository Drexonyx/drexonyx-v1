'use client';

import { useState, useTransition } from 'react';
import { actionMarkInquiryReviewed, actionMarkInquiryDismissed, actionConvertInquiry } from './actions';
import { slugFromName } from '@/lib/admin/slug-utils';
import s from '../admin.module.css';

interface InquiryActionsProps {
  inquiryId: string;
  status: string;
  canAct: boolean;
  brandName: string;
  contactEmail: string;
}

const fieldStyle: React.CSSProperties = {
  padding: '0.375rem 0.5rem',
  borderRadius: '4px',
  border: '1px solid var(--drex-border, #444)',
  background: 'var(--drex-input-bg, transparent)',
  color: 'inherit',
  fontSize: '0.8rem',
  width: '100%',
};

export function InquiryActions({ inquiryId, status, canAct, brandName, contactEmail }: InquiryActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConvertForm, setShowConvertForm] = useState(false);
  const [convertResult, setConvertResult] = useState<{ campaignId: string; temporaryPassword: string } | null>(null);

  if (!canAct) return null;
  if (status === 'CONVERTED') return <span style={{ fontSize: '0.75rem', color: 'var(--drex-text-muted)' }}>Converted</span>;
  if (status === 'DISMISSED') return null;

  const canConvert = status === 'NEW' || status === 'REVIEWED';

  if (convertResult) {
    return (
      <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div style={{ color: 'rgb(34,197,94)', fontWeight: 600 }}>Converted</div>
        <div style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.25)', padding: '0.25rem 0.375rem', borderRadius: '3px', wordBreak: 'break-all' }}>
          pw: {convertResult.temporaryPassword}
        </div>
        <div style={{ opacity: 0.55 }}>Campaign: {convertResult.campaignId.slice(0, 8)}…</div>
      </div>
    );
  }

  if (showConvertForm) {
    return (
      <form
        style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', minWidth: '240px' }}
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const r = await actionConvertInquiry(fd);
            if (r.ok && r.campaignId && r.temporaryPassword) {
              setConvertResult({ campaignId: r.campaignId, temporaryPassword: r.temporaryPassword });
              setShowConvertForm(false);
            } else {
              const msg = r.reason === 'SLUG_TAKEN'
                ? 'Slug already taken — choose another'
                : r.reason === 'EMAIL_TAKEN'
                  ? 'Email already registered'
                  : r.reason === 'ALREADY_CONVERTED'
                    ? 'Already converted'
                    : (r.reason ?? 'Conversion failed');
              setError(msg);
            }
          });
        }}
      >
        <input type="hidden" name="inquiry_id" value={inquiryId} />

        {error && (
          <div style={{ fontSize: '0.75rem', color: 'rgb(239,68,68)' }}>{error}</div>
        )}

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', fontSize: '0.75rem' }}>
          Org Name
          <input name="organization_name" required defaultValue={brandName} disabled={isPending} style={fieldStyle} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', fontSize: '0.75rem' }}>
          Org Slug
          <input name="organization_slug" required defaultValue={slugFromName(brandName)} disabled={isPending} style={fieldStyle} pattern="[a-z0-9-]+" title="Lowercase letters, digits, hyphens" />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', fontSize: '0.75rem' }}>
          Client Email
          <input name="user_email" type="email" required defaultValue={contactEmail} disabled={isPending} style={fieldStyle} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', fontSize: '0.75rem' }}>
          Display Name
          <input name="user_display_name" required defaultValue={brandName} disabled={isPending} style={fieldStyle} />
        </label>

        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button
            type="submit"
            disabled={isPending}
            className={`${s.btnSmall}`}
            style={{ background: 'rgba(34,197,94,0.15)', color: 'rgb(34,197,94)', opacity: isPending ? 0.6 : 1 }}
          >
            {isPending ? '…' : 'Confirm Convert'}
          </button>
          <button
            type="button"
            disabled={isPending}
            className={`${s.btnSmall}`}
            onClick={() => { setShowConvertForm(false); setError(null); }}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', flexWrap: 'wrap' }}>
      {error && (
        <span style={{ color: 'var(--drex-danger)', fontSize: '0.75rem', width: '100%' }}>{error}</span>
      )}
      {status === 'NEW' && (
        <button
          className={`${s.btnSmall}`}
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const r = await actionMarkInquiryReviewed(inquiryId);
              if (!r.ok) setError(r.reason ?? 'Failed');
            });
          }}
        >
          {isPending ? '…' : 'Review'}
        </button>
      )}
      {canConvert && (
        <button
          className={`${s.btnSmall}`}
          disabled={isPending}
          onClick={() => { setError(null); setShowConvertForm(true); }}
          style={{ background: 'rgba(34,197,94,0.12)', color: 'rgb(34,197,94)' }}
        >
          Convert
        </button>
      )}
      <button
        className={`${s.btnSmall} ${s.btnDanger}`}
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await actionMarkInquiryDismissed(inquiryId);
            if (!r.ok) setError(r.reason ?? 'Failed');
          });
        }}
      >
        {isPending ? '…' : 'Dismiss'}
      </button>
    </div>
  );
}
