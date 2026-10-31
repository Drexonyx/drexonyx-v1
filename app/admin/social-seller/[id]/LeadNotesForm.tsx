'use client';

import { useState, useTransition } from 'react';
import { actionUpdateLeadNotes } from '../actions';
import s from '../../admin.module.css';

export function LeadNotesForm({
  leadId,
  initialNotes,
}: {
  leadId: string;
  initialNotes: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await actionUpdateLeadNotes(leadId, notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className={s.fieldGroup}>
      <label className={s.fieldLabel}>Notes</label>
      <textarea
        className={s.textarea}
        rows={5}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={isPending}
        placeholder="Add notes about this lead…"
      />
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
        <button
          type="button"
          className={s.btnPrimary}
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? 'Saving…' : 'Save Notes'}
        </button>
        {saved && <span className={s.fieldHint} style={{ color: 'var(--drex-success, #4ade80)' }}>Saved ✓</span>}
      </div>
    </div>
  );
}
