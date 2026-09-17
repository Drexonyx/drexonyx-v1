import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function () {
    return { emails: { send: mockSend } };
  }),
}));

import {
  buildNotificationEmailContent,
  sendInternalNotification,
  type InternalNotificationEventType,
} from '../notifications';

// ─── buildNotificationEmailContent ───────────────────────────────────────────

describe('buildNotificationEmailContent', () => {
  const eventTypes: InternalNotificationEventType[] = [
    'JOB_FAILED',
    'QC_COMPLETED',
    'MONITORING_ALERT',
    'ANOMALY_DETECTED',
    'REPORT_READY',
  ];

  it.each(eventTypes)('returns subject and html for event type %s', (eventType) => {
    const result = buildNotificationEmailContent({
      eventType,
      title: 'Test title',
      detail: 'Test detail',
    });
    expect(result.subject).toContain('[DREXONYX]');
    expect(result.html).toContain('<!DOCTYPE html>');
  });

  it('includes entityId short prefix in subject when provided', () => {
    const result = buildNotificationEmailContent({
      eventType: 'JOB_FAILED',
      title: 'Job failed',
      detail: 'Some error',
      entityId: 'abcdef12-1234-5678-abcd-000000000000',
    });
    expect(result.subject).toContain('abcdef12');
  });

  it('omits entity prefix from subject when entityId is absent', () => {
    const result = buildNotificationEmailContent({
      eventType: 'REPORT_READY',
      title: 'Report ready',
      detail: 'Report is available',
    });
    expect(result.subject).toBe('[DREXONYX] Report Ready');
  });

  it('includes entityType and entityId row in html when both provided', () => {
    const result = buildNotificationEmailContent({
      eventType: 'QC_COMPLETED',
      title: 'QC done',
      detail: 'All passed',
      entityId: 'entity-uuid-001',
      entityType: 'Production Job',
    });
    expect(result.html).toContain('Production Job');
    expect(result.html).toContain('entity-uuid-001');
  });

  it('omits entityType row in html when entityId is absent', () => {
    const result = buildNotificationEmailContent({
      eventType: 'MONITORING_ALERT',
      title: 'Alert',
      detail: 'Threshold breached',
    });
    expect(result.html).not.toContain('entityType');
  });

  it('includes admin link when adminBaseUrl is provided', () => {
    const result = buildNotificationEmailContent({
      eventType: 'ANOMALY_DETECTED',
      title: 'Anomaly',
      detail: 'High failure rate',
      adminBaseUrl: 'https://example.com/admin',
    });
    expect(result.html).toContain('https://example.com/admin');
    expect(result.html).toContain('DREXONYX admin dashboard');
  });

  it('omits admin link when adminBaseUrl is absent', () => {
    const result = buildNotificationEmailContent({
      eventType: 'JOB_FAILED',
      title: 'Failure',
      detail: 'Error occurred',
    });
    expect(result.html).not.toContain('admin dashboard');
  });

  it('escapes HTML in title and detail', () => {
    const result = buildNotificationEmailContent({
      eventType: 'JOB_FAILED',
      title: '<script>alert("xss")</script>',
      detail: 'User & system',
    });
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
    expect(result.html).toContain('User &amp; system');
  });

  it('JOB_FAILED label is "Production Job Failed"', () => {
    const result = buildNotificationEmailContent({
      eventType: 'JOB_FAILED',
      title: 'Job failed',
      detail: 'error',
    });
    expect(result.subject).toContain('Production Job Failed');
    expect(result.html).toContain('Production Job Failed');
  });

  it('ANOMALY_DETECTED label is "Operational Anomaly Detected"', () => {
    const result = buildNotificationEmailContent({
      eventType: 'ANOMALY_DETECTED',
      title: 'Anomaly',
      detail: 'details',
    });
    expect(result.subject).toContain('Operational Anomaly Detected');
  });

  it('includes detail text in html body', () => {
    const result = buildNotificationEmailContent({
      eventType: 'MONITORING_ALERT',
      title: 'Alert title',
      detail: 'This is the detail text',
    });
    expect(result.html).toContain('This is the detail text');
  });
});

// ─── sendInternalNotification ─────────────────────────────────────────────────

describe('sendInternalNotification', () => {
  const base = {
    organizationId: 'org-uuid',
    eventType: 'JOB_FAILED' as const,
    title: 'Production job failed',
    detail: 'Error: timeout after 30s',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.RESEND_FROM_ADDRESS = 'noreply@drexonyx.studio';
    process.env.ORCHESTRATION_ALERT_EMAIL = 'ops@drexonyx.studio';
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_ADDRESS;
    delete process.env.ORCHESTRATION_ALERT_EMAIL;
  });

  it('resolves without throwing on success', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });
    await expect(sendInternalNotification(base)).resolves.toBeUndefined();
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('sends to ORCHESTRATION_ALERT_EMAIL', async () => {
    mockSend.mockResolvedValue({ data: { id: 'e' }, error: null });
    await sendInternalNotification(base);
    const call = mockSend.mock.calls[0][0];
    expect(call.to).toEqual(['ops@drexonyx.studio']);
  });

  it('sends from RESEND_FROM_ADDRESS', async () => {
    mockSend.mockResolvedValue({ data: { id: 'e' }, error: null });
    await sendInternalNotification(base);
    const call = mockSend.mock.calls[0][0];
    expect(call.from).toBe('noreply@drexonyx.studio');
  });

  it('is a no-op when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendInternalNotification(base)).resolves.toBeUndefined();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('is a no-op when RESEND_FROM_ADDRESS is missing', async () => {
    delete process.env.RESEND_FROM_ADDRESS;
    await expect(sendInternalNotification(base)).resolves.toBeUndefined();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('is a no-op when ORCHESTRATION_ALERT_EMAIL is missing', async () => {
    delete process.env.ORCHESTRATION_ALERT_EMAIL;
    await expect(sendInternalNotification(base)).resolves.toBeUndefined();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('swallows Resend send errors (best-effort)', async () => {
    mockSend.mockRejectedValue(new Error('Network failure'));
    await expect(sendInternalNotification(base)).resolves.toBeUndefined();
  });

  it('passes entityId and entityType to email content', async () => {
    mockSend.mockResolvedValue({ data: { id: 'e' }, error: null });
    await sendInternalNotification({
      ...base,
      entityId: 'job-uuid-1234',
      entityType: 'ProductionJob',
    });
    const call = mockSend.mock.calls[0][0];
    expect(call.html).toContain('job-uuid-1234');
    expect(call.html).toContain('ProductionJob');
  });

  it('subject contains event label', async () => {
    mockSend.mockResolvedValue({ data: { id: 'e' }, error: null });
    await sendInternalNotification(base);
    const call = mockSend.mock.calls[0][0];
    expect(call.subject).toContain('Production Job Failed');
  });
});
