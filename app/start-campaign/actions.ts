'use server';

import { db } from '@/db/index';
import { inquiries } from '@/db/schema/commercial';
import { sendBriefNotificationEmail } from '@/lib/email/brief-notification';

export type SubmitBriefState =
  | { status: 'idle' }
  | { status: 'success'; inquiryId: string }
  | { status: 'error'; error: string };

export async function submitBrief(
  _prev: SubmitBriefState,
  formData: FormData,
): Promise<SubmitBriefState> {
  const brandName = formData.get('brand-name');
  const contactEmail = formData.get('contact-email');
  const website = formData.get('website');
  const campaignObjective = formData.get('campaign-objective');
  const targetAudience = formData.get('target-audience');
  const additionalInfo = formData.get('additional-info');
  const creativeTypes = formData.getAll('creative-types').join(', ') || null;
  const platforms = formData.getAll('platforms').join(', ') || null;

  if (!brandName || typeof brandName !== 'string' || brandName.trim() === '') {
    return { status: 'error', error: 'Brand name is required.' };
  }
  if (
    !contactEmail ||
    typeof contactEmail !== 'string' ||
    !contactEmail.includes('@') ||
    contactEmail.trim() === ''
  ) {
    return { status: 'error', error: 'A valid contact email is required.' };
  }
  if (
    !campaignObjective ||
    typeof campaignObjective !== 'string' ||
    campaignObjective.trim() === ''
  ) {
    return { status: 'error', error: 'Campaign objective is required.' };
  }

  const cleanWebsite =
    typeof website === 'string' && website.trim() ? website.trim() : null;
  const cleanAudience =
    typeof targetAudience === 'string' && targetAudience.trim()
      ? targetAudience.trim()
      : null;
  const cleanNotes =
    typeof additionalInfo === 'string' && additionalInfo.trim()
      ? additionalInfo.trim()
      : null;

  try {
    const [inserted] = await db
      .insert(inquiries)
      .values({
        brand_name: brandName.trim(),
        contact_email: contactEmail.trim(),
        website: cleanWebsite,
        campaign_objective: campaignObjective.trim(),
        target_audience: cleanAudience,
        creative_types: creativeTypes,
        platforms,
        additional_notes: cleanNotes,
      })
      .returning({ id: inquiries.id });

    // Best-effort admin notification — never blocks the success response.
    sendBriefNotificationEmail({
      inquiryId: inserted.id,
      brandName: brandName.trim(),
      contactEmail: contactEmail.trim(),
      website: cleanWebsite,
      campaignObjective: campaignObjective.trim(),
      targetAudience: cleanAudience,
      creativeTypes,
      platforms,
      additionalNotes: cleanNotes,
    }).catch(() => undefined);

    return { status: 'success', inquiryId: inserted.id };
  } catch {
    return {
      status: 'error',
      error: 'Submission failed. Please try again or contact us directly at drexonyx.studio@gmail.com.',
    };
  }
}
