import { notFound } from 'next/navigation';
import { getClient } from '@/lib/chatbot/clients';
// DR 0122: Register Social Seller Bot merchants in the Node.js runtime (separate from
// the Edge runtime registration in app/api/chatbot/route.ts — they have independent
// module caches in production and cannot share registered clients).
import '@/lib/chatbot/social-seller';
import ChatPage from './ChatPage';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const client = getClient(slug);
  if (!client) return { title: 'Chat' };
  return {
    title: `${client.name} — مساعد ذكي`,
    description: `تحدث مع مساعد ${client.name} الذكي`,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const client = getClient(slug);

  if (!client) notFound();

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
      categories={client.categories}
      inputPlaceholder={client.inputPlaceholder}
      waNumber={client.waNumber}
    />
  );
}
