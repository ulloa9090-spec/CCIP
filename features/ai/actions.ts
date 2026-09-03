"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AIUnavailableError, getAIProvider, type StructuredSchema } from "@/lib/ai/provider";
import { createTask, rescheduleTask } from "@/features/tasks/actions";
import { getOverdueAndCriticalTasks, weekStartDate } from "@/features/tasks/queries";
import { addMilestone } from "@/features/projects/actions";
import type { ActionResult } from "@/lib/types/action-result";
import {
  buildDecisionAssistantContext,
  buildEveningReviewContext,
  buildMorningBriefContext,
  buildPlanningContext,
  buildWeeklyCoachContext,
} from "./context";
import { getInsightById, getMessages, getRecentThreadForContext } from "./queries";
import type { AiInsightPayload, PlanBreakdownPayload, SuggestReschedulePayload } from "./types";

async function requireUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

/** Per-user provider override (Settings → AI Provider); `null` falls back
 * to the deployment's `AI_PROVIDER` env var inside `getAIProvider()`. */
async function resolveUserProvider(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase.from("settings").select("ai_provider").eq("user_id", userId).maybeSingle();
  return data?.ai_provider ?? null;
}

function revalidateAiViews(threadId?: string) {
  revalidatePath("/ai-coach");
  if (threadId) revalidatePath(`/ai-coach/${threadId}`);
}

const MORNING_BRIEF_SYSTEM_PROMPT =
  "You are Atlas OS's Morning Brief assistant. Given the user's tasks, active project, weekly priorities, calendar, and habits for today, write a short (3-5 sentence), encouraging but direct morning briefing. Reference specifics from the data given, never invent anything not given. Plain prose, no markdown headers.";

const EVENING_REVIEW_SYSTEM_PROMPT =
  "You are Atlas OS's Evening Review assistant. Given what the user completed today vs. planned, their focus time, and habit marks, write a short (3-5 sentence) reflective evening summary — acknowledge what went well, note what didn't happen without guilt-tripping. Plain prose, no markdown headers.";

const WEEKLY_COACH_SYSTEM_PROMPT =
  "You are Atlas OS's Weekly Coach. Given this week's aggregated metrics and recent Weekly Execution Score history, write a short (2-4 sentence) coaching message grounded only in the actual numbers given. If, and only if, one of the listed overdue/critical tasks would clearly benefit from being rescheduled, propose moving exactly that one task by its exact given id; otherwise set suggestReschedule to null. Never invent a task id that wasn't listed.";

const PLANNING_SYSTEM_PROMPT =
  "You are Atlas OS's Planning Assistant. Given a Goal or Project and what's already been broken down for it, propose a short list (3-8 items) of concrete next milestones/tasks that would move it forward, without duplicating anything already listed. Milestones only make sense for a Project, never for a Goal. Keep each title concise and actionable.";

const DECISION_ASSISTANT_SYSTEM_PROMPT =
  "You are Atlas OS's Decision Assistant. Given a decision the user is weighing and any related past decisions (with their outcomes and lessons), offer a short (3-5 sentence) perspective — surface a relevant pattern from past decisions if one exists, otherwise offer a balanced framing of the options given. You are advisory only; you never decide for the user.";

// ---------------------------------------------------------------------------
// Generate-on-demand cards (READ tier — no insight, no write path)
// ---------------------------------------------------------------------------

export async function generateMorningBrief() {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const todayStr = new Date().toISOString().slice(0, 10);

  const existingThread = await getRecentThreadForContext("morning_brief", `${todayStr}T00:00:00.000Z`);
  let threadId: string;
  if (existingThread) {
    threadId = existingThread.id;
  } else {
    const { data, error } = await supabase
      .from("ai_threads")
      .insert({ user_id: userId, title: `Morning Brief — ${todayStr}`, context_type: "morning_brief" })
      .select("id")
      .single();
    if (error || !data) throw new Error("Couldn't start the Morning Brief.");
    threadId = data.id;
  }

  const alreadyAnswered = (await getMessages(threadId)).some((m) => m.role === "assistant");
  if (!alreadyAnswered) {
    try {
      const context = await buildMorningBriefContext();
      const provider = await getAIProvider(await resolveUserProvider(supabase, userId));
      const response = await provider.chatCompletion([{ role: "user", content: context.promptText }], {
        system: MORNING_BRIEF_SYSTEM_PROMPT,
        maxTokens: 400,
      });
      await supabase.from("ai_messages").insert([
        { thread_id: threadId, role: "user", content: context.promptText },
        { thread_id: threadId, role: "assistant", content: response.content },
      ]);
    } catch (err) {
      if (!(err instanceof AIUnavailableError)) console.error("Morning Brief generation failed", err);
    }
  }

  revalidateAiViews();
  redirect(`/ai-coach/${threadId}`);
}

