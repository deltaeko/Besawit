"use client";

import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  RotateCcw,
  Save,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type {
  DashboardLayoutItem,
  DashboardWidgetSize,
  DashboardWidgetDefinition,
} from "@/modules/dashboard/dashboard-widget-registry";

type DashboardLayoutCustomizerProps = {
  defaultLayout: DashboardLayoutItem[];
  layout: DashboardLayoutItem[];
  onLayoutChange: (layout: DashboardLayoutItem[]) => void;
  widgets: readonly DashboardWidgetDefinition[];
};

function moveItem(
  layout: DashboardLayoutItem[],
  index: number,
  direction: "up" | "down",
) {
  const nextIndex = direction === "up" ? index - 1 : index + 1;

  if (nextIndex < 0 || nextIndex >= layout.length) {
    return layout;
  }

  const nextLayout = [...layout];
  const current = nextLayout[index];

  nextLayout[index] = nextLayout[nextIndex];
  nextLayout[nextIndex] = current;

  return nextLayout;
}

function moveItemToIndex(layout: DashboardLayoutItem[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return layout;
  }

  const nextLayout = [...layout];
  const [movedItem] = nextLayout.splice(fromIndex, 1);

  if (!movedItem) {
    return layout;
  }

  nextLayout.splice(toIndex, 0, movedItem);
  return nextLayout;
}

