/** A tiny top-down plan of the shed, drawn to scale. */
export function Footprint({ w, d, max = 6, className = "" }: { w: number; d: number; max?: number; className?: string }) {
  const S = 64;
  const pw = (w / max) * S;
  const pd = (d / max) * S;
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className={className} aria-hidden="true">
      <defs>
        <pattern id="grid" width={S / max} height={S / max} patternUnits="userSpaceOnUse">
          <path d={`M ${S / max} 0 L 0 0 0 ${S / max}`} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={S} height={S} fill="url(#grid)" />
      <rect x={(S - pw) / 2} y={(S - pd) / 2} width={pw} height={pd} rx="1" fill="var(--color-brand)" fillOpacity="0.18" stroke="var(--color-brand-dark)" strokeWidth="1.2" />
    </svg>
  );
}
