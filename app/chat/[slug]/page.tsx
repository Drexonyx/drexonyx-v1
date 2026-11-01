import { notFound } from 'next/navigation';
import { getClient } from '@/lib/chatbot/clients';
// DR 0122: Register Social Seller Bot merchants in the Node.js runtime (separate from
// the Edge runtime registration in app/api/chatbot/route.ts — they have independent
// module caches in production and cannot share registered clients).
import '@/lib/chatbot/social-seller';
// DR-0130 Stage 6: DB fallback for dynamically provisioned SSB bots.
import { getOrLoadDynamicClient } from '@/lib/chatbot/social-seller/db-registry';
import ChatPage from './ChatPage';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const client = getClient(slug) ?? await getOrLoadDynamicClient(slug);
  if (!client || client.active === false) return { title: 'Chat' };
  return {
    title: `${client.name} — مساعد ذكي`,
    description: `تحدث مع مساعد ${client.name} الذكي`,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const client = getClient(slug) ?? await getOrLoadDynamicClient(slug);

  if (!client) notFound();
  if (client.active === false) notFound();

  // mda-sales has an English counterpart at /en/chat/mda-sales
  const langSwitchHref = slug === 'mda-sales' ? '/en/chat/mda-sales' : undefined;

  return (
    <ChatPage
      clientId={slug}
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
      langSwitchHref={langSwitchHref}
    />
  );
}
