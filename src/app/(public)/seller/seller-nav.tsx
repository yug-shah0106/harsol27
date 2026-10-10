"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";

const LINKS = [
  { href: "/seller", label: "Overview", exact: true },
  { href: "/seller/products", label: "Products" },
  { href: "/seller/inquiries", label: "Inquiries" },
  { href: "/seller/subscription", label: "Subscription" },
] as const;

export function SellerNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seller" className="border-b border-border">
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
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </nav>
  );
}
