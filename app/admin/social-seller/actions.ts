'use server';
// DR-0130: SSB admin server actions — Stages 5 & 6: payment + provisioning.
// Node.js runtime required (Drizzle). Called from Client Components in the admin panel.

import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db, ssbSchema } from '@/db';
import { eq } from 'drizzle-orm';
import { registerClient } from '@/lib/chatbot/clients';
import { buildSellerClient } from '@/lib/chatbot/social-seller/builder';
import type { SocialSellerConfig } from '@/lib/chatbot/social-seller/types';
import {
  createZiinaPaymentIntent,
  getZiinaPaymentIntent,
  ZIINA_STATUS_SUCCESS,
  ZIINA_STATUS_FAILED,
  ZIINA_STATUS_CANCELLED,
} from '@/lib/ziina';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'https://drexonyx.com';
}

function currentPeriodMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ── Create Subscription ────────────────────────────────────────────────────
export async function actionCreateSubscription(
  leadId: string,
  merchantSlug: string,
): Promise<{ ok: boolean; id?: string; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const slug = merchantSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!slug) return { ok: false, reason: 'Merchant slug is required' };
  if (!leadId) return { ok: false, reason: 'Lead ID is required' };

  // Fetch lead
  const [lead] = await db
    .select()
    .from(ssbSchema.ssbLeads)
    .where(eq(ssbSchema.ssbLeads.id, leadId))
    .limit(1);

  if (!lead) return { ok: false, reason: 'Lead not found' };

  try {
    const [sub] = await db
      .insert(ssbSchema.ssbSubscriptions)
      .values({
        merchant_slug: slug,
        business_name: lead.business_name,
        business_type: lead.business_type ?? null,
        contact_whatsapp: lead.contact_whatsapp,
        lead_id: leadId,
        active: false,
      })
      .returning({ id: ssbSchema.ssbSubscriptions.id });

    revalidatePath('/admin/social-seller');
    revalidatePath('/admin/ssb-subscriptions');
    return { ok: true, id: sub.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('unique')) return { ok: false, reason: `Slug "${slug}" already in use` };
    return { ok: false, reason: msg };
  }
}

