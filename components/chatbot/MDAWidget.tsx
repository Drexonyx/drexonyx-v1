'use client';

import { useState, useCallback } from 'react';

export default function MDAWidget() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen(v => !v), []);

  return (
    <>
      {/* Floating chat button */}
      <button
        onClick={toggle}
        aria-label={open ? 'Close chat' : 'Chat with MDA'}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #b8952a 0%, #d4af37 100%)',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.45)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.35)';
        }}
      >
        {open ? (
          // Close icon
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M4 4L18 18M18 4L4 18" stroke="#0f0f14" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        ) : (
          // Chat bubble icon
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <path
              d="M13 2C7.48 2 3 6.26 3 11.5c0 2.36.9 4.52 2.38 6.15L4 22l4.56-1.34A10.2 10.2 0 0013 21c5.52 0 10-4.26 10-9.5S18.52 2 13 2z"
              fill="#0f0f14"
            />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '92px',
            right: '24px',
            zIndex: 9998,
            width: 'min(420px, calc(100vw - 32px))',
            height: 'min(620px, calc(100vh - 120px))',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            border: '1px solid rgba(184,149,42,0.25)',
          }}
        >
          <iframe
            src="/chat/mda"
            title="MDA Business Assistant"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        </div>
      )}
    </>
  );
}
