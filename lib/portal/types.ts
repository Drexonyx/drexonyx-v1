// CLIENT-safe asset statuses (DR 0040 — APPROVED)
export const CLIENT_ASSET_STATUSES = ['CLIENT_PREVIEW', 'REVISION_REQUIRED'] as const;
export type ClientAssetStatus = (typeof CLIENT_ASSET_STATUSES)[number];

const ASSET_STATUS_LABELS: Record<ClientAssetStatus, string> = {
  CLIENT_PREVIEW: 'Ready for Review',
  REVISION_REQUIRED: 'Revision in Progress',
};

// Returns the CLIENT-safe label for an asset status, or null for internal states.
// Internal states (UPLOADED, PROCESSING, READY_FOR_QC, REJECTED) return null.
export function mapClientAssetStatus(status: string): string | null {
  if (status === 'CLIENT_PREVIEW' || status === 'REVISION_REQUIRED') {
    return ASSET_STATUS_LABELS[status as ClientAssetStatus];
  }
  return null;
}

// CLIENT-safe quote statuses. DRAFT is internal and must not be exposed.
export const CLIENT_QUOTE_STATUSES = [
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
] as const;
export type ClientQuoteStatus = (typeof CLIENT_QUOTE_STATUSES)[number];

export function isClientQuoteStatus(status: string): status is ClientQuoteStatus {
  return CLIENT_QUOTE_STATUSES.includes(status as ClientQuoteStatus);
}

export type PortalSession = {
  userId: string;
  organizationId: string;
  role: string;
  name: string | null;
  email: string | null;
};