// ── Create Ziina Payment ───────────────────────────────────────────────────
export async function actionCreatePayment(
  subscriptionId: string,
): Promise<{ ok: boolean; redirectUrl?: string; paymentId?: string; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const [sub] = await db
    .select()
    .from(ssbSchema.ssbSubscriptions)
    .where(eq(ssbSchema.ssbSubscriptions.id, subscriptionId))
    .limit(1);

  if (!sub) return { ok: false, reason: 'Subscription not found' };

  const periodMonth = currentPeriodMonth();
  const base = getBaseUrl();

  let intent;
  try {
    intent = await createZiinaPaymentIntent({
      amount: sub.monthly_amount_fils,
      success_url: `${base}/ssb/payment/success?sub=${sub.merchant_slug}`,
      cancel_url: `${base}/ssb/payment/cancel?sub=${sub.merchant_slug}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `Ziina error: ${msg}` };
  }

  try {
    const [payment] = await db
      .insert(ssbSchema.ssbPayments)
      .values({
        subscription_id: subscriptionId,
        ziina_payment_id: intent.id,
        amount_fils: sub.monthly_amount_fils,
        status: 'PENDING',
        period_month: periodMonth,
        redirect_url: intent.redirect_url,
      })
      .returning({ id: ssbSchema.ssbPayments.id });

    revalidatePath('/admin/ssb-subscriptions');
    return { ok: true, redirectUrl: intent.redirect_url, paymentId: payment.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: msg };
  }
}

// ── Check Payment Status ───────────────────────────────────────────────────
export async function actionCheckPayment(
  paymentId: string,
): Promise<{ ok: boolean; status?: string; activated?: boolean; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const [payment] = await db
    .select()
    .from(ssbSchema.ssbPayments)
    .where(eq(ssbSchema.ssbPayments.id, paymentId))
    .limit(1);

  if (!payment) return { ok: false, reason: 'Payment not found' };

  let intent;
  try {
    intent = await getZiinaPaymentIntent(payment.ziina_payment_id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `Ziina error: ${msg}` };
  }

  const newStatus =
    intent.status === ZIINA_STATUS_SUCCESS
      ? 'COMPLETED'
      : intent.status === ZIINA_STATUS_FAILED
        ? 'FAILED'
        : intent.status === ZIINA_STATUS_CANCELLED
          ? 'CANCELLED'
          : payment.status;

  if (newStatus !== payment.status) {
    await db
      .update(ssbSchema.ssbPayments)
      .set({ status: newStatus, updated_at: new Date() })
      .where(eq(ssbSchema.ssbPayments.id, paymentId));
  }

  let activated = false;
  if (newStatus === 'COMPLETED') {
    await db
      .update(ssbSchema.ssbSubscriptions)
      .set({ active: true, activated_at: new Date(), updated_at: new Date() })
      .where(eq(ssbSchema.ssbSubscriptions.id, payment.subscription_id));
    activated = true;
  }

  revalidatePath('/admin/ssb-subscriptions');
  return { ok: true, status: newStatus, activated };
}

// ── Provision Bot (Stage 6) ────────────────────────────────────────────────
// Generates a SocialSellerConfig from subscription data, stores in ssb_bot_configs,
// marks QC + delivered, registers in-memory for the current process.
export async function actionProvisionBot(
  subscriptionId: string,
): Promise<{ ok: boolean; botUrl?: string; reason?: string }> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const [sub] = await db
    .select()
    .from(ssbSchema.ssbSubscriptions)
    .where(eq(ssbSchema.ssbSubscriptions.id, subscriptionId))
    .limit(1);

  if (!sub) return { ok: false, reason: 'Subscription not found' };
  if (!sub.active) return { ok: false, reason: 'Subscription is not yet active (payment not confirmed)' };

  // Check if already provisioned
  const existing = await db
    .select({ id: ssbSchema.ssbBotConfigs.id })
    .from(ssbSchema.ssbBotConfigs)
    .where(eq(ssbSchema.ssbBotConfigs.subscription_id, subscriptionId))
    .limit(1);

  if (existing.length > 0) {
    return { ok: false, reason: 'Bot already provisioned for this subscription' };
  }

  // Build the SocialSellerConfig from subscription data
  const waNumber = sub.contact_whatsapp.replace(/\D/g, '');
  const config: SocialSellerConfig = {
    slug: sub.merchant_slug,
    name: sub.business_name,
    headerName: sub.business_name,
    businessType: sub.business_type ?? undefined,
    language: 'both',
    waNumber,
    theme: 'dark',
    welcomeMessage: `أهلاً بك في {{GOLD:${sub.business_name}}}.\nكيف يمكنني مساعدتك اليوم؟`,
    heroTagline: sub.business_type ?? 'Social Seller Bot',
    heroTitle: 'أهلاً بك في',
    heroHighlight: sub.business_name,
    heroSubtitle: 'اكتب رسالتك وسنساعدك على الفور.',
    inputPlaceholder: 'اكتب رسالتك...',
    active: true,
    activatedAt: sub.activated_at ?? new Date(),
    planName: sub.plan_name,
    ownerContact: sub.contact_whatsapp,
  };

  // QC: validate minimum required fields
  const qcErrors: string[] = [];
  if (!config.slug) qcErrors.push('Missing slug');
  if (!config.name) qcErrors.push('Missing business name');
  if (!config.waNumber || config.waNumber.length < 10) qcErrors.push('Invalid WhatsApp number');

  if (qcErrors.length > 0) {
    return { ok: false, reason: `QC failed: ${qcErrors.join(', ')}` };
  }

  const now = new Date();
  try {
    await db.insert(ssbSchema.ssbBotConfigs).values({
      subscription_id: subscriptionId,
      merchant_slug: sub.merchant_slug,
      config_json: config as unknown as Record<string, unknown>,
      qc_passed_at: now,
      delivered_at: now,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `DB error: ${msg}` };
  }

  // Register in-memory for the current process instance
  const client = buildSellerClient(config);
  registerClient(sub.merchant_slug, client);

  revalidatePath('/admin/ssb-subscriptions');

  const base = getBaseUrl();
  return { ok: true, botUrl: `${base}/chat/${sub.merchant_slug}` };
}
