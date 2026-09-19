import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Archive, Trash2, CheckCircle2, Sparkles, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { toast } from "sonner";

export function MissionArchiveCard() {
  const [open, setOpen] = useState(false);
  const [archivedWeeks, setArchivedWeeks] = useState<any[]>([]);
  
  // Track open states for accordions: { [weekDateKey]: { weekOpen: boolean, aiOpen: boolean } }
  const [states, setStates] = useState<Record<string, { weekOpen: boolean; aiOpen: boolean }>>({});

  const loadArchive = () => {
    try {
      const weeks: any[] = [];
      const defaultStates: Record<string, { weekOpen: boolean; aiOpen: boolean }> = {};

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("p35_finalised_week_")) {
          const val = localStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val);
            weeks.push(parsed);
            defaultStates[parsed.date] = { weekOpen: false, aiOpen: false };
          }
        }
      }

      // Sort descending by date (newest first)
      weeks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setArchivedWeeks(weeks);
      setStates((prev) => ({ ...defaultStates, ...prev }));
    } catch (err) {
      console.error("Failed to load archived weeks", err);
    }
  };

  useEffect(() => {
    loadArchive();
    const handleUpdate = () => loadArchive();
    window.addEventListener("p35-week-finalised", handleUpdate);
    return () => window.removeEventListener("p35-week-finalised", handleUpdate);
  }, []);

  const deleteWeek = (dateKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this archived week?")) return;
    
    try {
      localStorage.removeItem(`p35_finalised_week_${dateKey}`);
      if (localStorage.getItem("p35_last_locked_week") === dateKey) {
        localStorage.removeItem("p35_last_locked_week");
      }
      toast.success("Archived week removed.");
      loadArchive();
      window.dispatchEvent(new Event("p35-week-finalised"));
    } catch (err) {
      toast.error("Failed to delete archive entry.");
    }
  };

  const toggleWeekOpen = (dateKey: string) => {
    setStates((prev) => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] || { weekOpen: false, aiOpen: false }),
        weekOpen: !prev[dateKey]?.weekOpen,
      },
    }));
  };

  const toggleAiOpen = (dateKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStates((prev) => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] || { weekOpen: false, aiOpen: false }),
        aiOpen: !prev[dateKey]?.aiOpen,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <section className="panel p-5 cursor-pointer hover:border-primary/50 transition-colors group">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary group-hover:scale-105 transition-transform">
                <Archive className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Mission Archive</h2>
                <p className="text-xs text-muted-foreground">History of locked-in weeks & AI debriefs.</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-2 text-muted-foreground border border-border">
              {archivedWeeks.length} {archivedWeeks.length === 1 ? "Week" : "Weeks"}
            </span>
          </div>
        </section>
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="size-5 text-primary" />
            Mission Archive
          </DialogTitle>
          <DialogDescription>
            Your complete history of locked-in performance blocks and coach syntheses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {archivedWeeks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface-2/40 p-8 text-center space-y-2">
              <Archive className="size-8 text-muted-foreground/50 mx-auto" />
              <p className="text-sm font-semibold text-muted-foreground">No Archived Weeks Yet</p>
              <p className="text-xs text-muted-foreground/80 max-w-xs mx-auto">
                Finalise your first week on a Sunday using the weekly banner to log your performance history here.
              </p>
            </div>
          ) : (
            archivedWeeks.map((week) => {
              const state = states[week.date] || { weekOpen: false, aiOpen: false };
              const formatSynthesis = (text: string) => {
                return text.split("\n").map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  if (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.slice(2, -2).includes("**")) {
                    return (
                      <p key={i} className="font-bold text-primary pt-3 first:pt-0 text-sm">
                        {trimmed.slice(2, -2)}
                      </p>
                    );
                  }
                  const formattedLine = trimmed.replace(/\*\*(.*?)\*\*/g, "$1");
                  const isBullet = formattedLine.startsWith("*") || formattedLine.startsWith("-");
                  const cleanText = isBullet ? formattedLine.replace(/^[*-\s]+/, "• ") : formattedLine;
                  return (
                    <p key={i} className={isBullet ? "pl-2 font-medium text-foreground/90 text-xs" : "text-xs text-muted-foreground leading-relaxed"}>
                      {cleanText}
                    </p>
                  );
                });
              };

              return (
                <div 
                  key={week.date}
                  className="rounded-xl border border-border bg-surface-2/40 overflow-hidden transition-all"
                >
                  {/* Collapsible Header */}
                  <div 
                    onClick={() => toggleWeekOpen(week.date)}
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-surface-2/80 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-bold text-foreground truncate block">
                        {week.phaseTitle}
                      </p>
                      <p className="text-xs text-muted-foreground truncate block flex items-center gap-1.5">
                        <Calendar className="size-3 text-primary shrink-0" />
                        <span>{week.blockName}</span>
                        <span className="text-border">•</span>
                        <span>{week.dateRange}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Centered Score Badge */}
                      <div className="flex flex-col items-center justify-center size-12 rounded-lg bg-surface-2 border border-border shadow-inner">
                        <span className="text-[10px] text-muted-foreground uppercase leading-none font-semibold">Score</span>
                        <span className="text-sm font-extrabold text-primary leading-tight mt-0.5">{week.overallPercentage}%</span>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-rose-400"
                        onClick={(e) => deleteWeek(week.date, e)}
                        title="Delete archive entry"
                      >
                        <Trash2 className="size-4" />
                      </Button>

                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                        {state.weekOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Collapsible Body */}
                  {state.weekOpen && (
                    <div className="px-4 pb-4 pt-2 border-t border-border/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      
                      {/* Habit Breakdown */}
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Non-Negotiables Execution</p>
                        <div className="grid grid-cols-1 gap-1.5 rounded-lg border border-border/60 bg-surface-2/60 p-2.5">
                          {week.breakdown?.map((h: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                              <span className="text-foreground/90 font-medium">{h.label}</span>
                              <span className="font-semibold text-primary">{h.completed}/{h.total}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Weekly Execution Protocol */}
                      {week.weeklyProtocolGoals && week.weeklyProtocolGoals.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Weekly Protocol Targets</p>
                          <div className="space-y-1.5 rounded-lg border border-border/60 bg-surface-2/60 p-2.5">
                            {week.weeklyProtocolGoals.map((g: any) => {
                              const currentStatus = g.status || (g.completed ? "completed" : "pending");
                              return (
                                <div key={g.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0 gap-2">
                                  <span className={`font-medium truncate ${currentStatus === "completed" ? "text-emerald-400" : currentStatus === "failed" ? "text-rose-400 line-through opacity-80" : "text-foreground"}`}>
                                    {g.text}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                    currentStatus === "completed" 
                                      ? "bg-emerald-500/25 text-emerald-300" 
                                      : currentStatus === "failed"
                                      ? "bg-rose-500/25 text-rose-300"
                                      : "bg-amber-500/25 text-amber-300"
                                  }`}>
                                    {currentStatus === "completed" ? "Smashed" : currentStatus === "failed" ? "Failed" : "Pending"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Collapsible AI Coach Synthesis */}
                      {week.aiSynthesis && (
                        <div className="rounded-lg border border-border/60 bg-surface-2/60 overflow-hidden">
                          <div 
                            onClick={(e) => toggleAiOpen(week.date, e)}
                            className="p-3 flex items-center justify-between cursor-pointer hover:bg-surface-2 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Sparkles className="size-4 text-primary" />
                              <span className="text-xs font-semibold text-foreground">AI Coach Synthesis Debrief</span>
                            </div>
                            <Button variant="ghost" size="icon" className="size-6 text-muted-foreground">
                              {state.aiOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                            </Button>
                          </div>

                          {state.aiOpen && (
                            <div className="px-3 pb-3 pt-1 border-t border-border/40 space-y-2 animate-in slide-in-from-top-1 duration-150">
                              {formatSynthesis(week.aiSynthesis)}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
