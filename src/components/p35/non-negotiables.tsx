import { Checkbox } from "@/components/ui/checkbox";
import { DAILY_TARGETS, todayKey } from "@/lib/project35";
import { useLocalState } from "@/lib/use-local-state";
import { Beef, Dumbbell, Footprints, Sunrise, Utensils } from "lucide-react";

type HabitState = Record<string, { gym: boolean; steps: boolean; protein: boolean }>;

const HABITS = [
  { key: "gym", label: "6:00 AM Gym Session Completed" },
  { key: "steps", label: "12,500 Steps Hit" },
  { key: "protein", label: "200g+ Protein Banked" },
] as const;

export function NonNegotiables() {
  const [log, setLog] = useLocalState<HabitState>("p35.habits", {});
  const day = todayKey();
  const today = log[day] ?? { gym: false, steps: false, protein: false };
  const done = HABITS.filter((h) => today[h.key]).length;

  const toggle = (key: (typeof HABITS)[number]["key"]) =>
    setLog((prev) => {
      const current = prev[day] ?? { gym: false, steps: false, protein: false };
      return { ...prev, [day]: { ...current, [key]: !current[key] } };
    });

  const stats = [
    { icon: Utensils, label: "Calories", value: `${DAILY_TARGETS.caloriesMin.toLocaleString()}\u2013${DAILY_TARGETS.caloriesMax.toLocaleString()} kcal` },
    { icon: Beef, label: "Protein", value: `${DAILY_TARGETS.protein}g+` },
    { icon: Footprints, label: "Steps", value: DAILY_TARGETS.steps.toLocaleString() },
    { icon: Sunrise, label: "Routine", value: DAILY_TARGETS.routine },
  ];

  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="size-5 text-primary" />
          <h2 className="text-lg font-bold">Daily Non-Negotiables</h2>
        </div>
        <span className="font-display text-sm text-primary">{done}/3</span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/60 p-3">
            <s.icon className="size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="stat-label">{s.label}</p>
              <p className="truncate text-sm font-semibold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        <p className="stat-label">Today&apos;s habit check</p>
        {HABITS.map((habit) => (
          <label
            key={habit.key}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface-2/40 px-3 py-3 transition-colors active:bg-surface-2"
          >
            <Checkbox checked={today[habit.key]} onCheckedChange={() => toggle(habit.key)} className="size-5" />
            <span className={today[habit.key] ? "text-sm text-muted-foreground line-through" : "text-sm font-medium"}>
              {habit.label}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
