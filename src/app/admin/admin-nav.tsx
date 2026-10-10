"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";

const LINKS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/sellers", label: "Sellers" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/inquiries", label: "Inquiries" },
  { href: "/admin/industries", label: "Industries" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="border-b border-border bg-card px-4 sm:px-6">
      <ScrollArea orientation="horizontal" className="[--scroll-bg:var(--card)]">
        <ul className="flex w-max gap-1">
          {LINKS.map((link) => {
            const current = "exact" in link ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  className="inline-block border-b-3 border-transparent px-3 py-3 text-sm font-medium no-underline hover:border-border aria-[current=page]:border-primary aria-[current=page]:text-primary"
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
