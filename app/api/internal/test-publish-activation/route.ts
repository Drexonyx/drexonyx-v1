// TEMPORARY SINGLE-USE: activation test for post 8c8cb876-97ac-4160-b9f1-892b5c2d8786
// DELETE BEFORE PRODUCTION RE-DEPLOY

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { auditEvents } from '@/db/schema/system';
import { eq, and } from 'drizzle-orm';
import { pgSchema, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { qcFacebookPolicyCheckSkill } from '@/lib/skills/qc/facebook-policy-check';
import { facebookPagePublishSkill } from '@/lib/skills/facebook/page-publish';

const TEST_POST_ID = '8c8cb876-97ac-4160-b9f1-892b5c2d8786';
const ORG_ID = '63b642fd-38f6-48ea-b9b1-ca2cbb4c3810';

// Inline social.posts table — not imported from feature branch
const socialSchema = pgSchema('social');
const socialPosts = socialSchema.table('posts', {
  id: uuid('id').primaryKey(),
  organization_id: uuid('organization_id').notNull(),
  page_target: text('page_target').notNull(),
  content_type: text('content_type').notNull(),
  caption: text('caption').notNull(),
  headline: text('headline'),
  media_url: text('media_url'),
  publish_mode: text('publish_mode').notNull(),
  scheduled_at: timestamp('scheduled_at', { withTimezone: true }),
  status: text('status').notNull(),
  campaign_id: text('campaign_id'),
  fb_post_id: text('fb_post_id'),
  fb_page_id: text('fb_page_id'),
  published_at: timestamp('published_at', { withTimezone: true }),
  failure_reason: text('failure_reason'),
  retry_count: integer('retry_count').notNull().default(0),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = process.env.TEST_ACTIVATION_TOKEN?.trim();
  const auth = request.headers.get('authorization');
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Hard lock: only the specific test post in SCHEDULED state
  const [post] = await db
    .select()
    .from(socialPosts)
    .where(
      and(
        eq(socialPosts.id, TEST_POST_ID),
        eq(socialPosts.organization_id, ORG_ID),
        eq(socialPosts.status, 'SCHEDULED'),
      ),
    )
    .limit(1);

  if (!post) {
    return NextResponse.json(
      { error: 'Test post not found or not in SCHEDULED status' },
      { status: 404 },
    );
  }

  // CAS: SCHEDULED → PUBLISHING
  const claimed = await db
    .update(socialPosts)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set({ status: 'PUBLISHING', updated_at: new Date() } as any)
    .where(
      and(
        eq(socialPosts.id, TEST_POST_ID),
        eq(socialPosts.organization_id, ORG_ID),
        eq(socialPosts.status, 'SCHEDULED'),
      ),
    );

  if ((claimed as unknown as { rowCount: number }).rowCount === 0) {
    return NextResponse.json({ error: 'CAS failed — post already claimed' }, { status: 409 });
  }

  const context = {
    organizationId: ORG_ID,
    actorId: 'system-cron',
    actorType: 'AGENT' as const,
    actorRole: 'ADMIN_OPERATIONS' as const,
  };

  async function writeAudit(action: string, payload: Record<string, unknown>) {
    await db.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: ORG_ID,
      entity_type: 'SOCIAL_POST',
      entity_id: TEST_POST_ID,
      actor_id: null,
      actor_role: 'AGENT',
      action,
      payload,
    });
  }

  // Step 1: Facebook policy check (mandatory)
  const policyResult = await qcFacebookPolicyCheckSkill.execute(
    { text: post.caption, placement: 'feed' },
    context,
  );

  await writeAudit('SOCIAL_POST_POLICY_CHECKED', {
    post_id: TEST_POST_ID,
    verdict: policyResult.ok ? policyResult.output.verdict : 'ERROR',
    findings: policyResult.ok ? policyResult.output.findings : [],
  });

  if (!policyResult.ok || policyResult.output.verdict === 'FAIL') {
    const reason = policyResult.ok
      ? `Facebook policy FAIL: ${policyResult.output.findings.join('; ')}`
      : policyResult.error!;
    await db
      .update(socialPosts)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set({ status: 'FAILED', failure_reason: reason, updated_at: new Date() } as any)
      .where(and(eq(socialPosts.id, TEST_POST_ID), eq(socialPosts.status, 'PUBLISHING')));
    await writeAudit('SOCIAL_POST_POLICY_FAILED', { post_id: TEST_POST_ID, reason });
    return NextResponse.json({ status: 'FAILED', stage: 'policy', reason });
  }

  // Step 2: Publish to Facebook via existing skill
  const publishResult = await facebookPagePublishSkill.execute(
    {
      pageTarget: post.page_target as 'PAGE_1' | 'PAGE_2',
      contentType: post.content_type as 'TEXT' | 'IMAGE' | 'VIDEO',
      message: post.caption,
      publishMode: 'IMMEDIATE',
      campaignId: post.campaign_id ?? TEST_POST_ID,
    },
    context,
  );

  if (!publishResult.ok) {
    await db
      .update(socialPosts)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set({
        status: 'FAILED',
        failure_reason: publishResult.error,
        updated_at: new Date(),
      } as any)
      .where(and(eq(socialPosts.id, TEST_POST_ID), eq(socialPosts.status, 'PUBLISHING')));
    await writeAudit('SOCIAL_POST_PUBLISH_FAILED_PERMANENT', {
      post_id: TEST_POST_ID,
      error: publishResult.error,
    });
    return NextResponse.json({ status: 'FAILED', stage: 'publish', error: publishResult.error });
  }

  // Step 3: Mark PUBLISHED
  const publishedAt = new Date();
  await db
    .update(socialPosts)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set({
      status: 'PUBLISHED',
      fb_post_id: publishResult.output.postId,
      fb_page_id: publishResult.output.pageId,
      published_at: publishedAt,
      updated_at: publishedAt,
    } as any)
    .where(and(eq(socialPosts.id, TEST_POST_ID), eq(socialPosts.status, 'PUBLISHING')));

  await writeAudit('SOCIAL_POST_PUBLISHED', {
    post_id: TEST_POST_ID,
    fb_post_id: publishResult.output.postId,
    fb_page_id: publishResult.output.pageId,
    published_at: publishedAt.toISOString(),
    publish_mode: 'IMMEDIATE',
  });

  return NextResponse.json({
    status: 'PUBLISHED',
    fb_post_id: publishResult.output.postId,
    fb_page_id: publishResult.output.pageId,
    published_at: publishedAt.toISOString(),
    qc_findings: policyResult.output.findings,
  });
}