export function DashboardLayoutCustomizer({
  defaultLayout,
  layout,
  onLayoutChange,
  widgets,
}: DashboardLayoutCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draggingWidgetId, setDraggingWidgetId] = useState<string | null>(null);
  const activeLayout = layout.filter((item) => item.visible);
  const hiddenLayout = layout.filter((item) => !item.visible);

  async function handleSave() {
    if (!layout.some((item) => item.visible)) {
      toast.error("Minimal satu widget harus tetap ditampilkan.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/dashboard/layout", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ layout }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(result.error ?? "Gagal menyimpan layout dashboard.");
        setIsSaving(false);
        return;
      }

      toast.success("Layout dashboard berhasil disimpan.");
      window.location.reload();
    } catch {
      toast.error("Terjadi gangguan saat menyimpan layout dashboard.");
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Dashboard sekarang bisa diatur per user. Anda bisa sembunyikan widget yang tidak perlu
          dan rapikan urutannya.
        </div>
        <Button
          onClick={() => setIsOpen((current) => !current)}
          type="button"
          variant={isOpen ? "default" : "outline"}
        >
          <LayoutGrid className="size-4" />
          {isOpen ? "Tutup Pengaturan" : "Atur Dashboard"}
        </Button>
      </div>

      {isOpen ? (
        <Card className="border-primary/15 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle>Atur Dashboard</CardTitle>
            <CardDescription>
              Susun widget yang perlu tampil lebih dulu. Anda bisa drag untuk ubah urutan,
              sembunyikan widget yang tidak perlu, dan atur lebar tampilannya per user.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Widget Aktif</div>
                <p className="text-sm text-muted-foreground">
                  Widget di bawah ini akan tampil di dashboard. Drag untuk ubah urutan, lalu klik
                  `Sembunyikan` jika ingin mengeluarkannya dari dashboard.
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {activeLayout.map((item, index) => {
                  const widget = widgets.find((entry) => entry.id === item.widgetId);

                  if (!widget) {
                    return null;
                  }

                  return (
                    <div
                      draggable
                      key={item.widgetId}
                      onDragEnd={() => setDraggingWidgetId(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDragStart={() => setDraggingWidgetId(item.widgetId)}
                    onDrop={() => {
                      if (!draggingWidgetId || draggingWidgetId === item.widgetId) {
                        return;
                      }

                      const fromIndex = layout.findIndex(
                          (entry) => entry.widgetId === draggingWidgetId,
                      );
                      const toIndex = layout.findIndex(
                          (entry) => entry.widgetId === item.widgetId,
                      );

                      onLayoutChange(moveItemToIndex(layout, fromIndex, toIndex));
                    }}
                    className="rounded-2xl border border-border/80 bg-background p-4 shadow-sm"
                  >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          <div className="cursor-grab rounded-xl border border-border/80 bg-muted/20 p-2 text-muted-foreground active:cursor-grabbing">
                            <GripVertical className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/75">
                              Widget {index + 1}
                            </div>
                            <div className="mt-1 font-semibold text-foreground">{widget.title}</div>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              {widget.description}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-full border border-border/80 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          {item.size ?? widget.size}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`size-${item.widgetId}`}>Lebar Widget</Label>
                          <Select
                            id={`size-${item.widgetId}`}
                            onChange={(event) => {
                              const nextSize = event.target.value as DashboardWidgetSize;

                              onLayoutChange(
                                layout.map((entry) =>
                                  entry.widgetId === item.widgetId
                                    ? { ...entry, size: nextSize }
                                    : entry,
                                ),
                              );
                            }}
                            value={item.size ?? widget.size}
                          >
                            <option value="full">Full</option>
                            <option value="wide">Wide</option>
                            <option value="half">Half</option>
                            <option value="narrow">Narrow</option>
                          </Select>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() =>
                              onLayoutChange(
                                layout.map((entry) =>
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
                            <EyeOff className="size-4" />
                            Sembunyikan
                          </Button>
                          <Button
                            disabled={index === 0}
                            onClick={() => {
                              const currentIndex = layout.findIndex(
                                (entry) => entry.widgetId === item.widgetId,
                              );
                              onLayoutChange(moveItem(layout, currentIndex, "up"));
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <ArrowUp className="size-4" />
                            Naik
                          </Button>
                          <Button
                            disabled={index === activeLayout.length - 1}
                            onClick={() => {
                              const currentIndex = layout.findIndex(
                                (entry) => entry.widgetId === item.widgetId,
                              );
                              const nextVisibleWidget = activeLayout[index + 1];

                              if (!nextVisibleWidget) {
                                return;
                              }

                              const targetIndex = layout.findIndex(
                                (entry) => entry.widgetId === nextVisibleWidget.widgetId,
                              );

                              onLayoutChange(moveItemToIndex(layout, currentIndex, targetIndex));
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <ArrowDown className="size-4" />
                            Turun
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 border-t border-border/80 pt-4">
              <div>
                <div className="text-sm font-semibold text-foreground">Widget Tersembunyi</div>
                <p className="text-sm text-muted-foreground">
                  Widget yang di-hide tidak akan tampil di dashboard, tapi bisa dimunculkan lagi
                  kapan saja dari sini.
                </p>
              </div>
              {hiddenLayout.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {hiddenLayout.map((item) => {
                    const widget = widgets.find((entry) => entry.id === item.widgetId);

                    if (!widget) {
                      return null;
                    }

                    return (
                      <div
                        key={item.widgetId}
                        className="rounded-2xl border border-dashed border-border/80 bg-muted/10 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                              Hidden Widget
                            </div>
                            <div className="mt-1 font-semibold text-foreground">{widget.title}</div>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              {widget.description}
                            </p>
                          </div>
                          <div className="rounded-full border border-border/80 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            {item.size ?? widget.size}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            onClick={() =>
                              onLayoutChange(
                                layout.map((entry) =>
                                  entry.widgetId === item.widgetId
                                    ? { ...entry, visible: true }
                                    : entry,
                                ),
                              )
                            }
                            size="sm"
                            type="button"
                          >
                            <Eye className="size-4" />
                            Tampilkan Lagi
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 p-4 text-sm text-muted-foreground">
                  Belum ada widget yang disembunyikan.
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-4">
              <div className="text-sm text-muted-foreground">
                {activeLayout.length} widget aktif, {hiddenLayout.length} widget tersembunyi.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => onLayoutChange(defaultLayout)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RotateCcw className="size-4" />
                  Reset Default
                </Button>
                <Button disabled={isSaving} onClick={handleSave} size="sm" type="button">
                  <Save className="size-4" />
                  {isSaving ? "Menyimpan..." : "Simpan Layout"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
