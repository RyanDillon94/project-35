import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Archive, Trophy, CheckCircle2, XCircle, BrainCircuit } from "lucide-react";

type ArchivedWeek = {
  date: string;
  overallPercentage: number;
  weeklyProtocolGoals: any[];
  aiSynthesis: string;
};

export function MissionArchiveCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [archives, setArchives] = useState<ArchivedWeek[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const loaded: ArchivedWeek[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("p35_finalised_week_")) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || "{}");
          if (parsed.date) {
            loaded.push(parsed);
          }
        } catch (e) {
          console.error("Failed to parse archived week", e);
        }
      }
    }
    
    // Sort reverse chronological (newest first)
    loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setArchives(loaded);
  }, [isOpen]);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="panel flex items-center justify-between p-4 cursor-pointer hover:border-primary/50 transition-colors w-full">
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary">
              <Archive className="size-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-foreground">Mission Archive</h3>
              <p className="text-xs text-muted-foreground">Historical weekly reviews & protocols</p>
            </div>
          </div>
        </div>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="flex h-[85vh] flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            <SheetTitle>Mission Archive</SheetTitle>
          </div>
          <SheetDescription>
            Your complete history of locked-in weeks, protocol execution, and AI debriefs.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 bg-background">
          {archives.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface-2/20 p-6 text-center">
              <p className="text-sm font-semibold text-muted-foreground">No Archives Found</p>
              <p className="text-xs text-muted-foreground/80 mt-1">
                Your historical weeks will appear here once you finalise them on Sundays.
              </p>
            </div>
          ) : (
            archives.map((archive) => (
              <div key={archive.date} className="rounded-xl border border-border bg-surface-2/40 p-4 space-y-4">
                <div className="flex justify-between items-center border-b border-border/50 pb-3">
                  <span className="font-bold text-sm text-foreground">Week of {formatDate(archive.date)}</span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    archive.overallPercentage >= 80 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : archive.overallPercentage >= 50
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-rose-500/20 text-rose-400"
                  }`}>
                    {archive.overallPercentage}% Score
                  </span>
                </div>

                {archive.weeklyProtocolGoals?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Protocol Execution
                    </p>
                    <div className="space-y-1.5">
                      {archive.weeklyProtocolGoals.map((g) => {
                        const isDone = g.completed || g.status === 'completed';
                        const countText = g.targetCount && g.targetCount > 0 ? ` (${g.completedCount || 0}/${g.targetCount})` : "";
                        return (
                          <div key={g.id} className="flex items-start gap-2.5 text-xs">
                            {isDone ? (
                              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="size-4 text-rose-500 shrink-0 mt-0.5" />
                            )}
                            <div className="flex flex-col gap-0.5">
                              <span className={`font-medium ${isDone ? "text-foreground" : "text-muted-foreground line-through opacity-80"}`}>
                                {g.text} {countText}
                              </span>
                              {g.notes && (
                                <span className="text-[10px] italic text-muted-foreground/70">
                                  {g.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {archive.aiSynthesis && (
                  <div className="space-y-2 pt-1 border-t border-border/30">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 pt-2">
                      <BrainCircuit className="size-3.5 text-primary"/> AI Coach Synthesis
                    </p>
                    <div className="text-xs italic text-muted-foreground bg-surface-2/60 p-3 rounded-lg border border-border/50 leading-relaxed whitespace-pre-wrap">
                      {archive.aiSynthesis}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
