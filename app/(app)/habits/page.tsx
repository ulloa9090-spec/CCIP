import { CalendarCheck2 } from "lucide-react";
import { addDays, startOfWeek } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getHabitLogs, getHabitTimeSettings, getHabits } from "@/features/habits/queries";
import {
  computeConsistency,
  computeStreak,
  STREAK_LOOKBACK_DAYS,
  todayInTimezone,
  toDateStr,
} from "@/features/habits/progress";
import { NewHabitModal, HabitsView } from "@/features/habits/components";
import { getGoals } from "@/features/goals/queries";
import { getProjects } from "@/features/projects/queries";
import { getChallenges } from "@/features/challenges/queries";
import { NewChallengeModal, ChallengeListItem } from "@/features/challenges/components";

export default async function HabitsPage() {
  const [{ timezone, weekStartsOn }, goals, projects] = await Promise.all([
    getHabitTimeSettings(),
    getGoals(),
    getProjects(),
  ]);

  const today = todayInTimezone(timezone);
  const weekStart = startOfWeek(today, { weekStartsOn });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const heatmapDays = Array.from({ length: 30 }, (_, i) => addDays(today, -(29 - i)));
  const rangeStart = addDays(today, -(STREAK_LOOKBACK_DAYS - 1));

  const [habits, challenges] = await Promise.all([getHabits(), getChallenges()]);
  const logs = await getHabitLogs(
    habits.map((h) => h.id),
    toDateStr(rangeStart),
    toDateStr(today),
  );

  const doneDatesByHabit: Record<string, string[]> = {};
  for (const habit of habits) doneDatesByHabit[habit.id] = [];
  for (const log of logs) {
    if (log.completed) doneDatesByHabit[log.habitId]?.push(log.logDate);
  }

  const streaks: Record<string, number> = {};
  const consistency: Record<string, number | null> = {};
  for (const habit of habits) {
    const habitLogs = logs.filter((l) => l.habitId === habit.id);
    streaks[habit.id] = computeStreak(habit, habitLogs, today, weekStartsOn);
    consistency[habit.id] = computeConsistency(habit, habitLogs, today, 7, weekStartsOn);
  }

  const activeChallenges = challenges.filter((c) => c.status === "active");
  const pastChallenges = challenges.filter((c) => c.status !== "active");

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Habits"
        description="Consistency, not perfection — streaks freeze when you pause, they don't reset."
        action={<NewHabitModal goals={goals} projects={projects} />}
      />

      <div className="flex flex-col gap-6 p-6">
        {habits.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck2 className="h-8 w-8" />}
            title="No habits yet"
            description="Build your first consistency habit."
            action={<NewHabitModal goals={goals} projects={projects} />}
          />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <HabitsView
                habits={habits}
                weekDays={weekDays}
                heatmapDays={heatmapDays}
                doneDatesByHabit={doneDatesByHabit}
                streaks={streaks}
                consistency={consistency}
                today={today}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>21-Day Challenges</CardTitle>
            <NewChallengeModal goals={goals} />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {challenges.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Commit to a daily action for 21 days and track it here.
              </p>
            ) : (
              <>
                {activeChallenges.map((c) => (
                  <ChallengeListItem key={c.id} challenge={c} />
                ))}
                {pastChallenges.map((c) => (
                  <ChallengeListItem key={c.id} challenge={c} />
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