export async function generateEveningReview() {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const todayStr = new Date().toISOString().slice(0, 10);

  const existingThread = await getRecentThreadForContext("evening_review", `${todayStr}T00:00:00.000Z`);
  let threadId: string;
  if (existingThread) {
    threadId = existingThread.id;
  } else {
    const { data, error } = await supabase
      .from("ai_threads")
      .insert({ user_id: userId, title: `Evening Review — ${todayStr}`, context_type: "evening_review" })
      .select("id")
      .single();
    if (error || !data) throw new Error("Couldn't start the Evening Review.");
    threadId = data.id;
  }

  const alreadyAnswered = (await getMessages(threadId)).some((m) => m.role === "assistant");
  if (!alreadyAnswered) {
    try {
      const context = await buildEveningReviewContext();
      const provider = await getAIProvider(await resolveUserProvider(supabase, userId));
      const response = await provider.chatCompletion([{ role: "user", content: context.promptText }], {
        system: EVENING_REVIEW_SYSTEM_PROMPT,
        maxTokens: 400,
      });
      await supabase.from("ai_messages").insert([
        { thread_id: threadId, role: "user", content: context.promptText },
        { thread_id: threadId, role: "assistant", content: response.content },
      ]);
    } catch (err) {
      if (!(err instanceof AIUnavailableError)) console.error("Evening Review generation failed", err);
    }
  }

  revalidateAiViews();
  redirect(`/ai-coach/${threadId}`);
}

// ---------------------------------------------------------------------------
// SUGGEST tier — Weekly Coach + Planning Assistant, each may write an
// ai_insights row that only becomes a real change once the user Approves.
// ---------------------------------------------------------------------------

interface WeeklyCoachResult {
  message: string;
  suggestReschedule: { taskId: string; toDate: string; reason: string } | null;
}

const WEEKLY_COACH_SCHEMA: StructuredSchema = {
  name: "weekly_coach_response",
  description: "A short weekly coaching message, and optionally one task to suggest rescheduling.",
  schema: {
    type: "object",
    properties: {
      message: { type: "string", description: "2-4 sentence coaching message referencing the week's actual numbers." },
      suggestReschedule: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            properties: {
              taskId: { type: "string" },
              toDate: { type: "string", description: "yyyy-mm-dd" },
              reason: { type: "string" },
            },
            required: ["taskId", "toDate", "reason"],
          },
        ],
      },
    },
    required: ["message", "suggestReschedule"],
  },
};

export async function generateWeeklyCoach(weekStart: string = weekStartDate()) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const existingThread = await getRecentThreadForContext("weekly_coach", `${weekStart}T00:00:00.000Z`);
  let threadId: string;
  if (existingThread) {
    threadId = existingThread.id;
  } else {
    const { data, error } = await supabase
      .from("ai_threads")
      .insert({ user_id: userId, title: `Weekly Coach — week of ${weekStart}`, context_type: "weekly_coach" })
      .select("id")
      .single();
    if (error || !data) throw new Error("Couldn't start the Weekly Coach.");
    threadId = data.id;
  }

  const alreadyAnswered = (await getMessages(threadId)).some((m) => m.role === "assistant");
  if (!alreadyAnswered) {
    try {
      const context = await buildWeeklyCoachContext(weekStart);
      const overdueTasks = await getOverdueAndCriticalTasks();
      const promptWithTaskIds = `${context.promptText}\n\nOverdue/critical tasks available to suggest rescheduling (id: title): ${
        overdueTasks.map((t) => `${t.id}: ${t.title}`).join("; ") || "none"
      }.`;

      const provider = await getAIProvider(await resolveUserProvider(supabase, userId));
      const result = await provider.structuredCompletion<WeeklyCoachResult>(
        [{ role: "user", content: promptWithTaskIds }],
        WEEKLY_COACH_SCHEMA,
        { system: WEEKLY_COACH_SYSTEM_PROMPT, maxTokens: 500 },
      );

      await supabase.from("ai_messages").insert([
        { thread_id: threadId, role: "user", content: context.promptText },
        { thread_id: threadId, role: "assistant", content: result.message },
      ]);

      const suggested = result.suggestReschedule;
      const targetTask = suggested ? overdueTasks.find((t) => t.id === suggested.taskId) : undefined;
      if (suggested && targetTask) {
        const payload: SuggestReschedulePayload = {
          kind: "suggest_reschedule",
          taskId: targetTask.id,
          taskTitle: targetTask.title,
          fromDate: targetTask.dueDate,
          toDate: suggested.toDate,
          reason: suggested.reason,
        };
        await supabase.from("ai_insights").insert({ user_id: userId, thread_id: threadId, type: "suggest_reschedule", payload });
      }
    } catch (err) {
      if (!(err instanceof AIUnavailableError)) console.error("Weekly Coach generation failed", err);
    }
  }

  revalidateAiViews();
  redirect(`/ai-coach/${threadId}`);
}

