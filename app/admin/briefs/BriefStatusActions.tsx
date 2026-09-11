'use client';

import { useTransition, useState } from 'react';
import {
  actionSubmitBrief,
  actionApproveBrief,
  actionRequestBriefRevision,
  actionReturnBriefToDraft,
} from './actions';

type BriefStatus = 'DRAFT' | 'SUBMITTED' | 'REVISION_REQUIRED' | 'APPROVED';

const btnBase: React.CSSProperties = {
  fontSize: '0.75rem',
  padding: '0.25rem 0.625rem',
  borderRadius: '4px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 500,
};

export function BriefStatusActions({
  briefId,
  status,
  canAct,
}: {
  briefId: string;
  status: BriefStatus;
  canAct: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canAct) return null;

  async function act(fn: () => Promise<{ ok: boolean; reason?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.reason ?? 'Error');
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
        {status === 'DRAFT' && (
          <button
            disabled={isPending}
            onClick={() => act(() => actionSubmitBrief(briefId))}
            style={{ ...btnBase, background: 'var(--drex-accent-subtle)', color: 'var(--drex-accent)', opacity: isPending ? 0.6 : 1 }}
          >
            Submit
          </button>
        )}
        {status === 'SUBMITTED' && (
          <>
            <button
              disabled={isPending}
              onClick={() => act(() => actionApproveBrief(briefId))}
              style={{ ...btnBase, background: 'rgba(34,197,94,0.12)', color: 'rgb(34,197,94)', opacity: isPending ? 0.6 : 1 }}
            >
              Approve
            </button>
            <button
              disabled={isPending}
              onClick={() => act(() => actionRequestBriefRevision(briefId))}
              style={{ ...btnBase, background: 'rgba(249,115,22,0.12)', color: 'rgb(249,115,22)', opacity: isPending ? 0.6 : 1 }}
            >
              Request Revision
            </button>
          </>
        )}
        {status === 'APPROVED' && (
          <button
            disabled={isPending}
            onClick={() => act(() => actionRequestBriefRevision(briefId))}
            style={{ ...btnBase, background: 'rgba(249,115,22,0.12)', color: 'rgb(249,115,22)', opacity: isPending ? 0.6 : 1 }}
          >
            Re-open
          </button>
        )}
        {status === 'REVISION_REQUIRED' && (
          <button
            disabled={isPending}
            onClick={() => act(() => actionReturnBriefToDraft(briefId))}
            style={{ ...btnBase, background: 'var(--drex-elevated)', color: 'var(--drex-text-secondary)', opacity: isPending ? 0.6 : 1 }}
          >
            Return to Draft
          </button>
        )}
      </div>
      {error && (
        <div style={{ fontSize: '0.75rem', color: 'rgb(239,68,68)', marginTop: '0.125rem' }}>{error}</div>
      )}
    </div>
  );
}
