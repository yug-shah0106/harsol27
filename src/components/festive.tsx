import { Phone } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "cn";

// The Marigold theme's festival decoration, all decorative SVG (hidden from screen readers):
// the toran strung across the top of every page, the rangoli behind the coming-soon headline, and the
// illustrations in the coming-soon page's arches. Their motion lives in globals.css (the flags sway, the
// petals draw, the illustrations play their entrance) and components/motion.tsx (data-spin turns the
// rangoli with the scroll, data-play starts an illustration when it is scrolled to).

// The toran: small flags hung along a shallow curve, in marigold, kumkum, leaf and turmeric, sized to fit a
// slim strip above the header whole.
const FLAG_COLOURS = ["#f2a20c", "#9c2f28", "#3f7d4e", "#f7c548"];
const flags = (count: number, sag: number, half: number, drop: number) =>
  Array.from({ length: count }, (_, k) => {
    const t = (k + 0.5) / count;
    const x = 1200 * t;
    const y = 4 + sag * t * (1 - t);
    return { d: `M${x - half},${y} L${x + half},${y} L${x},${y + drop} Z`, fill: FLAG_COLOURS[k % FLAG_COLOURS.length]! };
  });
const FLAGS = flags(44, 28, 9.5, 20);

/** The toran across the top of a page, above the header. */
export function Toran({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 1200 36" preserveAspectRatio="xMidYMin slice" className={cn("h-8 w-full print:hidden sm:h-11", className)}>
      <path d="M0,4 Q600,18 1200,4" fill="none" stroke="#6b5141" strokeWidth={1.5} />
      {FLAGS.map((flag, i) => (
        <path key={i} d={flag.d} fill={flag.fill} stroke={flag.fill} strokeWidth="3" strokeLinejoin="round" className="toran-flag" />
      ))}
    </svg>
  );
}

// The rangoli: three rings of petals, a ring of dots and a centre, drawn from the middle out.
const RINGS = [
  { r: 30, n: 8, rx: 9, ry: 20, colour: "#9c2f28" },
  { r: 58, n: 12, rx: 8, ry: 18, colour: "#f2a20c" },
  { r: 82, n: 16, rx: 6, ry: 13, colour: "#3f7d4e" },
];

export function Rangoli({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="-100 -100 200 200" className={className}>
      {RINGS.map((ring, k) =>
        Array.from({ length: ring.n }, (_, i) => (
          <ellipse
            key={`${k}-${i}`}
            cx="0"
            cy={-ring.r}
            rx={ring.rx}
            ry={ring.ry}
            transform={`rotate(${(360 / ring.n) * i})`}
            pathLength={1}
            fill={ring.colour}
            fillOpacity="0.16"
            stroke={ring.colour}
            strokeWidth="1.4"
            className={`rangoli-petal ring-${k + 1}`}
          />
        )),
      )}
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2;
        // Rounded: server and browser print long floats differently, which breaks hydration.
        return <circle key={i} cx={(Math.sin(a) * 95).toFixed(2)} cy={(-Math.cos(a) * 95).toFixed(2)} r="1.8" fill="#f2a20c" />;
      })}
      <circle r="12" fill="#f2a20c" />
      <circle r="5" fill="#9c2f28" />
    </svg>
  );
}

// The arches' illustrations, in the festival colours, which stay the same by lamplight. Each sits in a 4:3 box
// whose top is the arch's round top: a soft halo, and a dotted arch like a rangoli's border.
const KUMKUM = "#9c2f28";
const GOLD = "#f2a20c";
const LEAF = "#3f7d4e";
const CREAM = "#fff9ef";
const ARCH_DOTS = Array.from({ length: 19 }, (_, i) => {
  const a = Math.PI * (1 + i / 18);
  return { cx: (120 + Math.cos(a) * 94).toFixed(2), cy: (112 + Math.sin(a) * 94).toFixed(2) };
});

function ArchArt({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 240 180" data-play="" className={cn("why-art", className)}>
      <circle cx="120" cy="106" r="64" className="fill-white/55 dark:fill-[#f2a20c]/10" />
      <g className="art-dots" fill={GOLD} fillOpacity="0.6">
        {ARCH_DOTS.map((dot, i) => (
          <circle key={i} {...dot} r={i % 2 ? 1.6 : 2.6} />
        ))}
      </g>
      {children}
    </svg>
  );
}

const SEAL_PETALS = Array.from({ length: 16 }, (_, i) => 22.5 * i);

/** "Approved sellers only": a marigold seal of approval, stamped, then ticked. */
export function SealArt({ className }: { className?: string }) {
  return (
    <ArchArt className={className}>
      <path className="art-ribbon" d="M106 128 L92 170 L102 164 L109 174 L121 136 Z" fill={LEAF} />
      <path className="art-ribbon" d="M134 128 L148 170 L138 164 L131 174 L119 136 Z" fill={LEAF} />
      <g className="art-seal">
        {SEAL_PETALS.map((angle) => (
          <ellipse key={angle} cx="120" cy="60" rx="9" ry="14" transform={`rotate(${angle} 120 98)`} fill={GOLD} />
        ))}
        <circle cx="120" cy="98" r="39" fill={KUMKUM} />
        <circle cx="120" cy="98" r="31" fill="none" stroke={CREAM} strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="2 3.2" />
        <path className="art-tick" d="M104 99 L115 110 L137 87" pathLength={1} fill="none" stroke={CREAM} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <circle className="art-burst" cx="120" cy="98" r="56" fill="none" stroke={GOLD} strokeWidth="2" opacity="0" />
    </ArchArt>
  );
}

