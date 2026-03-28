import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="shadow-sm print:break-inside-avoid print:border-border/60 print:shadow-none">
      <CardHeader className="border-b border-border/70 px-5 py-4 print:px-4 print:py-3">
        <CardTitle className="text-base tracking-tight">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="px-5 py-5 print:px-4 print:py-4">{children}</CardContent>
    </Card>
  );
}
