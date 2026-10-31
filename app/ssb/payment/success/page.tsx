// DR-0130: Ziina payment success redirect page for SSB customers.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payment Received — Social Seller Bot',
  robots: 'noindex',
};

export default function SsbPaymentSuccessPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#080d1a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      <div style={{ maxWidth: 480 }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: '#fff' }}>
          Payment Received!
        </h1>
        <p style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Thank you — your Social Seller Bot subscription is confirmed. Our team will reach out within 24 hours to set up your bot and deliver your access link.
        </p>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Questions? Contact us on WhatsApp:{' '}
          <a href="https://wa.me/971521770988" style={{ color: '#4f7df7' }}>+971 52 177 0988</a>
        </p>
      </div>
    </main>
  );
}
