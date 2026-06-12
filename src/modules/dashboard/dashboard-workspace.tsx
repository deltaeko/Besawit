"use client";

import { EyeOff } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { DashboardLayoutCustomizer } from "@/modules/dashboard/dashboard-layout-customizer";
import {
  getDashboardWidgetClassName,
  type DashboardLayoutItem,
  type DashboardWidgetDefinition,
  type DashboardWidgetId,
} from "@/modules/dashboard/dashboard-widget-registry";

type DashboardWorkspaceProps = {
  defaultLayout: DashboardLayoutItem[];
  initialLayout: DashboardLayoutItem[];
  widgets: readonly DashboardWidgetDefinition[];
  widgetItems: Array<{
    id: DashboardWidgetId;
    element: ReactNode;
  }>;
};

export function DashboardWorkspace({
  defaultLayout,
  initialLayout,
  widgets,
  widgetItems,
}: DashboardWorkspaceProps) {
  const [layout, setLayout] = useState(initialLayout);
  const widgetMap = useMemo(
    () => new Map(widgetItems.map((item) => [item.id, item.element])),
    [widgetItems],
  );

  return (
    <div className="space-y-6">
      <DashboardLayoutCustomizer
        defaultLayout={defaultLayout}
        layout={layout}
        onLayoutChange={setLayout}
        widgets={widgets}
      />

      <section className="grid gap-6 xl:grid-cols-12">
        {layout
          .filter((item) => item.visible)
          .map((item) => {
            const widgetDefinition = widgets.find((widget) => widget.id === item.widgetId);
            const widgetNode = widgetMap.get(item.widgetId);

            if (!widgetDefinition || !widgetNode) {
              return null;
            }

            return (
              <div
                key={item.widgetId}
                className={`relative ${getDashboardWidgetClassName(item.size ?? widgetDefinition.size)}`}
              >
                <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-2">
                  <div className="rounded-full border border-border/80 bg-background/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm backdrop-blur">
                    {widgetDefinition.title}
                  </div>
                  <Button
                    className="pointer-events-auto h-8 rounded-full border border-border/80 bg-background/95 px-3 text-xs shadow-sm backdrop-blur"
                    onClick={() =>
                      setLayout((current) =>
                        current.map((entry) =>
                          entry.widgetId === item.widgetId
                            ? { ...entry, visible: false }
                            : entry,
                        ),
                      )
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <EyeOff className="size-3.5" />
                    Hide
                  </Button>
                </div>
                {widgetNode}
              </div>
            );
          })}
      </section>
    </div>
  );
}
