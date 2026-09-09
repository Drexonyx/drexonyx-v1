'use client';

import { useState } from 'react';

export function DeliveryDownloadButton({ assetId, label }: { assetId: string; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${assetId}/url`);
      if (!res.ok) {
        setError('Failed to get download link');
        return;
      }
      const data = (await res.json()) as { url: string };
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Failed to get download link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
      <button
        onClick={handleDownload}
        disabled={loading}
        style={{
          background: 'var(--drex-accent)',
          color: '#000',
          border: 'none',
          borderRadius: '4px',
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        {loading ? 'Loading…' : (label ?? 'Download')}
      </button>
      {error && (
        <span style={{ fontSize: '0.75rem', color: '#f87171' }}>{error}</span>
      )}
    </span>
  );
}
