export function DrexonyxHorizontalLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 560 100"
      role="img"
      aria-label="DREXONYX"
      className={className}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="hlSilver" x1="0" y1="5" x2="0" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#E0E0E0" />
          <stop offset="100%" stopColor="#A6A6A6" />
        </linearGradient>
        <linearGradient id="hlTextSilver" x1="0" y1="20" x2="0" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#E0E0E0" />
          <stop offset="100%" stopColor="#A6A6A6" />
        </linearGradient>
        <linearGradient id="hlGold" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#E2B820" />
          <stop offset="100%" stopColor="#9A6C08" />
        </linearGradient>
        <clipPath id="hlXClip">
          <rect x="108" y="5" width="87" height="90" />
        </clipPath>
      </defs>

      {/* D letterform */}
      <path
        fill="url(#hlSilver)"
        fillRule="evenodd"
        d="M5,5 L52,5 Q88,5 88,50 Q88,95 52,95 L5,95 Z M20,20 L20,80 L46,80 Q70,80 70,50 Q70,20 46,20 Z"
      />

      {/* X letterform */}
      <g clipPath="url(#hlXClip)">
        <rect x="143.5" y="-15" width="16" height="130" fill="url(#hlSilver)" transform="rotate(46, 151.5, 50)" />
        <rect x="143.5" y="-15" width="16" height="130" fill="url(#hlSilver)" transform="rotate(-46, 151.5, 50)" />
      </g>

      {/* Gold accent */}
      <line x1="98.5" y1="54" x2="98.5" y2="68" stroke="url(#hlGold)" strokeWidth="1.5" strokeLinecap="round" />
      <polygon points="98.5,70 102.8,76.5 98.5,83 94.2,76.5" fill="url(#hlGold)" />

      {/* DREXONYX wordmark */}
      <text
        x="218"
        y="65"
        fill="url(#hlTextSilver)"
        fontSize="44"
        fontFamily="var(--font-geist-sans), system-ui, sans-serif"
        fontWeight="600"
        letterSpacing="4"
      >
        DREXONYX
      </text>
    </svg>
  );
}
