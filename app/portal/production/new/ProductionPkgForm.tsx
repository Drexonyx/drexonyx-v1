'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { actionStartProduction } from './actions';
import type { Package } from '@/lib/pricing';
import s from '../../portal.module.css';

interface Props {
  packages: Package[];
  creditBalance: number;
}

function formatCredits(n: number): string {
  return n.toLocaleString('en-US');
}

export default function ProductionPkgForm({ packages, creditBalance }: Props) {
  const [selectedId, setSelectedId] = useState<string>(packages[0]?.id ?? '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const selected = packages.find((p) => p.id === selectedId) ?? packages[0];
  const cost = selected?.creditCost ?? 0;
  const remaining = creditBalance - cost;
  const sufficient = creditBalance >= cost;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedId || !sufficient) return;
    setErrorMsg(null);

    startTransition(async () => {
      const result = await actionStartProduction(selectedId);
      if (result.ok) {
        router.push(`/portal/production/new/success?orderId=${result.orderId}`);
      } else {
        setErrorMsg(result.reason);
      }
    });
  }

  const microPkgs = packages.filter((p) =>
    ['micro-creative', 'creative-brief'].includes(p.id),
  );
  const prodPkgs = packages.filter((p) =>
    !['micro-creative', 'creative-brief'].includes(p.id),
  );

  const renderCard = (pkg: Package) => (
    <label
      key={pkg.id}
      className={[
        s.productionPkgCard,
        selectedId === pkg.id ? s.productionPkgCardSelected : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        type="radio"
        name="pkg"
        value={pkg.id}
        checked={selectedId === pkg.id}
        onChange={() => setSelectedId(pkg.id)}
        className={s.srOnly}
      />
      {pkg.badge && <span className={s.productionPkgBadge}>{pkg.badge}</span>}
      <div className={s.productionPkgName}>{pkg.name}</div>
      <div className={s.productionPkgCost}>{formatCredits(pkg.creditCost)}</div>
      <div className={s.productionPkgUnit}>credits</div>
      <p className={s.productionPkgDesc}>{pkg.description}</p>
      <ul className={s.productionPkgIncludes}>
        {pkg.includes.map((item) => (
          <li key={item} className={s.productionPkgIncludeItem}>
            {item}
          </li>
        ))}
      </ul>
    </label>
  );

  return (
    <form onSubmit={handleSubmit}>
      {prodPkgs.length > 0 && (
        <div className={s.productionPkgSection}>
          <div className={s.productionPkgSectionTitle}>Video Production</div>
          <div className={s.productionPkgGrid}>{prodPkgs.map(renderCard)}</div>
        </div>
      )}

      {microPkgs.length > 0 && (
        <div className={s.productionPkgSection}>
          <div className={s.productionPkgSectionTitle}>Creative Direction</div>
          <div className={s.productionPkgGrid}>{microPkgs.map(renderCard)}</div>
        </div>
      )}

      {selected && (
        <div className={s.creditCostSummary}>
          <div className={s.creditSummaryTitle}>Credit Summary</div>
          <div className={s.creditSummaryRow}>
            <span className={s.creditSummaryLabel}>Current balance</span>
            <span className={s.creditSummaryValue}>{formatCredits(creditBalance)}</span>
          </div>
          <div className={s.creditSummaryRow}>
            <span className={s.creditSummaryLabel}>{selected.name} cost</span>
            <span className={s.creditSummaryValue}>−{formatCredits(cost)}</span>
          </div>
          <div className={s.creditSummaryDivider} />
          <div className={s.creditSummaryTotalRow}>
            <span className={s.creditSummaryTotalLabel}>Remaining after</span>
            <span
              className={[
                s.creditSummaryTotalValue,
                sufficient ? s.creditSummaryRemainingValue : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {formatCredits(remaining)}
            </span>
          </div>
        </div>
      )}

      {!sufficient && (
        <div className={s.insufficientBanner}>
          Insufficient credits. This production requires{' '}
          <strong>{formatCredits(cost)} credits</strong>. Your balance is{' '}
          <strong>{formatCredits(creditBalance)} credits</strong>.{' '}
          <a href="/portal/credits/buy" style={{ color: 'inherit', fontWeight: 600 }}>
            Buy more credits →
          </a>
        </div>
      )}

      {errorMsg && (
        <div className={s.errorBanner} role="alert">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        className={s.primaryBtn}
        disabled={isPending || !selectedId || !sufficient}
      >
        {isPending ? 'Starting production…' : 'Confirm & Start Production'}
      </button>
    </form>
  );
}
