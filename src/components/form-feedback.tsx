import { CircleAlert, CircleCheck } from "lucide-react";

/** Error under a field: icon + text, so it never relies on colour alone. Linked via aria-describedby. */
export function FieldMessage({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm font-medium text-destructive">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

/** Form-level result. role=alert/status makes screen readers announce it as soon as it appears. */
export function FormAlert({ kind, children, id }: { kind: "error" | "success"; children: React.ReactNode; id?: string }) {
  const Icon = kind === "error" ? CircleAlert : CircleCheck;
  return (
    <div
      id={id}
      role={kind === "error" ? "alert" : "status"}
      className={
        kind === "error"
          ? "flex items-start gap-2 rounded-lg border border-destructive bg-card p-3 text-sm text-destructive"
          : "flex items-start gap-2 rounded-lg border border-success bg-card p-3 text-sm text-success"
      }
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="font-medium">{children}</div>
    </div>
  );
}