interface PlanningResult {
  message: string;
  items: { title: string; kind: "milestone" | "task"; priority?: string }[];
}

const PLANNING_SCHEMA: StructuredSchema = {
  name: "planning_breakdown",
  description: "A short message plus a breakdown of milestones/tasks to accomplish the target.",
  schema: {
    type: "object",
    properties: {
      message: { type: "string" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            kind: { type: "string", enum: ["milestone", "task"] },
            priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
          },
          required: ["title", "kind"],
        },
      },
    },
    required: ["message", "items"],
  },
};

export async function startPlanningAssistant(targetType: "goal" | "project", targetId: string) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const context = await buildPlanningContext(targetType, targetId);
  const targetTitle = String((context.summary as { targetTitle: string }).targetTitle);

  const { data: threadRow, error: threadError } = await supabase
    .from("ai_threads")
    .insert({ user_id: userId, title: `Planning: ${targetTitle}`, context_type: "planning" })
    .select("id")
    .single();
  if (threadError || !threadRow) throw new Error("Couldn't start the Planning Assistant.");
  const threadId = threadRow.id as string;

  await supabase.from("ai_messages").insert({ thread_id: threadId, role: "user", content: context.promptText });

  try {
    const provider = await getAIProvider(await resolveUserProvider(supabase, userId));
    const result = await provider.structuredCompletion<PlanningResult>(
      [{ role: "user", content: context.promptText }],
      PLANNING_SCHEMA,
      { system: PLANNING_SYSTEM_PROMPT, maxTokens: 700 },
    );

    await supabase.from("ai_messages").insert({ thread_id: threadId, role: "assistant", content: result.message });

    if (result.items.length > 0) {
      const payload: PlanBreakdownPayload = {
        kind: "plan_breakdown",
        targetType,
        targetId,
        targetTitle,
        items: result.items,
      };
      await supabase.from("ai_insights").insert({ user_id: userId, thread_id: threadId, type: "plan_breakdown", payload });
    }
  } catch (err) {
    if (!(err instanceof AIUnavailableError)) console.error("Planning Assistant generation failed", err);
  }

  revalidateAiViews();
  redirect(`/ai-coach/${threadId}`);
}

// ---------------------------------------------------------------------------
// Decision Assistant (READ tier, advisory only — supports continued chat)
// ---------------------------------------------------------------------------

export async function startDecisionAssistant(decisionId: string) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const context = await buildDecisionAssistantContext(decisionId);
  const title = String((context.summary as { title: string }).title);

  const { data: threadRow, error } = await supabase
    .from("ai_threads")
    .insert({ user_id: userId, title: `Decision: ${title}`, context_type: "decision_assistant" })
    .select("id")
    .single();
  if (error || !threadRow) throw new Error("Couldn't start the Decision Assistant.");
  const threadId = threadRow.id as string;

  await supabase.from("ai_messages").insert({ thread_id: threadId, role: "user", content: context.promptText });

  try {
    const provider = await getAIProvider(await resolveUserProvider(supabase, userId));
    const response = await provider.chatCompletion([{ role: "user", content: context.promptText }], {
      system: DECISION_ASSISTANT_SYSTEM_PROMPT,
      maxTokens: 400,
    });
    await supabase.from("ai_messages").insert({ thread_id: threadId, role: "assistant", content: response.content });
  } catch (err) {
    if (!(err instanceof AIUnavailableError)) console.error("Decision Assistant generation failed", err);
  }

  revalidateAiViews();
  redirect(`/ai-coach/${threadId}`);
}

