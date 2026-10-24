"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n";
import { ScrollArea } from "@/components/ui/scroll-area";

const LINKS = [
  { href: "/seller", key: "overview", exact: true },
  { href: "/seller/products", key: "products" },
  { href: "/seller/inquiries", key: "inquiries" },
  { href: "/seller/subscription", key: "subscription" },
] as const;

export function SellerNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav aria-label={t.sellerArea.nav} className="border-b border-border">
      <ScrollArea orientation="horizontal">
        <ul className="flex w-max gap-1">
          {LINKS.map((link) => {
            const current = "exact" in link ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  className="inline-block border-b-3 border-transparent px-3 py-2 text-sm font-medium no-underline hover:border-border aria-[current=page]:border-primary aria-[current=page]:text-primary"
                >
                  {t.sellerArea[link.key]}
                </Link>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </nav>
  );
}