// The ring: three arcs either side of the phone (±28° around its middle), fainter as they spread.
const WAVES = [34, 44, 54].map((r, i) => ({ r, dx: r * 0.883, dy: r * 0.469, opacity: 1 - i * 0.3 }));

/** "Straight to the seller": a phone showing the seller's details, ringing. Its rings are kumkum (marigold by lamplight). */
export function CallArt({ className }: { className?: string }) {
  return (
    <ArchArt className={className}>
      {[1, -1].map((side) => (
        <g key={side} fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-primary">
          {WAVES.map(({ r, dx, dy, opacity }) => (
            <path key={r} className="art-wave" d={`M${(120 + side * dx).toFixed(2)} ${(94 - dy).toFixed(2)} A${r} ${r} 0 0 ${side > 0 ? 1 : 0} ${(120 + side * dx).toFixed(2)} ${(94 + dy).toFixed(2)}`} strokeOpacity={opacity} />
          ))}
        </g>
      ))}
      <g className="art-phone">
        <rect x="96" y="46" width="48" height="96" rx="11" fill={KUMKUM} />
        <rect x="101" y="55" width="38" height="78" rx="6" fill={CREAM} />
        <rect x="112" y="49.5" width="16" height="2.5" rx="1.25" fill={CREAM} fillOpacity="0.5" />
        <g className="art-screen">
          <g>
            <circle cx="120" cy="73" r="9" fill={GOLD} />
            <circle cx="120" cy="70.5" r="3.2" fill={KUMKUM} />
            <path d="M113.6 79.4 a6.4 5.4 0 0 1 12.8 0 Z" fill={KUMKUM} />
          </g>
          <rect x="107" y="89" width="26" height="3.5" rx="1.75" fill="#6b5141" />
          <rect x="110" y="97" width="20" height="3.5" rx="1.75" fill="#6b5141" fillOpacity="0.45" />
          <g className="art-call">
            <circle cx="120" cy="118" r="8.5" fill={LEAF} />
            <Phone x={113.5} y={111.5} size={13} color={CREAM} strokeWidth={2.4} />
          </g>
        </g>
      </g>
    </ArchArt>
  );
}

// Four-pointed sparkles over the handshake: centre and reach.
const SPARKS = [
  { x: 92, y: 64, s: 7 },
  { x: 150, y: 54, s: 9 },
  { x: 176, y: 74, s: 5 },
];

/** "Your deal, your terms": two hands meeting in a handshake, kumkum and gold sleeves. */
export function DealArt({ className }: { className?: string }) {
  const skin = "#f0c595";
  const crease = "#c98d5a";
  return (
    <ArchArt className={className}>
      {/* The sleeves fade in from the wash, so the arms have no cut ends. */}
      <defs>
        <linearGradient id="deal-sleeve-left">
          <stop offset="0" stopColor={KUMKUM} stopOpacity="0" />
          <stop offset="0.6" stopColor={KUMKUM} />
        </linearGradient>
        <linearGradient id="deal-sleeve-right" x1="1" x2="0">
          <stop offset="0" stopColor={GOLD} stopOpacity="0" />
          <stop offset="0.6" stopColor={GOLD} />
        </linearGradient>
      </defs>
      {/* The seller's hand, from the right: its palm behind, and (last) its thumb over the buyer's knuckles.
          The buyer's hand, from the left, wraps its four fingers round the seller's palm. */}
      <g className="art-right">
        <path d="M226 86 L178 91 L178 131 L226 138 Z" fill="url(#deal-sleeve-right)" />
        <rect x="168" y="87" width="12" height="48" rx="4" fill={KUMKUM} />
        <path d="M170 94 C152 92 132 94 120 100 Q112 114 122 128 C138 134 156 133 170 130 Z" fill={skin} />
      </g>
      <g className="art-left">
        <path d="M14 86 L62 91 L62 131 L14 138 Z" fill="url(#deal-sleeve-left)" />
        <rect x="60" y="87" width="12" height="48" rx="4" fill={GOLD} />
        <path d="M70 92 C88 86 110 84 128 88 Q138 92 136 104 L132 126 C112 130 90 130 70 128 Z" fill={skin} stroke={crease} strokeWidth="1.4" />
        {[36, 37, 33, 26].map((h, k) => {
          const x = 126 + 9.5 * k;
          const y = 88 + 2.5 * k;
          return <rect key={k} x={x} y={y} width="10.5" height={h} rx="5.25" transform={`rotate(14 ${x + 5.25} ${y})`} fill={skin} stroke={crease} strokeWidth="1.4" />;
        })}
      </g>
      <g className="art-right">
        <path d="M170 97 C154 90 134 86 118 87 Q108 88 109 94 Q110 99 119 98 C134 97 150 99 164 106 Z" fill={skin} stroke={crease} strokeWidth="1.4" strokeLinejoin="round" />
      </g>
      {SPARKS.map(({ x, y, s }) => (
        <path key={x} className="art-spark" d={`M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z`} fill={GOLD} />
      ))}
    </ArchArt>
  );
}
