import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, CheckCircle2, Plus, Trash2, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export type WeeklyProtocolGoal = {
  id: string;
  text: string;
  completed: boolean;
  status?: "completed" | "failed" | "pending";
};

function getCurrentMondayKey() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

function isTodayMonday() {
  return new Date().getDay() === 1;
}

const STORAGE_KEY_PREFIX = "p35_weekly_protocol_";

export function WeeklyProtocolCard() {
  const mondayKey = getCurrentMondayKey();
  const storageKey = `${STORAGE_KEY_PREFIX}${mondayKey}`;
  const isMonday = isTodayMonday();

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
      { id: Date.now().toString(), text: newGoalText.trim(), completed: false, status: "pending" },
    ];
    setGoals(updated);
    setNewGoalText("");
    toast.success("Weekly protocol target locked in.");
  };

  const toggleGoal = (id: string) => {
    const updated = goals.map((g) => {
      if (g.id === id) {
        const nextCompleted = !g.completed;
        return {
          ...g,
          completed: nextCompleted,
          status: nextCompleted ? ("completed" as const) : ("pending" as const),
        };
      }
      return g;
    });
    setGoals(updated);
  };

  const deleteGoal = (id: string) => {
    const updated = goals.filter((g) => g.id !== id);
    setGoals(updated);
  };

  const needsSetup = isMonday && goals.length === 0;

  return (
    <section className={`panel p-5 space-y-4 transition-colors ${needsSetup ? "border-amber-500/50 bg-amber-500/5 animate-pulse" : "border-primary/30 bg-surface-2/40"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${needsSetup ? "bg-amber-500/20 text-amber-400" : "bg-primary/20 text-primary"}`}>
            {needsSetup ? <AlertCircle className="size-4" /> : <Target className="size-4" />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Weekly Execution Protocol</h2>
            <p className="text-xs text-muted-foreground">
              {needsSetup ? "Monday Reset: Lock in your 2-3 focus targets for this week" : `Non-physical focus targets for week of ${mondayKey}`}
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${needsSetup ? "bg-amber-500/20 text-amber-300" : "text-primary bg-primary/10"}`}>
          <Calendar className="size-3" />
          <span>{needsSetup ? "Setup Required" : `${goals.filter((g) => g.completed).length}/${goals.length} Done`}</span>
        </div>
      </div>

      <div className="space-y-2">
        {goals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-center space-y-2">
            <p className="text-xs font-semibold text-amber-400">Monday Protocol Reset Active</p>
            <p className="text-xs text-muted-foreground">
              Wipe the slate clean. Add up to 3 sharp, non-physical focus standards to dominate this week.
            </p>
          </div>
        ) : (
          goals.map((goal) => {
            const currentStatus = goal.status || (goal.completed ? "completed" : "pending");
            return (
              <div
                key={goal.id}
                className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-colors ${
                  currentStatus === "completed" 
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" 
                    : currentStatus === "failed"
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-300 line-through opacity-80"
                    : "border-border bg-surface-2/60 text-foreground"
                }`}
              >
                <div 
                  className="flex items-center gap-2.5 flex-1 cursor-pointer min-w-0"
                  onClick={() => toggleGoal(goal.id)}
                >
                  <CheckCircle2 className={`size-4 shrink-0 ${currentStatus === "completed" ? "text-emerald-500" : "text-muted-foreground"}`} />
                  <span className="text-xs truncate font-medium">
                    {goal.text}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    currentStatus === "completed" 
                      ? "bg-emerald-500/20 text-emerald-300" 
                      : currentStatus === "failed"
                      ? "bg-rose-500/20 text-rose-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}>
                    {currentStatus === "completed" ? "Smashed" : currentStatus === "failed" ? "Failed" : "Pending"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-rose-400 shrink-0"
                    onClick={() => deleteGoal(goal.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
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
            <Plus className="size-4" /> Add Target
          </Button>
        </div>
      )}
    </section>
  );
}
