import { useEffect, useMemo, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { DAILY_TARGETS, getActiveHabits, todayKey } from "@/lib/project35";
import { useHabitDay } from "@/lib/p35-cloud";
import { Beef, BookOpen, ChevronLeft, ChevronRight, Dumbbell, Footprints, Sunrise, Utensils } from "lucide-react";
import { toast } from "sonner";

export function NonNegotiables({ userId }: { userId: string | null }) {
  const actualToday = todayKey();
  const [selectedDay, setSelectedDay] = useState(actualToday);

  const { habits, toggle } = useHabitDay(userId, selectedDay);

  // Convert selected string date into Date object
  const currentDateObj = useMemo(() => {
    const [y, m, d] = selectedDay.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDay]);

  const activeHabits = useMemo(() => getActiveHabits(currentDateObj), [currentDateObj]);

  // Daily Journal Note persistence for the viewed date
  const journalKey = `p35_journal_${selectedDay}`;
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    try {
      setNote(localStorage.getItem(journalKey) || "");
    } catch {
      setNote("");
    }
  }, [journalKey]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(68, textareaRef.current.scrollHeight)}px`;
    }
  }, [note]);

  const handleNoteChange = (text: string) => {
    setNote(text);
    try {
      localStorage.setItem(journalKey, text);
    } catch (err) {
      console.error("Failed to save journal:", err);
    }
  };

  const onToggle = (key: string) =>
    toggle.mutate(key, {
      onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save."),
    });

  // Date stepper logic (cannot advance beyond current day)
  const isToday = selectedDay === actualToday;

  const stepDay = (delta: number) => {
    const d = new Date(currentDateObj);
    d.setDate(d.getDate() + delta);
    const newKey = d.toISOString().slice(0, 10);
    if (delta > 0 && newKey > actualToday) return;
    setSelectedDay(newKey);
  };

  const dateHeading = useMemo(() => {
    if (isToday) return "Today";
    return currentDateObj.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }, [isToday, currentDateObj]);

  // Weekly Top Form Score (Monday of actual current week through today)
  const statsMetric = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;

    let totalPossibleChecks = 0;
    let totalCompletedChecks = 0;

    for (let i = 0; i <= daysSinceMonday; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - (daysSinceMonday - i));
      const k = d.toISOString().slice(0, 10);

      const dayHabits = getActiveHabits(d);
      totalPossibleChecks += dayHabits.length;

      const raw = localStorage.getItem(`p35_habits_${k}`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          dayHabits.forEach((h) => {
            if (parsed[h.key]) totalCompletedChecks++;
          });
        } catch {
          // ignore corrupted keys
        }
      }
    }

    const formScore =
      totalPossibleChecks > 0
        ? Math.round((totalCompletedChecks / totalPossibleChecks) * 100)
        : 100;

    return { formScore };
  }, [habits]);

  const done = activeHabits.filter((h) => habits[h.key]).length;

  const targetStats = [
    {
      icon: Utensils,
      label: "Calories",
      value: `${DAILY_TARGETS.caloriesMin.toLocaleString()}–${DAILY_TARGETS.caloriesMax.toLocaleString()} kcal`,
    },
    { icon: Beef, label: "Protein", value: `${DAILY_TARGETS.protein}g+` },
    { icon: Footprints, label: "Steps", value: DAILY_TARGETS.steps.toLocaleString() },
    { icon: Sunrise, label: "Routine", value: DAILY_TARGETS.routine },
  ];

  return (
    <section className="panel p-5 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="size-5 text-primary" />
          <h2 className="text-lg font-bold">Daily Non-Negotiables</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {statsMetric.formScore}% Week Form
          </span>
          <span className="font-display text-sm text-primary">
            {done}/{activeHabits.length}
          </span>
        </div>
      </div>

      {/* Target Metrics Grid */}
      <div className="grid gap-2 sm:grid-cols-2">
        {targetStats.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/60 p-3"
          >
            <s.icon className="size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="stat-label">{s.label}</p>
              <p className="truncate text-sm font-semibold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Date Stepper Bar */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2/40 px-3 py-2">
        <button
          type="button"
          onClick={() => stepDay(-1)}
          className="rounded p-1 text-muted-foreground hover:text-primary transition-colors active:bg-surface-2"
          aria-label="Previous Day"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-xs font-semibold tracking-wide text-foreground">
          {dateHeading} ({selectedDay})
        </span>
        <button
          type="button"
          onClick={() => stepDay(1)}
          disabled={isToday}
          className={`rounded p-1 transition-colors ${
            isToday
              ? "text-muted-foreground/30 cursor-not-allowed"
              : "text-muted-foreground hover:text-primary active:bg-surface-2"
          }`}
          aria-label="Next Day"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Dynamic Habits for Selected Date */}
      <div className="space-y-2 pt-0.5">
        <p className="stat-label">Habit Check</p>
        {activeHabits.map((habit) => {
          const isChecked = Boolean(habits[habit.key]);
          return (
            <label
              key={habit.key}
              className={`flex min-h-12 cursor-pointer items-center justify-between rounded-lg border px-3 py-3 transition-colors ${
                isChecked
                  ? "border-primary/40 bg-primary/10"
                  : "border-border bg-surface-2/40 hover:bg-surface-2/70 active:bg-surface-2"
              }`}
            >
              <div className="min-w-0 pr-3">
                <span
                  className={`block text-sm font-medium leading-snug ${
                    isChecked ? "text-primary font-semibold" : "text-foreground"
                  }`}
                >
                  {habit.label}
                </span>
                {habit.sublabel && (
                  <span className="block text-[11px] text-muted-foreground">{habit.sublabel}</span>
                )}
              </div>
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => onToggle(habit.key)}
                className="size-5 shrink-0"
              />
            </label>
          );
        })}
      </div>

      {/* Daily Journal Note for Selected Date */}
      <div className="pt-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
          <BookOpen className="size-3.5 text-primary" />
          <span>Daily Journal / Log ({selectedDay})</span>
        </div>
        <textarea
          ref={textareaRef}
          rows={2}
          value={note}
          placeholder="Log weight, workout reflection, hunger, or thoughts..."
          onChange={(e) => handleNoteChange(e.target.value)}
          className="w-full min-h-[68px] resize-none rounded-lg border border-border bg-surface-2/40 px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none transition-all"
        />
      </div>
    </section>
  );
}
