/**
 * MDA Client Project Storage Policy — V1
 *
 * Defines where project files live during each lifecycle stage and
 * what statuses are valid during the WORKING → QC → FINAL → ARCHIVED chain.
 *
 * This module is pure TypeScript — no new agents, no new skills, no DB.
 * It does not replace ProjectState; it tracks the storage/delivery layer on top.
 */

// ── Folder structure ──────────────────────────────────────────────────────────

export const STANDARD_FOLDER_SLOTS = [
  '01_BRIEF',
  '02_SOURCE_FILES',
  '03_WORKING_FILES',
  '04_FINAL_DELIVERY',
  '05_QC',
] as const

export type FolderSlot = (typeof STANDARD_FOLDER_SLOTS)[number]

/** Maps common file categories to their correct folder slot */
export const FOLDER_SLOT_RULES: Record<string, FolderSlot> = {
  brief: '01_BRIEF',
  requirement: '01_BRIEF',
  scope: '01_BRIEF',
  reference: '01_BRIEF',
  'client-provided': '02_SOURCE_FILES',
  logo: '02_SOURCE_FILES',
  'brand-asset': '02_SOURCE_FILES',
  'source-image': '02_SOURCE_FILES',
  draft: '03_WORKING_FILES',
  'working-export': '03_WORKING_FILES',
  intermediate: '03_WORKING_FILES',
  editable: '03_WORKING_FILES',
  'final-png': '04_FINAL_DELIVERY',
  'final-pdf': '04_FINAL_DELIVERY',
  'final-jpg': '04_FINAL_DELIVERY',
  'final-mp4': '04_FINAL_DELIVERY',
  'final-zip': '04_FINAL_DELIVERY',
  'final-html': '04_FINAL_DELIVERY',
  deliverable: '04_FINAL_DELIVERY',
  'qc-report': '05_QC',
  'qc-checklist': '05_QC',
  'verification-report': '05_QC',
  'delivery-checklist': '05_QC',
}

export function classifyFileToSlot(category: string): FolderSlot {
  const normalized = category.toLowerCase().replace(/\s+/g, '-')
  return FOLDER_SLOT_RULES[normalized] ?? '03_WORKING_FILES'
}

export function isFinalDeliverableSlot(slot: FolderSlot): boolean {
  return slot === '04_FINAL_DELIVERY'
}

export function isQCSlot(slot: FolderSlot): boolean {
  return slot === '05_QC'
}

// ── Delivery status model ─────────────────────────────────────────────────────

export type StorageStatus =
  | 'PRODUCTION'
  | 'QC_PENDING'
  | 'QC_PASSED'
  | 'FINAL_READY_STORAGE_PENDING'
  | 'STORED'
  | 'DELIVERED'
  | 'ARCHIVED'
  | 'BLOCKED'

// ── File and attempt records ───────────────────────────────────────────────────

export interface StoredFile {
  filename: string
  slot: FolderSlot
  mimeType?: string
  sizeBytes?: number
  /** Google Drive file ID once confirmed stored */
  driveFileId?: string
  /** Canva design ID (if produced via Canva) */
  canvaDesignId?: string
  /** Canva export job ID (if exported via Canva) */
  canvaExportJobId?: string
  storedAt?: string
  verified: boolean
}

export interface DeliveryAttempt {
  filename: string
  targetSlot: FolderSlot
  attemptedAt: string
  outcome: 'SUCCESS' | 'BLOCKED' | 'FAILED'
  /** e.g. "export-download.canva.com" */
  blockingDomain?: string
  blockingReason?: string
  driveFileId?: string
}

// ── Project storage record ────────────────────────────────────────────────────

export interface ProjectStorageRecord {
  projectId: string
  projectName: string
  /** Always the full standard set — existence of the structure, not of the files */
  folderStructure: readonly FolderSlot[]
  files: StoredFile[]
  deliveryAttempts: DeliveryAttempt[]
  overallStatus: StorageStatus
  lastUpdated: string
}

export function createStorageRecord(projectId: string, projectName: string): ProjectStorageRecord {
  return {
    projectId,
    projectName,
    folderStructure: STANDARD_FOLDER_SLOTS,
    files: [],
    deliveryAttempts: [],
    overallStatus: 'PRODUCTION',
    lastUpdated: new Date().toISOString(),
  }
}

// ── Mutators (return new records — immutable pattern) ─────────────────────────

export function addFile(
  record: ProjectStorageRecord,
  file: StoredFile,
): ProjectStorageRecord {
  return {
    ...record,
    files: [...record.files, file],
    lastUpdated: new Date().toISOString(),
  }
}

