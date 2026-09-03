export type NotificationType = "critical" | "actionable" | "informational" | "silent_insight";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  source: string | null;
  readAt: string | null;
  createdAt: string;
}
