import { ImageOff } from "lucide-react";
import Link from "next/link";
import { ProductPhoto } from "@/components/product-photo";
import type { ProductCard as ProductCardData } from "@/server/catalog";

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, i) => (
        <li key={product.id} data-reveal>
          <ProductCard product={product} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const photo = product.photos[0];
  return (
    <Link
      href={`/products/${product.slug}`}
      data-spotlight
      className="spotlight group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card no-underline transition-transform duration-300 hover:-translate-y-1 hover:border-primary"
    >
      <div className="aspect-[4/3] overflow-hidden bg-secondary">
        {photo ? (
          <ProductPhoto
            id={photo.id}
            alt=""
            sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
            priority={priority}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff aria-hidden="true" className="size-8" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="font-semibold group-hover:underline">{product.name}</span>
        <span className="text-sm text-muted-foreground">{product.seller.companyName}</span>
        <span className="mt-auto pt-2 text-sm text-muted-foreground">
          {product.seller.city}, {product.seller.state} · {product.industry.name}
        </span>
      </div>
    </Link>
  );
}
