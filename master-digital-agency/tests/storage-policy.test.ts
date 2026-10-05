import { describe, it, expect } from 'vitest'
import {
  STANDARD_FOLDER_SLOTS,
  classifyFileToSlot,
  isFinalDeliverableSlot,
  isQCSlot,
  createStorageRecord,
  addFile,
  recordDeliveryAttempt,
  resolveOverallStatus,
  canTransitionToDelivered,
  type StoredFile,
  type DeliveryAttempt,
} from '../storage'

// ── 1. Folder structure ───────────────────────────────────────────────────────

describe('Standard folder structure', () => {
  it('contains exactly 5 slots in correct order', () => {
    expect(STANDARD_FOLDER_SLOTS).toHaveLength(5)
    expect(STANDARD_FOLDER_SLOTS[0]).toBe('01_BRIEF')
    expect(STANDARD_FOLDER_SLOTS[1]).toBe('02_SOURCE_FILES')
    expect(STANDARD_FOLDER_SLOTS[2]).toBe('03_WORKING_FILES')
    expect(STANDARD_FOLDER_SLOTS[3]).toBe('04_FINAL_DELIVERY')
    expect(STANDARD_FOLDER_SLOTS[4]).toBe('05_QC')
  })

  it('createStorageRecord includes all 5 slots', () => {
    const record = createStorageRecord('mda-test-001', 'Test Project')
    expect(record.folderStructure).toHaveLength(5)
    for (const slot of STANDARD_FOLDER_SLOTS) {
      expect(record.folderStructure).toContain(slot)
    }
  })

  it('new record starts in PRODUCTION status', () => {
    const record = createStorageRecord('mda-test-001', 'Test Project')
    expect(record.overallStatus).toBe('PRODUCTION')
    expect(record.files).toHaveLength(0)
    expect(record.deliveryAttempts).toHaveLength(0)
  })
})

// ── 2. File classification ────────────────────────────────────────────────────

describe('File slot classification', () => {
  it('classifies brief to 01_BRIEF', () => {
    expect(classifyFileToSlot('brief')).toBe('01_BRIEF')
    expect(classifyFileToSlot('requirement')).toBe('01_BRIEF')
    expect(classifyFileToSlot('scope')).toBe('01_BRIEF')
  })

  it('classifies client-provided assets to 02_SOURCE_FILES', () => {
    expect(classifyFileToSlot('logo')).toBe('02_SOURCE_FILES')
    expect(classifyFileToSlot('brand-asset')).toBe('02_SOURCE_FILES')
    expect(classifyFileToSlot('source-image')).toBe('02_SOURCE_FILES')
  })

  it('classifies drafts and working exports to 03_WORKING_FILES', () => {
    expect(classifyFileToSlot('draft')).toBe('03_WORKING_FILES')
    expect(classifyFileToSlot('working-export')).toBe('03_WORKING_FILES')
    expect(classifyFileToSlot('intermediate')).toBe('03_WORKING_FILES')
  })

  it('classifies final deliverables to 04_FINAL_DELIVERY', () => {
    expect(classifyFileToSlot('final-png')).toBe('04_FINAL_DELIVERY')
    expect(classifyFileToSlot('final-pdf')).toBe('04_FINAL_DELIVERY')
    expect(classifyFileToSlot('final-mp4')).toBe('04_FINAL_DELIVERY')
    expect(classifyFileToSlot('deliverable')).toBe('04_FINAL_DELIVERY')
  })

  it('classifies QC outputs to 05_QC', () => {
    expect(classifyFileToSlot('qc-report')).toBe('05_QC')
    expect(classifyFileToSlot('qc-checklist')).toBe('05_QC')
    expect(classifyFileToSlot('verification-report')).toBe('05_QC')
    expect(classifyFileToSlot('delivery-checklist')).toBe('05_QC')
  })

  it('defaults unknown categories to 03_WORKING_FILES', () => {
    expect(classifyFileToSlot('something-unknown')).toBe('03_WORKING_FILES')
  })

  it('isFinalDeliverableSlot correctly identifies 04_FINAL_DELIVERY', () => {
    expect(isFinalDeliverableSlot('04_FINAL_DELIVERY')).toBe(true)
    expect(isFinalDeliverableSlot('03_WORKING_FILES')).toBe(false)
    expect(isFinalDeliverableSlot('05_QC')).toBe(false)
  })

  it('isQCSlot correctly identifies 05_QC', () => {
    expect(isQCSlot('05_QC')).toBe(true)
    expect(isQCSlot('04_FINAL_DELIVERY')).toBe(false)
    expect(isQCSlot('03_WORKING_FILES')).toBe(false)
  })
})

// ── 3. Status progression ─────────────────────────────────────────────────────

