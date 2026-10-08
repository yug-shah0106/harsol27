import { BUSINESS_CATEGORIES } from "@/lib/lead-schema";

/** All staff-facing times are shown in India time, whatever the server's time zone. */
export function formatIst(date: Date): string {
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

export function categoryLabel(value: string): string {
  return BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
