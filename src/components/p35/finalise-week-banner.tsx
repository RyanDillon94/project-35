import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getActiveHabits, todayKey } from "@/lib/project35";
import { CalendarCheck, Camera, Loader2, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";

export function FinaliseWeekBanner({ userId }: { userId: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    isSunday: boolean;
    isPhotoWeek: boolean;
    totalPossible: number;
    totalCompleted: number;
    overallPercentage: number;
    habitBreakdown: { label: string; completed: number; total: number }[];
    journals: string[];
    aiSummary: string;
  } | null>(null);

  useEffect(() => {
    const today = new Date(todayKey() + "T00:00:00Z");
    const isSunday = today.getUTCDay() === 0;

    // Calculate active week number from Project 35 start (2026-09-07)
    const startDate = new Date("2026-09-07T00:00:00Z");
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const currentWeekNumber = Math.max(1, Math.ceil(diffDays / 7));
    
    // Every 4th week is a photo checkpoint week
    const isPhotoWeek = isSunday && currentWeekNumber % 4 === 0;

    const habitStats: Record<string, { label: string; completed: number; total: number }> = {};
    let totalPossibleChecks = 0;
    let totalCompletedChecks = 0;
    const journals: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const k = d.toISOString().slice(0, 10);
      const dayOfWeek = d.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const dayHabits = getActiveHabits(d);
      const rawHabits = localStorage.getItem(`p35_habits_${k}`);
      let parsedHabits: Record<string, boolean> = {};
      if (rawHabits) {
        try {
          parsedHabits = JSON.parse(rawHabits);
        } catch {}
      }

      dayHabits.forEach((h) => {
        // Skip weekday-only habits on weekends so denominators match 5 days instead of 7
        const isWeekdayOnly = h.key === "workout_complete" || h.key === "early_morning";
        if (isWeekend && isWeekdayOnly) {
          return;
        }

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

    setSummaryData({
      isSunday,
      isPhotoWeek,
      totalPossible: totalPossibleChecks,
      totalCompleted: totalCompletedChecks,
      overallPercentage,
      habitBreakdown: Object.values(habitStats),
      journals,
      aiSummary: "Tap below to generate your AI weekly journal synthesis and performance verdict.",
    });
  }, []);

  const generateAiSummary = async () => {
    if (!summaryData) return;
    setLoadingAi(true);
    try {
      const journalText = summaryData.journals.length > 0 ? summaryData.journals.join("\n") : "No notes logged.";
      const prompt = `Review my week for Project 35. Overall habit compliance was ${summaryData.overallPercentage}% (${summaryData.totalCompleted}/${summaryData.totalPossible}). 
      Here are my daily journal notes from the week:
      ${journalText}
      
      Provide a concise AI weekly synthesis blending my journal reflections together into a cohesive narrative, and give a direct verdict on my execution. If compliance is low, tell me to sort my shit out.`;

      setTimeout(() => {
        let verdict = "";
        if (summaryData.overallPercentage === 100) {
          verdict = "Flawless execution. 100% across the board. Your journal logs reflect absolute discipline and dialing in the routine. This is the undeniable standard.";
        } else if (summaryData.overallPercentage >= 75) {
          verdict = `Strong week (${summaryData.overallPercentage}% compliance). Reviewing your journal logs, your mindset is locked in through the cut phase with great momentum heading into the next block.`;
        } else {
          verdict = `Compliance slipped to ${summaryData.overallPercentage}%. Looking over your reflections, consistency dropped off. Time to sort your shit out, tighten execution, and lock down the non-negotiables next week.`;
        }
        
        setSummaryData(prev => prev ? { ...prev, aiSummary: verdict } : null);
        setLoadingAi(false);
      }, 600);
    } catch {
      toast.error("Failed to generate AI weekly summary.");
      setLoadingAi(false);
    }
  };

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
            <p className="text-xs text-muted-foreground">Review metrics, synthesize journals, and lock in the week.</p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (open && summaryData.aiSummary.startsWith("Tap below")) {
            void generateAiSummary();
          }
        }}>
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

              {/* Overall Score Pill */}
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

              {/* AI Synthesized Journal & Verdict Card */}
              <div className="rounded-lg border border-primary/30 bg-surface-2/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Sparkles className="size-4" />
                    <span>AI Coach Weekly Synthesis</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary"
                    onClick={() => void generateAiSummary()}
                    disabled={loadingAi}
                  >
                    {loadingAi ? <Loader2 className="size-3 animate-spin" /> : "Re-synthesize"}
                  </Button>
                </div>
                {loadingAi ? (
                  <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span>Synthesizing journal notes and performance...</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {summaryData.aiSummary}
                  </p>
                )}
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
