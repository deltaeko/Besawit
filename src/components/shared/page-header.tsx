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
  void eyebrow;
  void title;

  if (!description && !action) {
    return null;
  }

  return (
    <div
      className={
        stackAction
          ? "flex flex-col gap-3 rounded-[1.35rem] border border-white/85 bg-card/94 px-5 py-4 shadow-[0_20px_56px_-40px_rgba(20,37,24,0.18)] ring-1 ring-black/[0.02]"
          : "flex flex-col gap-3 rounded-[1.35rem] border border-white/85 bg-card/94 px-5 py-4 shadow-[0_20px_56px_-40px_rgba(20,37,24,0.18)] ring-1 ring-black/[0.02] md:flex-row md:items-start md:justify-between md:gap-6"
      }
    >
      {description ? (
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:flex-1">
          {description}
        </p>
      ) : (
        <div className="md:flex-1" />
      )}
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
