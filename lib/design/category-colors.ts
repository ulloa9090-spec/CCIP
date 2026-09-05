/**
 * Shared category-color system (Design System Premium Polish, ADR 0019 —
 * originated on the Dashboard, now reused across Tasks/Habits/Analytics).
 * Purely decorative categorization — never used for interactive elements,
 * which stay on the single `--accent` token everywhere in the app.
 *
 * Literal records, not string interpolation, because Tailwind's compiler
 * needs to see each class name as-written to include it in the build.
 */

export type CategoryColor =
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

export const CATEGORY_COLORS: readonly CategoryColor[] = [
  "blue",
  "indigo",
  "violet",
  "cyan",
  "teal",
  "orange",
  "amber",
  "rose",
  "pink",
  "sky",
  "slate",
];

/** Icon/text chip — a soft tinted background with matching text (widget icons, metric cards). */
export const CATEGORY_CHIP_CLASSES: Record<CategoryColor, string> = {
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

/** Small solid dot — a stable per-item identifier (activity feed, habit rows). */
export const CATEGORY_DOT_CLASSES: Record<CategoryColor, string> = {
  blue: "bg-category-blue",
  indigo: "bg-category-indigo",
  violet: "bg-category-violet",
  cyan: "bg-category-cyan",
  teal: "bg-category-teal",
  orange: "bg-category-orange",
  amber: "bg-category-amber",
  rose: "bg-category-rose",
  pink: "bg-category-pink",
  sky: "bg-category-sky",
  slate: "bg-category-slate",
};

/** Border-only — column accents, left-border strips. */
export const CATEGORY_BORDER_CLASSES: Record<CategoryColor, string> = {
  blue: "border-category-blue",
  indigo: "border-category-indigo",
  violet: "border-category-violet",
  cyan: "border-category-cyan",
  teal: "border-category-teal",
  orange: "border-category-orange",
  amber: "border-category-amber",
  rose: "border-category-rose",
  pink: "border-category-pink",
  sky: "border-category-sky",
  slate: "border-category-slate",
};

/** Border + soft background tint together — e.g. a drop-target highlight. */
export const CATEGORY_SURFACE_CLASSES: Record<CategoryColor, string> = {
  blue: "border-category-blue bg-category-blue/5",
  indigo: "border-category-indigo bg-category-indigo/5",
  violet: "border-category-violet bg-category-violet/5",
  cyan: "border-category-cyan bg-category-cyan/5",
  teal: "border-category-teal bg-category-teal/5",
  orange: "border-category-orange bg-category-orange/5",
  amber: "border-category-amber bg-category-amber/5",
  rose: "border-category-rose bg-category-rose/5",
  pink: "border-category-pink bg-category-pink/5",
  sky: "border-category-sky bg-category-sky/5",
  slate: "border-category-slate bg-category-slate/5",
};

/** The raw CSS custom property, for contexts that need a literal color string (e.g. Recharts `stroke`). */
export const CATEGORY_CSS_VAR: Record<CategoryColor, string> = {
  blue: "var(--category-blue)",
  indigo: "var(--category-indigo)",
  violet: "var(--category-violet)",
  cyan: "var(--category-cyan)",
  teal: "var(--category-teal)",
  orange: "var(--category-orange)",
  amber: "var(--category-amber)",
  rose: "var(--category-rose)",
  pink: "var(--category-pink)",
  sky: "var(--category-sky)",
  slate: "var(--category-slate)",
};

/**
 * Deterministic color for an entity with no fixed category (e.g. a
 * user-created Habit) — same id always resolves to the same color, stable
 * across renders and independent of list order/position.
 */
export function pickCategoryColor(seed: string): CategoryColor {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index]!;
}
