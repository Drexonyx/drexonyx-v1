'use client';

// ── Donut Chart ─────────────────────────────────────────────────────────────

export type DonutSegment = {
  label: string;
  arabicLabel: string;
  count: number;
  color: string;
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function donutPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
) {
  if (endDeg - startDeg >= 359.99) {
    // Full circle — can't draw with arc command; render as two arcs
    const midDeg = startDeg + 180;
    const o1 = polarToCartesian(cx, cy, outerR, startDeg);
    const o2 = polarToCartesian(cx, cy, outerR, midDeg);
    const i1 = polarToCartesian(cx, cy, innerR, midDeg);
    const i2 = polarToCartesian(cx, cy, innerR, startDeg);
    return (
      `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)} ` +
      `A ${outerR} ${outerR} 0 1 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)} ` +
      `A ${outerR} ${outerR} 0 1 1 ${o1.x.toFixed(2)} ${o1.y.toFixed(2)} ` +
      `M ${i1.x.toFixed(2)} ${i1.y.toFixed(2)} ` +
      `A ${innerR} ${innerR} 0 1 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)} ` +
      `A ${innerR} ${innerR} 0 1 0 ${i1.x.toFixed(2)} ${i1.y.toFixed(2)} Z`
    );
  }
  const outer = describeArc(cx, cy, outerR, startDeg, endDeg);
  const innerEnd = polarToCartesian(cx, cy, innerR, endDeg);
  const innerStart = polarToCartesian(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return (
    `${outer} ` +
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)} ` +
    `A ${innerR} ${innerR} 0 ${large} 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)} Z`
  );
}

export function DonutChart({ segments, total }: { segments: DonutSegment[]; total: number }) {
  const CX = 90;
  const CY = 90;
  const OUTER_R = 72;
  const INNER_R = 50;
  const GAP = 2; // degrees gap between segments

  const nonZero = segments.filter((s) => s.count > 0);

  if (nonZero.length === 0 || total === 0) {
    return (
      <svg viewBox="0 0 180 180" width="180" height="180">
        <circle cx={CX} cy={CY} r={OUTER_R} fill="#162d48" />
        <circle cx={CX} cy={CY} r={INNER_R} fill="#07162a" />
        <text x={CX} y={CY + 6} textAnchor="middle" fill="#2e4f6e" fontSize="14" fontWeight="600">
          0
        </text>
      </svg>
    );
  }

  let currentDeg = 0;
  const paths: { d: string; color: string; label: string; count: number }[] = [];

  for (const seg of nonZero) {
    const deg = (seg.count / total) * 360;
    const gapHalf = nonZero.length > 1 ? GAP / 2 : 0;
    paths.push({
      d: donutPath(CX, CY, OUTER_R, INNER_R, currentDeg + gapHalf, currentDeg + deg - gapHalf),
      color: seg.color,
      label: seg.arabicLabel,
      count: seg.count,
    });
    currentDeg += deg;
  }

  return (
    <svg viewBox="0 0 180 180" width="180" height="180" style={{ overflow: 'visible' }}>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} opacity="0.9" />
      ))}
      <circle cx={CX} cy={CY} r={INNER_R - 1} fill="#07162a" />
      <text x={CX} y={CY - 4} textAnchor="middle" fill="#e4f0ff" fontSize="22" fontWeight="700">
        {total}
      </text>
      <text x={CX} y={CY + 14} textAnchor="middle" fill="#2e4f6e" fontSize="9" letterSpacing="0.5">
        إجمالي
      </text>
    </svg>
  );
}

// ── Line Chart ───────────────────────────────────────────────────────────────

export type LinePoint = {
  date: string;
  count: number;
};

export function LineChart({ points }: { points: LinePoint[] }) {
  const W = 460;
  const H = 140;
  const PAD_L = 32;
  const PAD_R = 16;
  const PAD_T = 12;
  const PAD_B = 28;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  if (points.length === 0) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        <text x={W / 2} y={H / 2} textAnchor="middle" fill="#2e4f6e" fontSize="12">
          لا توجد بيانات
        </text>
      </svg>
    );
  }

  const maxCount = Math.max(...points.map((p) => p.count), 1);
  const minCount = 0;
  const range = maxCount - minCount || 1;

  const coords = points.map((p, i) => ({
    x: PAD_L + (i / Math.max(points.length - 1, 1)) * chartW,
    y: PAD_T + chartH - ((p.count - minCount) / range) * chartH,
    ...p,
  }));

  // Polyline string
  const polylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  // Area fill path
  const areaPath =
    `M ${coords[0].x.toFixed(1)} ${(PAD_T + chartH).toFixed(1)} ` +
    coords.map((c) => `L ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ') +
    ` L ${coords[coords.length - 1].x.toFixed(1)} ${(PAD_T + chartH).toFixed(1)} Z`;

  // Y axis labels
  const yLabels = [0, Math.round(maxCount / 2), maxCount].filter((v, i, a) => a.indexOf(v) === i);

  // X axis labels — show first, middle, last
  const xLabelIdxs = [0, Math.floor(points.length / 2), points.length - 1].filter(
    (v, i, a) => a.indexOf(v) === i && v < points.length,
  );

  const gradId = 'lineAreaGrad';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yLabels.map((val) => {
        const y = PAD_T + chartH - ((val - minCount) / range) * chartH;
        return (
          <g key={val}>
            <line
              x1={PAD_L}
              y1={y}
              x2={W - PAD_R}
              y2={y}
              stroke="#162d48"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
            <text x={PAD_L - 4} y={y + 4} textAnchor="end" fill="#2e4f6e" fontSize="9">
              {val}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      {/* Line */}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data points */}
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3" fill="#3b82f6" stroke="#07162a" strokeWidth="1.5" />
      ))}

      {/* X axis labels */}
      {xLabelIdxs.map((idx) => {
        const c = coords[idx];
        const dateStr = points[idx].date;
        // Format: DD/MM
        const parts = dateStr.split('-');
        const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
        return (
          <text key={idx} x={c.x} y={H - 4} textAnchor="middle" fill="#2e4f6e" fontSize="9">
            {label}
          </text>
        );
      })}

      {/* X axis baseline */}
      <line
        x1={PAD_L}
        y1={PAD_T + chartH}
        x2={W - PAD_R}
        y2={PAD_T + chartH}
        stroke="#162d48"
        strokeWidth="1"
      />
    </svg>
  );
}
