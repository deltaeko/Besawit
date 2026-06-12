import { z } from "zod";

import {
  dashboardWidgetIds,
  dashboardWidgetSizeOptions,
} from "@/modules/dashboard/dashboard-widget-registry";

export const dashboardWidgetIdSchema = z.enum(dashboardWidgetIds);
export const dashboardWidgetSizeSchema = z.enum(dashboardWidgetSizeOptions);

export const dashboardLayoutItemSchema = z.object({
  widgetId: dashboardWidgetIdSchema,
  visible: z.boolean().default(true),
  size: dashboardWidgetSizeSchema.optional(),
});

export const dashboardLayoutSchema = z.object({
  layout: z.array(dashboardLayoutItemSchema).min(1).max(dashboardWidgetIds.length),
});

export type DashboardLayoutInput = z.input<typeof dashboardLayoutSchema>;
export type DashboardLayoutItemInput = z.output<typeof dashboardLayoutItemSchema>;
