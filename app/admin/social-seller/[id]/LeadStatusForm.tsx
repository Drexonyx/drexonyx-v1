'use client';

import { useTransition } from 'react';
import { actionUpdateLeadStatus } from '../actions';
import s from '../../admin.module.css';

const STATUSES = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'WON', label: 'Won' },
  { value: 'REJECTED', label: 'Rejected' },
] as const;

export function LeadStatusForm({
  leadId,
  currentStatus,
}: {
  leadId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    if (newStatus === currentStatus) return;
    startTransition(async () => {
      await actionUpdateLeadStatus(leadId, newStatus);
    });
  }

  return (
    <div className={s.fieldGroup}>
      <label className={s.fieldLabel}>Status</label>
      <select
        className={s.input}
        defaultValue={currentStatus}
        onChange={handleChange}
        disabled={isPending}
      >
        {STATUSES.map((st) => (
          <option key={st.value} value={st.value}>
            {st.label}
          </option>
        ))}
      </select>
      {isPending && <span className={s.fieldHint}>Saving…</span>}
    </div>
  );
}
