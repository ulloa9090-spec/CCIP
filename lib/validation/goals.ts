import { z } from "zod";

export const GOAL_TIMEFRAMES = ["lifetime", "5yr", "3yr", "1yr", "90day", "monthly"] as const;
export const GOAL_STATUSES = ["planned", "active", "paused", "completed", "cancelled"] as const;

export const lifeAreaSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(60, "Keep it under 60 characters."),
  color: z.string().trim().optional(),
  icon: z.string().trim().optional(),
});
export type LifeAreaInput = z.infer<typeof lifeAreaSchema>;

export const goalSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200, "Keep it under 200 characters."),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  areaId: z.string().uuid("Choose a Life Area."),
  quarterCycleId: z.string().uuid().optional().or(z.literal("")),
  timeframe: z.enum(GOAL_TIMEFRAMES),
  targetDate: z.string().optional().or(z.literal("")),
  status: z.enum(GOAL_STATUSES),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type GoalInput = z.infer<typeof goalSchema>;

const numericField = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v === "" || v === undefined ? null : Number(v)))
  .refine((v) => v === null || Number.isFinite(v), "Must be a number.");

export const goalMetricSchema = z.object({
  metricName: z.string().trim().min(1, "Metric name is required.").max(120),
  startingValue: numericField,
  targetValue: numericField,
  currentValue: numericField,
  unit: z.string().trim().max(20).optional().or(z.literal("")),
});
export type GoalMetricInput = z.infer<typeof goalMetricSchema>;

export const quarterCycleSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(200),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
    expectedOutcome: z.string().trim().max(2000).optional().or(z.literal("")),
    primaryIndicator: z.string().trim().max(200).optional().or(z.literal("")),
    strategy: z.string().trim().max(2000).optional().or(z.literal("")),
    risks: z.string().trim().max(2000).optional().or(z.literal("")),
    milestone1: z.string().trim().max(200).optional().or(z.literal("")),
    milestone2: z.string().trim().max(200).optional().or(z.literal("")),
    milestone3: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after the start date.",
    path: ["endDate"],
  });
export type QuarterCycleInput = z.infer<typeof quarterCycleSchema>;
