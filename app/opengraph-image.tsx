import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'DREXONYX — Performance Creative Studio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#060606',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: '"system-ui", "Helvetica Neue", "Arial", sans-serif',
        }}
      >
        {/* Gold top bar */}
        <div style={{ width: '100%', height: '5px', background: '#C8980A', flexShrink: 0 }} />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            padding: '60px 80px 48px',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: '#C8980A',
              textTransform: 'uppercase',
            }}
          >
            Dubai · Performance Creative Studio
          </span>
          <span
            style={{
              fontSize: '84px',
              fontWeight: 900,
              color: '#f4f4f5',
              lineHeight: 1,
              letterSpacing: '-0.04em',
            }}
          >
            DREXONYX
          </span>
          <span
            style={{
              fontSize: '26px',
              fontWeight: 400,
              color: 'rgba(244, 244, 245, 0.5)',
              lineHeight: 1.5,
              maxWidth: '700px',
            }}
          >
            AI-powered UGC advertising for global brands — creative at scale, built to perform.
          </span>
        </div>

        {/* Bottom strip */}
        <div
          style={{
            width: '100%',
            padding: '22px 80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(200, 152, 10, 0.2)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '15px', color: 'rgba(244, 244, 245, 0.3)', letterSpacing: '0.05em' }}>
            drexonyx.com
          </span>
          <span
            style={{
              fontSize: '13px',
              color: 'rgba(200, 152, 10, 0.65)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Performance Creative
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
