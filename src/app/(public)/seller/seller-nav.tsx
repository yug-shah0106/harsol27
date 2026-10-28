"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n";
import { ScrollArea } from "@/components/ui/scroll-area";

// Inquiries and subscription appear once the company is verified (approved); the product listing says how to get there.
const LINKS = [
  { href: "/seller/dashboard", key: "dashboard", approvedOnly: false },
  { href: "/seller/companyverification", key: "verification", approvedOnly: false },
  { href: "/seller/products", key: "products", approvedOnly: false },
  { href: "/seller/inquiries", key: "inquiries", approvedOnly: true },
  { href: "/seller/subscription", key: "subscription", approvedOnly: true },
] as const;

export function SellerNav({ approved = true }: { approved?: boolean }) {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav aria-label={t.sellerArea.nav} className="border-b border-border">
      <ScrollArea orientation="horizontal">
        <ul className="flex w-max gap-1">
          {LINKS.filter((link) => approved || !link.approvedOnly).map((link) => {
            const current = pathname.startsWith(link.href);
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