export function recordDeliveryAttempt(
  record: ProjectStorageRecord,
  attempt: DeliveryAttempt,
): ProjectStorageRecord {
  const updated = {
    ...record,
    deliveryAttempts: [...record.deliveryAttempts, attempt],
    lastUpdated: new Date().toISOString(),
  }
  return { ...updated, overallStatus: resolveOverallStatus(updated) }
}

// ── Status resolution ─────────────────────────────────────────────────────────

/**
 * Determines the correct StorageStatus from the current record state.
 *
 * Rules (in priority order):
 * 1. Any BLOCKED attempt with no subsequent SUCCESS for the same file
 *    → FINAL_READY_STORAGE_PENDING
 * 2. All final-delivery files confirmed stored in Drive
 *    → STORED (or DELIVERED/ARCHIVED if further updated externally)
 * 3. QC files present and final-delivery files present
 *    → QC_PASSED (waiting for storage)
 * 4. Final-delivery files present but no QC record yet
 *    → QC_PENDING
 * 5. Otherwise → PRODUCTION
 */
export function resolveOverallStatus(record: ProjectStorageRecord): StorageStatus {
  const finalFiles = record.files.filter(f => isFinalDeliverableSlot(f.slot))
  const qcFiles = record.files.filter(f => isQCSlot(f.slot))

  // Check for unresolved blocks: a block counts if no SUCCESS for the same filename follows
  const blockedFilenames = new Set<string>()
  for (const attempt of record.deliveryAttempts) {
    if (attempt.outcome === 'BLOCKED' || attempt.outcome === 'FAILED') {
      blockedFilenames.add(attempt.filename)
    }
    if (attempt.outcome === 'SUCCESS') {
      blockedFilenames.delete(attempt.filename)
    }
  }

  if (blockedFilenames.size > 0) {
    return 'FINAL_READY_STORAGE_PENDING'
  }

  // All final files stored and verified
  if (
    finalFiles.length > 0 &&
    finalFiles.every(f => f.verified && f.driveFileId)
  ) {
    return 'STORED'
  }

  // QC evidence present + final files present → waiting for upload
  if (finalFiles.length > 0 && qcFiles.length > 0) {
    return 'QC_PASSED'
  }

  // Final files present but QC not yet done
  if (finalFiles.length > 0) {
    return 'QC_PENDING'
  }

  return 'PRODUCTION'
}

// ── Transition guard ──────────────────────────────────────────────────────────

export interface TransitionGuardResult {
  eligible: boolean
  reason?: string
}

/**
 * Checks whether a project's files meet the bar to enter the FINAL/DELIVERED state.
 * This is not a state machine gate — call it before marking a project delivered.
 */
export function canTransitionToDelivered(record: ProjectStorageRecord): TransitionGuardResult {
  const finalFiles = record.files.filter(f => isFinalDeliverableSlot(f.slot))
  if (finalFiles.length === 0) {
    return { eligible: false, reason: 'No files in 04_FINAL_DELIVERY' }
  }

  // Check blocked delivery attempts first — takes priority over unverified check
  const blockedFilenames = new Set<string>()
  for (const attempt of record.deliveryAttempts) {
    if (attempt.outcome === 'BLOCKED' || attempt.outcome === 'FAILED') {
      blockedFilenames.add(attempt.filename)
    }
    if (attempt.outcome === 'SUCCESS') {
      blockedFilenames.delete(attempt.filename)
    }
  }
  if (blockedFilenames.size > 0) {
    return {
      eligible: false,
      reason: `Storage blocked for: ${[...blockedFilenames].join(', ')} — status is FINAL_READY_STORAGE_PENDING`,
    }
  }

  const emptyFiles = finalFiles.filter(f => f.sizeBytes !== undefined && f.sizeBytes === 0)
  if (emptyFiles.length > 0) {
    return { eligible: false, reason: `Empty files present: ${emptyFiles.map(f => f.filename).join(', ')}` }
  }

  const unverified = finalFiles.filter(f => !f.verified)
  if (unverified.length > 0) {
    return { eligible: false, reason: `Unverified files: ${unverified.map(f => f.filename).join(', ')}` }
  }

  const qcFiles = record.files.filter(f => isQCSlot(f.slot))
  if (qcFiles.length === 0) {
    return { eligible: false, reason: 'No QC report in 05_QC' }
  }

  const unstored = finalFiles.filter(f => !f.driveFileId)
  if (unstored.length > 0) {
    return { eligible: false, reason: `Files not yet uploaded to Drive: ${unstored.map(f => f.filename).join(', ')}` }
  }

  return { eligible: true }
}
