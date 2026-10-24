import "server-only";
import type { Locale } from "@/lib/i18n";
import { en, type Messages } from "./en";
import { gu } from "./gu";
import { hi } from "./hi";

export type { Accent, Messages } from "./en";
/** Server only (server/locale.ts, components/locale-root.tsx): a client bundle would carry all three languages. */
export const MESSAGES: Record<Locale, Messages> = { en, hi, gu };
