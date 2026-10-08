/**
 * Draws the app icons (a kite, as in the home page's Uttarayan sky) and writes every size needed:
 * the favicon, the install icons in the web app manifest, and the iPhone home-screen icon.
 * Run after changing the drawing: `pnpm exec tsx scripts/make-icons.ts`. The output is committed.
 * Placeholder until there is a logo (docs/FUTURE.md).
 */
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const INDIGO = "#1f3a68";
const SAFFRON = "#f6b44a";
const IVORY = "#fbf8f3";

/** `rounded`: a rounded square (favicon, "any" icons). `scale`: shrink the kite into a launcher's safe area. */
function kiteIcon({ rounded, scale }: { rounded: boolean; scale: number }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ""} fill="${INDIGO}"/>
  <g transform="translate(256 250) scale(${scale}) rotate(-10) translate(-256 -250)">
    <path d="M256,250 Q330,380 470,540" fill="none" stroke="${IVORY}" stroke-opacity="0.6" stroke-width="5"/>
    <path d="M256,96 L146,236 L256,356 Z" fill="${SAFFRON}"/>
    <path d="M256,96 L256,356 L366,236 Z" fill="${IVORY}"/>
    <path d="M256,356 L230,408 L282,408 Z" fill="${SAFFRON}"/>
    <path d="M256,96 L256,356 M146,236 Q256,176 366,236" fill="none" stroke="${INDIGO}" stroke-opacity="0.55" stroke-width="6"/>
  </g>
</svg>`;
}

const ICONS = [
  { file: "public/icons/icon-192.png", size: 192, rounded: true, scale: 1 },
  { file: "public/icons/icon-512.png", size: 512, rounded: true, scale: 1 },
  { file: "public/icons/maskable-512.png", size: 512, rounded: false, scale: 0.78 }, // inside Android's circular mask
  { file: "src/app/apple-icon.png", size: 180, rounded: false, scale: 0.9 }, // iPhone home screen; iOS rounds the corners itself
];

async function main() {
  await mkdir("public/icons", { recursive: true });
  await writeFile("src/app/icon.svg", kiteIcon({ rounded: true, scale: 1 }));
  for (const { file, size, ...shape } of ICONS) {
    await sharp(Buffer.from(kiteIcon(shape))).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
  }
  console.log(`Wrote src/app/icon.svg and ${ICONS.length} PNG icons.`);
}

void main();
