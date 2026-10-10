import { Button } from "@/components/ui/button";

/** The centred card used by sign in, create account and the password pages. */
export function AuthCard({ title, description, children, footer }: { title: string; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:py-16">
      <div className="flex flex-col gap-6 rounded-xl border border-border bg-card px-5 py-8 sm:px-10 sm:py-10 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-4xl leading-tight tracking-tight text-primary sm:text-5xl">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {children}
        {footer && <p className="text-center">{footer}</p>}
      </div>
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      OR
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  );
}

/**
 * "Continue with Google": a plain link (not next/link, which would prefetch it) to the route that
 * sends the browser to Google. Shown only when Google sign-in is configured.
 */
export function GoogleButton({ next }: { next: string }) {
  return (
    <Button asChild variant="outline" size="lg" className="w-full border-input font-semibold">
      <a href={`/sign-in/google?next=${encodeURIComponent(next)}`}>
        <GoogleLogo />
        Continue with Google
      </a>
    </Button>
  );
}

/** Google's "G", as its sign-in branding asks. Presentation attributes, so the CSP allows it. */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false" className="size-5">
      <path fill="#EA4335" d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z" />
      <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#FBBC05" d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9.008 9.008 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z" />
    </svg>
  );
}
