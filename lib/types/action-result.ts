/** Shared Server Action return shape — used by every useActionState-backed form. */
export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
}
