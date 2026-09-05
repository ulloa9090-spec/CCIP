import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_CHIP_CLASSES, type CategoryColor } from "@/lib/design/category-colors";

export function WidgetCard({
  title,
  icon,
  accent,
  action,
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  /** Category color for the icon chip — purely decorative, see lib/design/category-colors.ts. */
  accent?: CategoryColor;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          {icon && (
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-(--radius-token-sm)",
                accent ? CATEGORY_CHIP_CLASSES[accent] : "text-text-secondary",
              )}
            >
              {icon}
            </span>
          )}
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  );
}
