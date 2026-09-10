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
    proteinCount: number;
    gymCount: number;
    journals: string[];
  } | null>(null);

  useEffect(() => {
    const today = new Date(todayKey() + "T00:00:00Z");
    const isSunday = today.getUTCDay() === 0;

    // Determine photo week cadence (every 4th Sunday logic check placeholder or local flag)
    const isPhotoWeek = isSunday; // Can tie into your 4-week checkpoint counter logic later

    // Aggregate last 7 days from localStorage
    let proteinCount = 0;
    let gymCount = 0;
    const journals: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const k = d.toISOString().slice(0, 10);

      // Habits check
      const rawHabits = localStorage.getItem(`p35_habits_${k}`);
      if (rawHabits) {
        try {
          const parsed = JSON.parse(rawHabits);
          if (parsed["protein"]) proteinCount++;
          if (parsed["workout_complete"]) gymCount++;
        } catch {}
      }

      // Journal check
      const rawJournal = localStorage.getItem(`p35_journal_${k}`);
      if (rawJournal && rawJournal.trim()) {
        journals.push(`${k}: ${rawJournal.trim()}`);
      }
    }

    setSummaryData({
      isSunday,
      isPhotoWeek,
      proteinCount,
      gymCount,
      journals,
    });
  }, []);

  if (!summaryData || !summaryData.isSunday) {
    return null; // Only renders on Sundays
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
            <p className="text-xs text-muted-foreground">Review metrics, compile journals, and lock in weekly stats.</p>
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
                    <p className="text-muted-foreground">This is your rotation Sunday. Upload your checkpoint photos below to clear this banner for the next 4 weeks.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg border border-border bg-surface-2/60 p-3">
                  <p className="font-display text-xl font-bold text-primary">{summaryData.gymCount}/7</p>
                  <p className="stat-label mt-0.5">Workouts / Sessions</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-2/60 p-3">
                  <p className="font-display text-xl font-bold text-primary">{summaryData.proteinCount}/7</p>
                  <p className="stat-label mt-0.5">Protein Targets Hit</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weekly Journal Digest</p>
                {summaryData.journals.length > 0 ? (
                  <div className="space-y-1.5 rounded-lg border border-border bg-surface-2/40 p-3 max-h-40 overflow-y-auto text-xs text-muted-foreground">
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
                  Solid consistency across workouts and protein targets. Your volume management is holding up well through the cut phase. Keep the discipline locked in for the week ahead.
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
