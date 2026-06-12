import { and, eq } from "drizzle-orm";

import { type RolePermissionMap } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db/client";
import { dashboardLayouts } from "@/lib/db/schema";
import {
  dashboardLayoutSchema,
  type DashboardLayoutInput,
} from "@/lib/validation/dashboard";
import {
  buildDefaultDashboardLayout,
  dashboardPageKey,
  getAvailableDashboardWidgets,
  type DashboardLayoutItem,
  type DashboardWidgetDefinition,
} from "@/modules/dashboard/dashboard-widget-registry";
import type { AppRole } from "@/types/domain";

function normalizeDashboardLayout(
  rawLayout: Array<{ widgetId: string; visible: boolean; size?: string }> | null | undefined,
  widgets: readonly DashboardWidgetDefinition[],
) {
  const fallbackLayout = buildDefaultDashboardLayout(widgets);

  if (!widgets.length) {
    return fallbackLayout;
  }

  if (!rawLayout?.length) {
    return fallbackLayout;
  }

  const availableIds = new Set(widgets.map((widget) => widget.id));
  const availableWidgetMap = new Map(widgets.map((widget) => [widget.id, widget]));
  const normalized: DashboardLayoutItem[] = [];
  const seen = new Set<string>();

  for (const item of rawLayout) {
    const widgetId = item.widgetId as DashboardLayoutItem["widgetId"];

    if (!availableIds.has(widgetId) || seen.has(widgetId)) {
      continue;
    }

    const widget = availableWidgetMap.get(widgetId);

    normalized.push({
      widgetId,
      visible: item.visible !== false,
      size:
        item.size === "full" ||
        item.size === "wide" ||
        item.size === "half" ||
        item.size === "narrow"
          ? item.size
          : widget?.size,
    });
    seen.add(widgetId);
  }

  for (const item of fallbackLayout) {
    if (!seen.has(item.widgetId)) {
      normalized.push(item);
    }
  }

  if (!normalized.some((item) => item.visible)) {
    normalized[0] = {
      ...normalized[0],
      visible: true,
    };
  }

  return normalized;
}

export async function getResolvedDashboardLayout(
  userId: string,
  role: AppRole,
  permissions: RolePermissionMap,
) {
  const db = await getDb();
  const availableWidgets = getAvailableDashboardWidgets(role, permissions);
  const defaultLayout = buildDefaultDashboardLayout(availableWidgets);

  const [saved] = await db
    .select({
      layout: dashboardLayouts.layout,
    })
    .from(dashboardLayouts)
    .where(
      and(
        eq(dashboardLayouts.userId, userId),
        eq(dashboardLayouts.pageKey, dashboardPageKey),
      ),
    )
    .limit(1);

  return {
    availableWidgets,
    defaultLayout,
    layout: normalizeDashboardLayout(saved?.layout ?? null, availableWidgets),
  };
}

export async function saveDashboardLayout(
  payload: DashboardLayoutInput,
  userId: string,
  role: AppRole,
  permissions: RolePermissionMap,
) {
  const parsed = dashboardLayoutSchema.parse(payload);
  const db = await getDb();
  const availableWidgets = getAvailableDashboardWidgets(role, permissions);
  const normalizedLayout = normalizeDashboardLayout(parsed.layout, availableWidgets);
  const now = new Date();

  await db
    .insert(dashboardLayouts)
    .values({
      userId,
      pageKey: dashboardPageKey,
      layout: normalizedLayout,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [dashboardLayouts.userId, dashboardLayouts.pageKey],
      set: {
        layout: normalizedLayout,
        updatedAt: now,
      },
    });

  return {
    availableWidgets,
    layout: normalizedLayout,
  };
}
