import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingUp, BarChart3, CheckCircle2, Flame } from "lucide-react";
import { getActiveHabits } from "@/lib/project35";

export function WeeklyTrendsAnalytics() {
  const [isOpen, setIsOpen] = useState(false);

  // Compute past few weeks of rolling adherence data from localStorage
  const trendData = useMemo(() => {
    const weeks: { weekLabel: string; score: number }[] = [];
    const today = new Date();

    // Look back across the last 4 weeks
    for (let w = 3; w >= 0; w--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - w * 7);
      
      // Find Monday of that week
      const dayOfWeek = targetDate.getDay();
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(targetDate);
      monday.setDate(targetDate.getDate() - daysSinceMonday);

      let totalPossible = 0;
      let totalCompleted = 0;

      // Loop Mon-Sun (or up to today if current week)
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        if (d.getTime() > today.getTime() && w === 0) break; // Don't project future days of current week

        const k = d.toISOString().slice(0, 10);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const dayHabits = getActiveHabits(d);

        let parsedHabits: Record<string, boolean> = {};
        const raw = localStorage.getItem(`p35_habits_${k}`);
        if (raw) {
          try {
            parsedHabits = JSON.parse(raw);
          } catch {}
        }

        dayHabits.forEach((h) => {
          const labelLower = h.label.toLowerCase();
          const isWeekdayOnly = 
            h.key === "workout_complete" || 
            h.key === "early_morning" || 
            labelLower.includes("workout") || 
            labelLower.includes("6:00 am");

          if (isWeekend && isWeekdayOnly) return;

          totalPossible++;
          if (parsedHabits[h.key]) {
            totalCompleted++;
          }
        });
      }

      const score = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
      const weekLabel = `Week of ${monday.toLocaleDateString("en-GB", { month: "short", day: "numeric" })}`;
      weeks.push({ weekLabel, score });
    }

    return weeks;
  }, [isOpen]);

  const averageScore = useMemo(() => {
    const validWeeks = trendData.filter(w => w.score > 0);
    if (validWeeks.length === 0) return 0;
    return Math.round(validWeeks.reduce((acc, curr) => acc + curr.score, 0) / validWeeks.length);
  }, [trendData]);

  return (
    <div className="panel border-border bg-surface-2/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Weekly Trends & Analytics</h3>
            <p className="text-xs text-muted-foreground">Examine compliance history, rolling adherence, and standards.</p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
              <BarChart3 className="size-4" />
              View Trends
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="size-5 text-primary" />
                Performance Analytics
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Quick KPI Stat Boxes */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-surface-2/60 p-3 text-center space-y-1">
                  <p className="stat-label flex items-center justify-center gap-1">
                    <CheckCircle2 className="size-3.5 text-primary" />
                    <span>4-Week Avg Adherence</span>
                  </p>
                  <p className="font-display text-2xl font-bold text-primary">{averageScore}%</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-2/60 p-3 text-center space-y-1">
                  <p className="stat-label flex items-center justify-center gap-1">
                    <Flame className="size-3.5 text-amber-500" />
                    <span>Execution Status</span>
                  </p>
                  <p className="text-sm font-semibold text-foreground pt-1">
                    {averageScore >= 80 ? "Strict Standard" : averageScore >= 50 ? "Building Momentum" : "Needs Rigor"}
                  </p>
                </div>
              </div>

              {/* Weekly Trend Bars */}
              <div className="space-y-2.5 rounded-lg border border-border bg-surface-2/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rolling Weekly Adherence</p>
                <div className="space-y-3 pt-1">
                  {trendData.map((week, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-foreground">{week.weekLabel}</span>
                        <span className="text-primary font-semibold">{week.score}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
                        <div 
                          className="h-full bg-primary transition-all duration-500 rounded-full" 
                          style={{ width: `${week.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                Adherence is calculated dynamically based on weekday versus weekend rule profiles across each active training block.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
