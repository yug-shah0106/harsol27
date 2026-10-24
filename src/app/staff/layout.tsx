import { Toran } from "@/components/festive";
import { I18nProvider } from "@/components/i18n";
import { Wordmark } from "@/components/site-header";
import { MESSAGES } from "@/i18n";

/** The staff pages (sign in, forgot and reset password): the toran, the logo and name top left like the site header, then the page. In English. */
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider locale="en" messages={MESSAGES.en}>
      <Toran />
      <header className="px-4 py-3 sm:px-6 lg:px-10">
        <Wordmark />
      </header>
      {children}
    </I18nProvider>
  );
}
