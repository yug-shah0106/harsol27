import { Toran } from "@/components/festive";
import { Wordmark } from "@/components/site-header";

/** The staff pages (sign in, forgot and reset password): the toran, the logo and name top left like the site header, then the page. */
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toran />
      <header className="px-4 py-3 sm:px-6 lg:px-10">
        <Wordmark />
      </header>
      {children}
    </>
  );
}
