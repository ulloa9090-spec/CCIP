import type { Theme } from '@shared/types/settings'

/**
 * Applies the theme as a `data-theme` attribute on `<html>`, matching the
 * selector in design-system/tokens.css. Shared by the initial load (App.tsx)
 * and the Settings toggle so the DOM mutation lives in exactly one place.
 */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}
