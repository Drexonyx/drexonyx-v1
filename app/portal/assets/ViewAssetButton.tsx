'use client';

import { useState, useTransition } from 'react';

interface Props {
  assetId: string;
}

export function ViewAssetButton({ assetId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleView() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/assets/${encodeURIComponent(assetId)}/url`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? `Request failed (${res.status})`);
          return;
        }
        const { url } = await res.json();
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch {
        setError('Unable to load asset. Please try again.');
      }
    });
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.25rem' }}>
      <button
        onClick={handleView}
        disabled={isPending}
        style={{
          fontSize: '0.75rem',
          padding: '0.2rem 0.5rem',
          cursor: isPending ? 'wait' : 'pointer',
          color: 'var(--drex-accent)',
          background: 'none',
          border: '1px solid var(--drex-accent)',
          borderRadius: '4px',
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? 'Loading…' : 'View'}
      </button>
      {error && (
        <span style={{ fontSize: '0.7rem', color: 'var(--drex-danger, #e53e3e)' }}>
          {error}
        </span>
      )}
    </span>
  );
}
