import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, CheckCircle2, Plus, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";

export type WeeklyProtocolGoal = {
  id: string;
  text: string;
  completed: boolean;
};

// Helper to get the Monday key for the current week
function getCurrentMondayKey() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

const STORAGE_KEY_PREFIX = "p35_weekly_protocol_";

export function WeeklyProtocolCard() {
  const mondayKey = getCurrentMondayKey();
  const storageKey = `${STORAGE_KEY_PREFIX}${mondayKey}`;

  const [goals, setGoals] = useState<WeeklyProtocolGoal[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newGoalText, setNewGoalText] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(goals));
    } catch {
      console.error("Failed to save weekly protocol goals");
    }
  }, [goals, storageKey]);

  const addGoal = () => {
    if (!newGoalText.trim()) return;
    if (goals.length >= 3) {
      toast.error("Cap it at 3 targets maximum. Keep the execution razor-sharp.");
      return;
    }

    const updated = [
      ...goals,
      { id: Date.now().toString(), text: newGoalText.trim(), completed: false },
    ];
    setGoals(updated);
    setNewGoalText("");
    toast.success("Weekly protocol target locked in.");
  };

  const toggleGoal = (id: string) => {
    const updated = goals.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g));
    setGoals(updated);
  };

  const deleteGoal = (id: string) => {
    const updated = goals.filter((g) => g.id !== id);
    setGoals(updated);
  };

  return (
    <section className="panel p-5 space-y-4 border-primary/30 bg-surface-2/40">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary">
            <Target className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Weekly Execution Protocol</h2>
            <p className="text-xs text-muted-foreground">Non-physical focus targets for week of {mondayKey}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          <Calendar className="size-3" />
          <span>{goals.filter((g) => g.completed).length}/{goals.length} Done</span>
        </div>
      </div>

      <div className="space-y-2">
        {goals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            No weekly targets set yet. Add up to 3 non-physical focus standards for this week.
          </div>
        ) : (
          goals.map((goal) => (
            <div
              key={goal.id}
              className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-colors ${
                goal.completed 
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" 
                  : "border-border bg-surface-2/60 text-foreground"
              }`}
            >
              <div 
                className="flex items-center gap-2.5 flex-1 cursor-pointer min-w-0"
                onClick={() => toggleGoal(goal.id)}
              >
                <CheckCircle2 className={`size-4 shrink-0 ${goal.completed ? "text-emerald-500" : "text-muted-foreground"}`} />
                <span className={`text-xs truncate ${goal.completed ? "line-through opacity-80" : "font-medium"}`}>
                  {goal.text}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-rose-400 shrink-0"
                onClick={() => deleteGoal(goal.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>

      {goals.length < 3 && (
        <div className="flex gap-2 pt-1">
          <Input
            placeholder="Add weekly target (e.g. Code 30 mins daily)..."
            value={newGoalText}
            onChange={(e) => setNewGoalText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addGoal();
              }
            }}
            className="h-9 text-xs"
          />
          <Button size="sm" className="h-9 shrink-0 gap-1" onClick={addGoal}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
      )}
    </section>
  );
}
