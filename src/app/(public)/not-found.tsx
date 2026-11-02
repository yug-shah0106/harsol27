import type { Metadata } from "next";
import { NotFoundBody } from "@/components/not-found-body";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/** A missing product, seller or industry, and every page someone may not see (hidden listings look the same). */
export default function PublicNotFound() {
  return <NotFoundBody />;
}
