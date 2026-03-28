import type { ReactNode } from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

export function SimpleTable({
  columns,
  rows,
  linkColumn,
  getHref,
  columnLabels,
  numericColumns = [],
  cellRenderers,
  density = "default",
}: {
  columns: string[];
  rows: Record<string, unknown>[];
  linkColumn?: string;
  getHref?: (row: Record<string, unknown>) => string | null;
  columnLabels?: Partial<Record<string, string>>;
  numericColumns?: string[];
  cellRenderers?: Partial<
    Record<string, (value: unknown, row: Record<string, unknown>) => ReactNode>
  >;
  density?: "default" | "compact";
}) {
  const isCompact = density === "compact";

  return (
    <Card className="shadow-sm print:break-inside-avoid print:shadow-none">
      <CardContent className="overflow-x-auto p-0 print:overflow-visible">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  className={cn(
                    isCompact
                      ? "h-10 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                      : "h-11 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground print:h-9 print:text-[10px]",
                    numericColumns.includes(column) && "text-right",
                  )}
                  key={column}
                >
                  {columnLabels?.[column] ?? column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow
                className={
                  getHref?.(row)
                    ? isCompact
                      ? "h-12 transition-colors hover:bg-muted/30"
                      : "h-14 transition-colors hover:bg-muted/30"
                    : isCompact
                      ? "h-12"
                      : "h-14"
                }
                key={index}
              >
                {columns.map((column) => {
                  const value = row[column];
                  const href = getHref?.(row) ?? null;
                  const rendered =
                    cellRenderers?.[column]?.(value, row) ??
                    ((typeof value === "number" && column.toLowerCase().includes("amount"))
                      ? formatCurrency(Number(value ?? 0))
                      : String(value ?? "-"));

                  return (
                    <TableCell
                      className={cn(
                        isCompact ? "py-2.5 align-middle" : "py-3.5 align-middle print:py-2",
                        numericColumns.includes(column) && "text-right tabular-nums",
                      )}
                      key={`${index}-${column}`}
                    >
                      {href && column === linkColumn ? (
                        <Link
                          className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
                          href={href}
                        >
                          {rendered}
                        </Link>
                      ) : (
                        rendered
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