// ---------------------------------------------------------------------------
// Freeform chat
// ---------------------------------------------------------------------------

export async function startFreeformThread(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "Message can't be empty." };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const title = content.length > 60 ? `${content.slice(0, 57)}...` : content;
  const { data: threadRow, error: threadError } = await supabase
    .from("ai_threads")
    .insert({ user_id: userId, title, context_type: "freeform" })
    .select("id")
    .single();
  if (threadError || !threadRow) return { error: "Couldn't start a new conversation." };
  const threadId = threadRow.id as string;

  await supabase.from("ai_messages").insert({ thread_id: threadId, role: "user", content });

  try {
    const provider = await getAIProvider(await resolveUserProvider(supabase, userId));
    const response = await provider.chatCompletion([{ role: "user", content }], { maxTokens: 700 });
    await supabase.from("ai_messages").insert({ thread_id: threadId, role: "assistant", content: response.content });
  } catch (err) {
    if (!(err instanceof AIUnavailableError)) console.error("Freeform chat generation failed", err);
  }

  revalidatePath("/ai-coach");
  redirect(`/ai-coach/${threadId}`);
}

/** Continues an existing thread (freeform or decision_assistant) — the
 * only chat action that returns instead of redirecting, since the user
 * stays on the same thread page. */
export async function sendChatMessage(threadId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "Message can't be empty." };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { error: insertError } = await supabase.from("ai_messages").insert({ thread_id: threadId, role: "user", content });
  if (insertError) return { error: "Couldn't send that message. Try again." };

  try {
    const priorMessages = await getMessages(threadId);
    const provider = await getAIProvider(await resolveUserProvider(supabase, userId));
    const response = await provider.chatCompletion(
      priorMessages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
      { maxTokens: 700 },
    );
    await supabase.from("ai_messages").insert({ thread_id: threadId, role: "assistant", content: response.content });
  } catch (err) {
    revalidateAiViews(threadId);
    return {
      error: err instanceof AIUnavailableError ? "AI Coach is unavailable right now." : "Something went wrong generating a reply.",
    };
  }

  revalidateAiViews(threadId);
  return {};
}

// ---------------------------------------------------------------------------
// Insight Approve / Modify / Ignore (blueprint §M.3 — the only write path;
// every write below calls the exact same Server Action a human edit uses).
// ---------------------------------------------------------------------------

export async function approveInsight(insightId: string, editedPayload?: AiInsightPayload): Promise<ActionResult> {
  const supabase = await createClient();
  await requireUserId(supabase);

  const insight = await getInsightById(insightId);
  if (!insight || insight.status !== "pending") return { error: "This suggestion is no longer pending." };

  const payload = editedPayload ?? insight.payload;

  if (payload.kind === "plan_breakdown") {
    for (const item of payload.items) {
      if (item.kind === "milestone" && payload.targetType === "project") {
        const milestoneForm = new FormData();
        milestoneForm.set("title", item.title);
        milestoneForm.set("targetDate", "");
        await addMilestone(payload.targetId, {}, milestoneForm);
      } else {
        const taskForm = new FormData();
        taskForm.set("title", item.title);
        taskForm.set("description", "");
        taskForm.set("projectId", payload.targetType === "project" ? payload.targetId : "");
        taskForm.set("goalId", payload.targetType === "goal" ? payload.targetId : "");
        taskForm.set("status", "inbox");
        taskForm.set("priority", item.priority ?? "medium");
        taskForm.set("dueDate", "");
        taskForm.set("scheduledDate", "");
        await createTask({}, taskForm);
      }
    }
  } else if (payload.kind === "suggest_reschedule") {
    await rescheduleTask(payload.taskId, payload.toDate);
  }

  await supabase
    .from("ai_insights")
    .update({ status: "approved", resolved_at: new Date().toISOString(), payload })
    .eq("id", insightId);

  revalidateAiViews(insight.threadId ?? undefined);
  revalidatePath("/dashboard");
  return { message: "Applied." };
}

export async function rejectInsight(insightId: string): Promise<ActionResult> {
  const supabase = await createClient();
  await requireUserId(supabase);

  const insight = await getInsightById(insightId);
  if (!insight) return { error: "Suggestion not found." };

  await supabase.from("ai_insights").update({ status: "rejected", resolved_at: new Date().toISOString() }).eq("id", insightId);

  revalidateAiViews(insight.threadId ?? undefined);
  return { message: "Ignored." };
}
