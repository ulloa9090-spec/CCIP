/**
 * Category color mapping for Dashboard widget icon chips (Design System
 * Premium Polish, iteration 2 — see ADR 0019). Purely decorative
 * categorization, distinct from `--accent` (which stays the single color
 * for every interactive element — buttons, links, focus rings). A literal
 * record, not string interpolation, because Tailwind's compiler needs to
 * see each class name as-written to include it in the build.
 */
export type WidgetAccent =
  | "blue"
  | "indigo"
  | "violet"
  | "cyan"
  | "teal"
  | "orange"
  | "amber"
  | "rose"
  | "pink"
  | "sky"
  | "slate";

export const WIDGET_ACCENT_CLASSES: Record<WidgetAccent, string> = {
  blue: "bg-category-blue/15 text-category-blue",
  indigo: "bg-category-indigo/15 text-category-indigo",
  violet: "bg-category-violet/15 text-category-violet",
  cyan: "bg-category-cyan/15 text-category-cyan",
  teal: "bg-category-teal/15 text-category-teal",
  orange: "bg-category-orange/15 text-category-orange",
  amber: "bg-category-amber/15 text-category-amber",
  rose: "bg-category-rose/15 text-category-rose",
  pink: "bg-category-pink/15 text-category-pink",
  sky: "bg-category-sky/15 text-category-sky",
  slate: "bg-category-slate/15 text-category-slate",
};