describe('Storage status progression', () => {
  it('adding only working files keeps status PRODUCTION', () => {
    let record = createStorageRecord('p1', 'Test')
    record = addFile(record, {
      filename: 'draft-v1.png',
      slot: '03_WORKING_FILES',
      verified: false,
    })
    expect(resolveOverallStatus(record)).toBe('PRODUCTION')
  })

  it('adding final files without QC → QC_PENDING', () => {
    let record = createStorageRecord('p1', 'Test')
    // File is ready but not yet in Drive (no driveFileId) and QC not done
    record = addFile(record, {
      filename: 'post-01.png',
      slot: '04_FINAL_DELIVERY',
      verified: false,
      sizeBytes: 120000,
    })
    expect(resolveOverallStatus(record)).toBe('QC_PENDING')
  })

  it('adding final files + QC report → QC_PASSED', () => {
    let record = createStorageRecord('p1', 'Test')
    // File is ready but not yet in Drive
    record = addFile(record, {
      filename: 'post-01.png',
      slot: '04_FINAL_DELIVERY',
      verified: false,
      sizeBytes: 120000,
    })
    record = addFile(record, {
      filename: 'qc-report.md',
      slot: '05_QC',
      verified: true,
    })
    expect(resolveOverallStatus(record)).toBe('QC_PASSED')
  })

  it('all final files stored + QC present → STORED', () => {
    let record = createStorageRecord('p1', 'Test')
    // File is in Drive: verified + driveFileId set
    record = addFile(record, {
      filename: 'post-01.png',
      slot: '04_FINAL_DELIVERY',
      verified: true,
      driveFileId: 'drive-abc',
      sizeBytes: 100000,
    })
    record = addFile(record, {
      filename: 'qc-report.md',
      slot: '05_QC',
      verified: true,
    })
    // All final files have driveFileId + verified → resolves to STORED
    expect(record.files.filter(f => f.slot === '04_FINAL_DELIVERY').every(f => f.verified && f.driveFileId)).toBe(true)
    expect(resolveOverallStatus(record)).toBe('STORED')
  })
})

// ── 4. Connector failure policy ───────────────────────────────────────────────

describe('Connector failure → FINAL_READY_STORAGE_PENDING', () => {
  it('a blocked delivery attempt sets FINAL_READY_STORAGE_PENDING, not DELIVERED', () => {
    let record = createStorageRecord('p1', 'Test')
    record = addFile(record, {
      filename: 'post-01.png',
      slot: '04_FINAL_DELIVERY',
      verified: false,
    })

    const attempt: DeliveryAttempt = {
      filename: 'post-01.png',
      targetSlot: '04_FINAL_DELIVERY',
      attemptedAt: new Date().toISOString(),
      outcome: 'BLOCKED',
      blockingDomain: 'export-download.canva.com',
      blockingReason: 'EGRESS_BLOCKED — network policy denies CONNECT to export-download.canva.com',
    }
    record = recordDeliveryAttempt(record, attempt)

    expect(record.overallStatus).toBe('FINAL_READY_STORAGE_PENDING')
    expect(record.overallStatus).not.toBe('DELIVERED')
    expect(record.overallStatus).not.toBe('STORED')
    expect(record.overallStatus).not.toBe('ARCHIVED')
  })

  it('a subsequent SUCCESS clears the block for that file', () => {
    let record = createStorageRecord('p1', 'Test')
    record = addFile(record, {
      filename: 'post-01.png',
      slot: '04_FINAL_DELIVERY',
      verified: true,
      driveFileId: 'drive-xyz',
      sizeBytes: 200000,
    })
    record = addFile(record, {
      filename: 'qc-report.md',
      slot: '05_QC',
      verified: true,
    })

    // First attempt fails
    record = recordDeliveryAttempt(record, {
      filename: 'post-01.png',
      targetSlot: '04_FINAL_DELIVERY',
      attemptedAt: new Date().toISOString(),
      outcome: 'BLOCKED',
      blockingDomain: 'export-download.canva.com',
      blockingReason: 'EGRESS_BLOCKED',
    })
    expect(record.overallStatus).toBe('FINAL_READY_STORAGE_PENDING')

    // Second attempt succeeds
    record = recordDeliveryAttempt(record, {
      filename: 'post-01.png',
      targetSlot: '04_FINAL_DELIVERY',
      attemptedAt: new Date().toISOString(),
      outcome: 'SUCCESS',
      driveFileId: 'drive-xyz',
    })
    expect(record.overallStatus).toBe('STORED')
  })

  it('canTransitionToDelivered returns false when storage is blocked', () => {
    let record = createStorageRecord('p1', 'Test')
    record = addFile(record, { filename: 'post-01.png', slot: '04_FINAL_DELIVERY', verified: false })
    record = recordDeliveryAttempt(record, {
      filename: 'post-01.png',
      targetSlot: '04_FINAL_DELIVERY',
      attemptedAt: new Date().toISOString(),
      outcome: 'BLOCKED',
      blockingDomain: 'export-download.canva.com',
      blockingReason: 'EGRESS_BLOCKED',
    })
    const guard = canTransitionToDelivered(record)
    expect(guard.eligible).toBe(false)
    expect(guard.reason).toMatch(/FINAL_READY_STORAGE_PENDING/)
  })

  it('canTransitionToDelivered returns false when no files are in 04_FINAL_DELIVERY', () => {
    const record = createStorageRecord('p1', 'Empty project')
    const guard = canTransitionToDelivered(record)
    expect(guard.eligible).toBe(false)
    expect(guard.reason).toMatch(/04_FINAL_DELIVERY/)
  })

  it('canTransitionToDelivered returns false when no QC report exists', () => {
    let record = createStorageRecord('p1', 'Test')
    record = addFile(record, {
      filename: 'post-01.png',
      slot: '04_FINAL_DELIVERY',
      verified: true,
      driveFileId: 'drive-001',
      sizeBytes: 100000,
    })
    const guard = canTransitionToDelivered(record)
    expect(guard.eligible).toBe(false)
    expect(guard.reason).toMatch(/05_QC/)
  })

  it('canTransitionToDelivered returns true only when all conditions are met', () => {
    let record = createStorageRecord('p1', 'Test')
    record = addFile(record, {
      filename: 'post-01.png',
      slot: '04_FINAL_DELIVERY',
      verified: true,
      driveFileId: 'drive-001',
      sizeBytes: 100000,
    })
    record = addFile(record, {
      filename: 'qc-report.md',
      slot: '05_QC',
      verified: true,
    })
    const guard = canTransitionToDelivered(record)
    expect(guard.eligible).toBe(true)
  })
})

