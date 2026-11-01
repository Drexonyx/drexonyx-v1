// DR-0130: English version of MDA Sales Agent chat — /en/chat/mda-sales
// Renders ChatPage with the mda-sales-en client config (English UI + LTR).
// The Arabic version at /chat/mda-sales is NOT affected.

import { notFound } from 'next/navigation';
import { getClient } from '@/lib/chatbot/clients';
import '@/lib/chatbot/social-seller';
import ChatPage from '@/app/chat/[slug]/ChatPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Smart Sales Bot — MDA | Master Digital Agency',
  description:
    'AI sales assistant for your business in the UAE. Available 24/7 to answer customer inquiries, showcase your services, and convert conversations into sales. AED 299/month.',
  openGraph: {
    title: 'Smart Sales Bot — MDA | Master Digital Agency',
    description: 'AI-powered sales bot — custom-trained on your business. AED 299/month.',
    type: 'website',
  },
};

export default function EnMdaSalesPage() {
  const client = getClient('mda-sales-en');
  if (!client || client.active === false) notFound();

  return (
    <ChatPage
      clientId="mda-sales-en"
      businessName={client.name}
      headerName={client.headerName}
      logoUrl={client.logoUrl}
      theme={client.theme}
      welcomeMessage={client.welcomeMessage}
      heroBg={client.heroBg}
      heroTagline={client.heroTagline}
      heroTitle={client.heroTitle}
      heroHighlight={client.heroHighlight}
      heroSubtitle={client.heroSubtitle}
      heroFeatures={client.heroFeatures}
      heroStyle={client.heroStyle}
      heroCta={client.heroCta}
      categories={client.categories}
      inputPlaceholder={client.inputPlaceholder}
      waNumber={client.waNumber}
      lang="en"
      langSwitchHref="/chat/mda-sales"
    />
  );
}
