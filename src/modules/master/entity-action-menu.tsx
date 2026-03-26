import Link from "next/link";

import { Button } from "@/components/ui/button";
import { StatusToggleButton } from "@/modules/master/status-toggle-button";

export function EntityActionMenu({
  viewHref,
  editHref,
  statusApiPath,
  isActive,
  supportsStatusToggle,
  extraHref,
  extraLabel,
}: {
  viewHref: string;
  editHref: string;
  statusApiPath: string;
  isActive: boolean;
  supportsStatusToggle: boolean;
  extraHref?: string;
  extraLabel?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm" variant="ghost">
        <Link href={viewHref}>Lihat</Link>
      </Button>
      {extraHref && extraLabel ? (
        <Button asChild size="sm" variant="outline">
          <Link href={extraHref}>{extraLabel}</Link>
        </Button>
      ) : null}
      <Button asChild size="sm" variant="outline">
        <Link href={editHref}>Edit</Link>
      </Button>
      {supportsStatusToggle ? (
        <StatusToggleButton apiPath={statusApiPath} isActive={isActive} />
      ) : null}
    </div>
  );
}
