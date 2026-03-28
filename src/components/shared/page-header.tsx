import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  stackAction,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  stackAction?: boolean;
}) {
  return (
    <div
      className={
        stackAction
          ? "flex flex-col gap-4 rounded-2xl border border-border/80 bg-card px-5 py-4 shadow-sm"
          : "flex flex-col gap-4 rounded-2xl border border-border/80 bg-card px-5 py-4 shadow-sm md:flex-row md:items-start md:justify-between md:gap-6"
      }
    >
      <div className="space-y-1.5 md:flex-1">
        {eyebrow ? (
          <div className="font-mono text-[11px] uppercase tracking-[0.26em] text-primary/80">
            {eyebrow}
          </div>
        ) : null}
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{title}</h1>
          {description ? (
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? (
        <div
          className={
            stackAction
              ? "flex w-full min-w-0 flex-wrap items-center gap-3"
              : "flex w-full min-w-0 flex-wrap items-center gap-3 md:w-auto md:max-w-full md:justify-end"
          }
        >
          {action}
        </div>
      ) : null}
    </div>
  );
}
