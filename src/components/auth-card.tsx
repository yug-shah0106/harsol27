
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
