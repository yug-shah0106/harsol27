import { cn } from "cn";

// The Marigold theme's festival decoration, all decorative SVG (hidden from screen readers):
// the toran strung across the top of every page, and the rangoli behind the coming-soon headline.
// Their motion lives in globals.css (the flags sway, the petals draw) and components/motion.tsx
// (data-spin turns the rangoli with the scroll).

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
