import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getActiveHabits, todayKey } from "@/lib/project35";
import { CalendarCheck, Camera, Sparkles, Trophy } from "lucide-react";

export function FinaliseWeekBanner({ userId }: { userId: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    isSunday: boolean;
    isPhotoWeek: boolean;
    totalPossible: number;
    totalCompleted: number;
    overallPercentage: number;
    habitBreakdown: { label: string; completed: number; total: number }[];
    journals: string[];
    aiVerdict: string;
  } | null>(null);

  useEffect(() => {
    const today = new Date(todayKey() + "T00:00:00Z");
    const isSunday = today.getUTCDay() === 0;

    // Calculate active week number from Project 35 start (2026-09-07)
    const startDate = new Date("2026-09-07T00:00:00Z");
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const currentWeekNumber = Math.max(1, Math.ceil(diffDays / 7));
    
    // Every 4th week is a photo checkpoint week (Week 4, 8, 12, etc.)
    const isPhotoWeek = isSunday && currentWeekNumber % 4 === 0;

    // Aggregate last 7 days from localStorage
    const habitStats: Record<string, { label: string; completed: number; total: number }> = {};
    let totalPossibleChecks = 0;
    let totalCompletedChecks = 0;
    const journals: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const k = d.toISOString().slice(0, 10);

      const dayHabits = getActiveHabits(d);
      const rawHabits = localStorage.getItem(`p35_habits_${k}`);
      let parsedHabits: Record<string, boolean> = {};
      if (rawHabits) {
        try {
          parsedHabits = JSON.parse(rawHabits);
        } catch {}
      }

      dayHabits.forEach((h) => {
        if (!habitStats[h.key]) {
          habitStats[h.key] = { label: h.label, completed: 0, total: 0 };
        }
        habitStats[h.key].total++;
        totalPossibleChecks++;

        if (parsedHabits[h.key]) {
          habitStats[h.key].completed++;
          totalCompletedChecks++;
        }
      });

      const rawJournal = localStorage.getItem(`p35_journal_${k}`);
      if (rawJournal && rawJournal.trim()) {
        journals.push(`${k}: ${rawJournal.trim()}`);
      }
    }

    const overallPercentage = totalPossibleChecks > 0 
      ? Math.round((totalCompletedChecks / totalPossibleChecks) * 100) 
      : 0;

    // Dynamic AI Verdict based on performance tiers
    let aiVerdict = "";
    if (overallPercentage === 100) {
      aiVerdict = "Flawless execution. 100% across the board. The standard is set—this is what undeniable shape looks like.";
    } else if (overallPercentage >= 75) {
      aiVerdict = "Strong week. Solid discipline across the board with minor slips. Keep the momentum locked in for the next block.";
    } else {
      aiVerdict = "Wake up call. Standards dropped this week. Time to sort your shit out, tighten the execution, and get back to the non-negotiables.";
    }

    setSummaryData({
      isSunday,
      isPhotoWeek,
      totalPossible: totalPossibleChecks,
      totalCompleted: totalCompletedChecks,
      overallPercentage,
      habitBreakdown: Object.values(habitStats),
      journals,
      aiVerdict,
    });
  }, []);

  if (!summaryData || !summaryData.isSunday) {
    return null;
  }

  return (
    <div className="panel border-primary/40 bg-primary/10 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary">
            <CalendarCheck className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Sunday: Finalise Week</h3>
            <p className="text-xs text-muted-foreground">Review your metrics, breakdown habits, and lock in the week.</p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 shrink-0">
              <Sparkles className="size-4" />
              Finalise
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="size-5 text-primary" />
                Weekly Performance Summary
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {summaryData.isPhotoWeek && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-3">
                  <Camera className="size-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-amber-500">4-Week Photo Checkpoint Due</p>
                    <p className="text-muted-foreground">This is your 4-week rotation Sunday. Upload your checkpoint photos below to clear this requirement.</p>
                  </div>
                </div>
              )}

              {/* Overall Score Pill / Card */}
              <div className="rounded-lg border border-border bg-surface-2/60 p-4 text-center space-y-1">
                <p className="stat-label">You were on form for</p>
                <p className="font-display text-3xl font-bold text-primary">{summaryData.overallPercentage}%</p>
                <p className="text-xs text-muted-foreground">of the week ({summaryData.totalCompleted}/{summaryData.totalPossible} total checks)</p>
              </div>

              {/* Habit Breakdown List */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Non-Negotiables Breakdown</p>
                <div className="space-y-1.5 rounded-lg border border-border bg-surface-2/40 p-3">
                  {summaryData.habitBreakdown.map((h, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                      <span className="text-foreground font-medium">{h.label}</span>
                      <span className="font-semibold text-primary">{h.completed}/{h.total}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weekly Journal Digest</p>
                {summaryData.journals.length > 0 ? (
                  <div className="space-y-1.5 rounded-lg border border-border bg-surface-2/40 p-3 max-h-32 overflow-y-auto text-xs text-muted-foreground">
                    {summaryData.journals.map((j, idx) => (
                      <p key={idx} className="border-b border-border/40 pb-1 last:border-0 last:pb-0">{j}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic rounded-lg border border-dashed border-border p-3">No daily journal notes recorded this week.</p>
                )}
              </div>

              <div className="rounded-lg border border-primary/30 bg-surface-2/60 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Sparkles className="size-4" />
                  <span>AI Coach Weekly Verdict</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {summaryData.aiVerdict}
                </p>
              </div>

              <Button className="w-full" onClick={() => setIsOpen(false)}>
                Lock In & Close Summary
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