// ── 5. NOVA COFFEE DUBAI project — real connector test scenario ───────────────

describe('NOVA COFFEE DUBAI — storage policy scenario', () => {
  const novaProjectId = 'mda-nova-coffee-dubai'
  const novaProjectName = 'NOVA COFFEE DUBAI'

  // From TEST #001 and TEST #002 — real Canva design/job IDs
  const canvaExports = [
    {
      filename: 'NOVA-Coffee-Post-01-Your-Daily-Ritual.png',
      canvaDesignId: 'DAHXKv_VSYg',
      canvaExportJobId: '3135a676-7464-4c94-8e87-911099000a4d',
    },
    {
      filename: 'NOVA-Coffee-Post-02-Made-for-Your-Pace.png',
      canvaDesignId: 'DAHXKucMZ2M',
      canvaExportJobId: '958b73f3-afbc-4078-8eb2-35c90710d868',
    },
    {
      filename: 'NOVA-Coffee-Post-03-Meet-NOVA.png',
      canvaDesignId: 'DAHXKqmHBfQ',
      canvaExportJobId: '1b2ab115-3113-41f4-a7d2-bf58dc4125ef',
    },
  ]

  it('project structure is recognized with all 5 folders', () => {
    const record = createStorageRecord(novaProjectId, novaProjectName)
    expect(record.projectId).toBe(novaProjectId)
    expect(record.projectName).toBe(novaProjectName)
    expect(record.folderStructure).toHaveLength(5)
    expect(record.folderStructure).toContain('04_FINAL_DELIVERY')
    expect(record.folderStructure).toContain('05_QC')
  })

  it('exported PNGs belong in 04_FINAL_DELIVERY (not working files)', () => {
    expect(classifyFileToSlot('final-png')).toBe('04_FINAL_DELIVERY')
    expect(isFinalDeliverableSlot('04_FINAL_DELIVERY')).toBe(true)
    expect(isFinalDeliverableSlot('03_WORKING_FILES')).toBe(false)
  })

  it('QC verification report belongs in 05_QC', () => {
    expect(classifyFileToSlot('qc-report')).toBe('05_QC')
    expect(isQCSlot('05_QC')).toBe(true)
  })

  it('EGRESS_BLOCKED on export-download.canva.com produces FINAL_READY_STORAGE_PENDING', () => {
    let record = createStorageRecord(novaProjectId, novaProjectName)

    // Add 3 final PNG files (export succeeded, but not yet downloaded)
    for (const exp of canvaExports) {
      record = addFile(record, {
        filename: exp.filename,
        slot: '04_FINAL_DELIVERY',
        mimeType: 'image/png',
        canvaDesignId: exp.canvaDesignId,
        canvaExportJobId: exp.canvaExportJobId,
        verified: false,
      })
    }

    // Simulate the EGRESS_BLOCKED failure for all 3 files
    for (const exp of canvaExports) {
      record = recordDeliveryAttempt(record, {
        filename: exp.filename,
        targetSlot: '04_FINAL_DELIVERY',
        attemptedAt: '2026-10-05T21:00:00.000Z',
        outcome: 'BLOCKED',
        blockingDomain: 'export-download.canva.com',
        blockingReason: 'EGRESS_BLOCKED — network policy denies CONNECT to export-download.canva.com',
      })
    }

    expect(record.overallStatus).toBe('FINAL_READY_STORAGE_PENDING')
    expect(record.overallStatus).not.toBe('DELIVERED')
    expect(record.overallStatus).not.toBe('STORED')
    expect(record.overallStatus).not.toBe('ARCHIVED')

    // Canva export job IDs are preserved for later resumption
    const storedFiles = record.files.filter(f => f.slot === '04_FINAL_DELIVERY')
    expect(storedFiles).toHaveLength(3)
    for (const exp of canvaExports) {
      const file = storedFiles.find(f => f.filename === exp.filename)
      expect(file).toBeDefined()
      expect(file?.canvaDesignId).toBe(exp.canvaDesignId)
      expect(file?.canvaExportJobId).toBe(exp.canvaExportJobId)
    }

    // All 3 blocked delivery attempts are recorded with the exact blocking domain
    const blocked = record.deliveryAttempts.filter(a => a.outcome === 'BLOCKED')
    expect(blocked).toHaveLength(3)
    for (const attempt of blocked) {
      expect(attempt.blockingDomain).toBe('export-download.canva.com')
    }
  })

  it('canTransitionToDelivered is false while storage is blocked', () => {
    let record = createStorageRecord(novaProjectId, novaProjectName)
    for (const exp of canvaExports) {
      record = addFile(record, {
        filename: exp.filename,
        slot: '04_FINAL_DELIVERY',
        mimeType: 'image/png',
        canvaDesignId: exp.canvaDesignId,
        canvaExportJobId: exp.canvaExportJobId,
        verified: false,
      })
      record = recordDeliveryAttempt(record, {
        filename: exp.filename,
        targetSlot: '04_FINAL_DELIVERY',
        attemptedAt: '2026-10-05T21:00:00.000Z',
        outcome: 'BLOCKED',
        blockingDomain: 'export-download.canva.com',
        blockingReason: 'EGRESS_BLOCKED',
      })
    }
    const guard = canTransitionToDelivered(record)
    expect(guard.eligible).toBe(false)
  })

  it('project transitions to STORED after block is resolved and Drive confirms uploads', () => {
    let record = createStorageRecord(novaProjectId, novaProjectName)

    // Add files as Canva-exported but not yet downloaded
    for (const exp of canvaExports) {
      record = addFile(record, {
        filename: exp.filename,
        slot: '04_FINAL_DELIVERY',
        mimeType: 'image/png',
        canvaDesignId: exp.canvaDesignId,
        canvaExportJobId: exp.canvaExportJobId,
        verified: false,
      })
      record = recordDeliveryAttempt(record, {
        filename: exp.filename,
        targetSlot: '04_FINAL_DELIVERY',
        attemptedAt: '2026-10-05T21:00:00.000Z',
        outcome: 'BLOCKED',
        blockingDomain: 'export-download.canva.com',
        blockingReason: 'EGRESS_BLOCKED',
      })
    }
    expect(record.overallStatus).toBe('FINAL_READY_STORAGE_PENDING')

    // Simulate resolution: files manually uploaded to Drive, now record successes
    const driveIds = ['1AAA', '1BBB', '1CCC']
    for (let i = 0; i < canvaExports.length; i++) {
      // Update the file to verified + driveFileId
      const idx = record.files.findIndex(f => f.filename === canvaExports[i].filename)
      const updatedFiles = [...record.files]
      updatedFiles[idx] = {
        ...updatedFiles[idx],
        verified: true,
        driveFileId: driveIds[i],
        sizeBytes: 150000 + i * 10000,
      }
      record = { ...record, files: updatedFiles }

      // Record the successful delivery attempt
      record = recordDeliveryAttempt(record, {
        filename: canvaExports[i].filename,
        targetSlot: '04_FINAL_DELIVERY',
        attemptedAt: '2026-10-06T10:00:00.000Z',
        outcome: 'SUCCESS',
        driveFileId: driveIds[i],
      })
    }

    // Add QC report
    record = addFile(record, {
      filename: '05_QC_NOVA-COFFEE-DELIVERY-REPORT.md',
      slot: '05_QC',
      verified: true,
    })

    expect(record.overallStatus).toBe('STORED')
    const guard = canTransitionToDelivered(record)
    expect(guard.eligible).toBe(true)
  })
})
