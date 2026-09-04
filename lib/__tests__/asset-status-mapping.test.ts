import { describe, it, expect } from 'vitest';
import {
  mapClientAssetStatus,
  isClientQuoteStatus,
  CLIENT_ASSET_STATUSES,
  CLIENT_QUOTE_STATUSES,
} from '../portal/types';

describe('mapClientAssetStatus', () => {
  it('maps CLIENT_PREVIEW to Ready for Review', () => {
    expect(mapClientAssetStatus('CLIENT_PREVIEW')).toBe('Ready for Review');
  });

  it('maps REVISION_REQUIRED to Revision in Progress', () => {
    expect(mapClientAssetStatus('REVISION_REQUIRED')).toBe('Revision in Progress');
  });

  it('returns null for internal status UPLOADED', () => {
    expect(mapClientAssetStatus('UPLOADED')).toBeNull();
  });

  it('returns null for internal status PROCESSING', () => {
    expect(mapClientAssetStatus('PROCESSING')).toBeNull();
  });

  it('returns null for internal status READY_FOR_QC', () => {
    expect(mapClientAssetStatus('READY_FOR_QC')).toBeNull();
  });

  it('returns null for internal status REJECTED', () => {
    expect(mapClientAssetStatus('REJECTED')).toBeNull();
  });

  it('returns null for unknown status', () => {
    expect(mapClientAssetStatus('UNKNOWN')).toBeNull();
  });
});

describe('CLIENT_ASSET_STATUSES', () => {
  it('contains exactly CLIENT_PREVIEW and REVISION_REQUIRED', () => {
    expect([...CLIENT_ASSET_STATUSES].sort()).toEqual(
      ['CLIENT_PREVIEW', 'REVISION_REQUIRED'].sort(),
    );
  });

  it('does not contain internal statuses', () => {
    const internal = ['UPLOADED', 'PROCESSING', 'READY_FOR_QC', 'REJECTED'];
    for (const status of internal) {
      expect(CLIENT_ASSET_STATUSES).not.toContain(status);
    }
  });
});

describe('isClientQuoteStatus', () => {
  it('returns true for SENT', () => {
    expect(isClientQuoteStatus('SENT')).toBe(true);
  });

  it('returns true for all CLIENT-safe statuses', () => {
    for (const status of CLIENT_QUOTE_STATUSES) {
      expect(isClientQuoteStatus(status)).toBe(true);
    }
  });

  it('returns false for DRAFT (internal)', () => {
    expect(isClientQuoteStatus('DRAFT')).toBe(false);
  });

  it('returns false for unknown status', () => {
    expect(isClientQuoteStatus('UNKNOWN')).toBe(false);
  });
});

describe('CLIENT_QUOTE_STATUSES', () => {
  it('does not contain DRAFT', () => {
    expect(CLIENT_QUOTE_STATUSES).not.toContain('DRAFT');
  });

  it('contains SENT, ACCEPTED, REJECTED, EXPIRED, CANCELLED', () => {
    expect([...CLIENT_QUOTE_STATUSES].sort()).toEqual(
      ['ACCEPTED', 'CANCELLED', 'EXPIRED', 'REJECTED', 'SENT'].sort(),
    );
  });
});
