import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  getActiveBlockDetails, 
  getActiveHabits, 
  todayKey, 
  DAILY_TARGETS, 
  GOAL_WEIGHT 
} from "@/lib/project35";
import { triggerFridayBackup } from "@/lib/p35-cloud";
import { CalendarCheck, Camera, Loader2, Sparkles, Trophy, Check } from "lucide-react";
import { toast } from "sonner";
import { getMondayKeyForDate } from "./WeeklyProtocolCard";

function getCoachSystemPrompt() {
  const { activePhase, activeBlock } = getActiveBlockDetails();

  return `You are the Project 35 performance coach: direct, no-fluff, and technically sharp.
Rules:
- Celebrate only earned wins, briefly. No hype, no filler, no emoji.
- Athlete Phase Context: Phase ${activePhase.id} (${activePhase.title}) — ${activeBlock.name}. Focus: ${activeBlock.focus.join(", ")}. Phase Summary: ${activePhase.summary}
- Live Targets: ${DAILY_TARGETS.caloriesMin.toLocaleString()}–${DAILY_TARGETS.caloriesMax.toLocaleString()} kcal, ${DAILY_TARGETS.protein}g+ protein, ${DAILY_TARGETS.steps.toLocaleString()} steps daily, routine standard: "${DAILY_TARGETS.routine}", target benchmark: ${GOAL_WEIGHT} lbs, arriving at 35 in November 2029 in undeniable shape.
- Kilograms in, kilograms out for lifts; pounds for bodyweight.
- Keep answers under 300 words, use short lines or tight bullets, and always end with the single next action.`;
}

function FormattedSynthesis({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
      {text.split("\n").map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.slice(2, -2).includes("**")) {
          return (
            <p key={i} className="font-bold text-primary pt-2 first:pt-0 text-sm">
              {trimmed.slice(2, -2)}
            </p>
          );
        }

        const formattedLine = trimmed.replace(/\*\*(.*?)\*\*/g, "$1");
        const isBullet = formattedLine.startsWith("*") || formattedLine.startsWith("-");
        const cleanText = isBullet ? formattedLine.replace(/^[*-\s]+/, "• ") : formattedLine;

        return (
          <p key={i} className={isBullet ? "pl-2 font-medium text-foreground/90" : ""}>
            {cleanText}
          </p>
        );
      })}
    </div>
  );
}

export function FinaliseWeekBanner({ userId }: { userId: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    isSunday: boolean;
    isPhotoWeek: boolean;
    totalPossible: number;
    totalCompleted: number;
    overallPercentage: number;
    habitBreakdown: { label: string; completed: number; total: number }[];
    weeklyProtocolGoals: { id: string; text: string; completed: boolean; status?: "completed" | "failed" | "pending"; targetCount?: number; completedCount?: number; failReason?: string }[];
    weightHistory: { date: string; weight: number }[];
    journals: string[];
    aiSummary: string;
    hasWeighedInToday: boolean;
    isFinalised: boolean;
  } | null>(null);

  const calculateWeekData = useCallback(() => {
    const todayStr = todayKey();
    const today = new Date(todayStr + "T00:00:00Z");
    const isSunday = today.getUTCDay() === 0;

    const weekKey = `p35_finalised_week_${todayStr}`;
    const lastLocked = localStorage.getItem("p35_last_locked_week");
    const isFinalised = localStorage.getItem(weekKey) !== null || lastLocked === todayStr;

    let hasWeighedInToday = false;
    let weightHistory: { date: string; weight: number }[] = [];

    try {
      const rawWeights = userId 
        ? localStorage.getItem(`p35_weigh_ins_${userId}`) || localStorage.getItem("p35_weigh_ins")
        : localStorage.getItem("p35_weigh_ins");
      
      if (rawWeights) {
        const parsedEntries = JSON.parse(rawWeights);
        if (Array.isArray(parsedEntries)) {
          hasWeighedInToday = parsedEntries.some((e: any) => e.date === todayStr);
          weightHistory = parsedEntries
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
        }
      }
    } catch (err) {
      console.error("Failed to check weigh-in history:", err);
    }

    const activeDate = todayKey();
    const mondayKey = getMondayKeyForDate(activeDate);
    const rawProtocol = localStorage.getItem(`p35_weekly_protocol_${mondayKey}`);
    const weeklyProtocolGoals = rawProtocol 
      ? JSON.parse(rawProtocol).map((g: any) => ({
          ...g,
          status: g.status || (g.completed ? "completed" : "pending")
        })) 
      : [];

    const startDate = new Date("2026-09-07T00:00:00Z");
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const currentWeekNumber = Math.max(1, Math.ceil(diffDays / 7));
    
    const isPhotoWeek = isSunday && currentWeekNumber % 4 === 0;

    const habitStats: Record<string, { label: string; completed: number; total: number; expectedTotal: number }> = {};
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
        if (h.key.startsWith("weekend_")) {
          return;
        }

        const labelLower = h.label.toLowerCase();
        const isWeekdayOnly = 
          h.key === "early_morning" || 
          h.key === "workout_complete" ||
          labelLower.includes("6:00 am") || 
          labelLower.includes("early morning");

        if (isWeekend && isWeekdayOnly) return;

        if (!habitStats[h.key]) {
          const expectedTotal = isWeekdayOnly ? 5 : 7;
          habitStats[h.key] = { 
            label: h.label, 
            completed: 0, 
            total: expectedTotal,
            expectedTotal
          };
        }

        if (parsedHabits[h.key]) {
          habitStats[h.key].completed++;
        }
      });

      const rawJournal = localStorage.getItem(`p35_journal_${k}`);
      if (rawJournal && rawJournal.trim()) {
        journals.push(`${k}: ${rawJournal.trim()}`);
      }
    }

    const finalizedBreakdown = Object.values(habitStats).map((stat) => {
      const completed = Math.min(stat.completed, stat.expectedTotal);
      return {
        label: stat.label,
        completed,
        total: stat.expectedTotal,
      };
    });

    totalPossibleChecks = finalizedBreakdown.reduce((acc, curr) => acc + curr.total, 0);
    totalCompletedChecks = finalizedBreakdown.reduce((acc, curr) => acc + curr.completed, 0);

    const habitScore = totalPossibleChecks > 0 ? (totalCompletedChecks / totalPossibleChecks) * 100 : 0;

    let protocolScore = -1;
    if (weeklyProtocolGoals.length > 0) {
      let totalGoalPercentages = 0;
      
      weeklyProtocolGoals.forEach((g: any) => {
        if (g.completed || g.status === "completed") {
          totalGoalPercentages += 100;
        } else if (g.targetCount && g.targetCount > 0) {
          const current = g.completedCount || 0;
          totalGoalPercentages += (current / g.targetCount) * 100;
        }
      });

      protocolScore = totalGoalPercentages / weeklyProtocolGoals.length;
    }

    let overallPercentage = Math.round(habitScore);
    if (protocolScore >= 0) {
      overallPercentage = Math.round(habitScore * 0.7 + protocolScore * 0.3);
    }

    setSummaryData((prev) => ({
      isSunday,
      isPhotoWeek,
      totalPossible: totalPossibleChecks,
      totalCompleted: totalCompletedChecks,
      overallPercentage: Math.min(100, Math.max(0, overallPercentage)),
      habitBreakdown: finalizedBreakdown,
      weeklyProtocolGoals,
      weightHistory,
      journals,
      aiSummary: prev?.aiSummary && hasGenerated 
        ? prev.aiSummary 
        : "Tap below to generate your AI weekly journal synthesis and performance verdict.",
      hasWeighedInToday,
      isFinalised,
    }));
  }, [hasGenerated, userId]);

  useEffect(() => {
    calculateWeekData();
  }, [calculateWeekData]);

  const generateAiSummary = async () => {
    if (!summaryData) return;
    
    const apiKey = localStorage.getItem("p35_gemini_api_key");
    if (!apiKey) {
      toast.error("Add your Gemini API key first.");
      setLoadingAi(false);
      return;
    }

    setLoadingAi(true);
    try {
      const journalText = summaryData.journals.length > 0 ? summaryData.journals.join("\n") : "No daily journal notes recorded this week.";
      const breakdownText = summaryData.habitBreakdown
        .map((h) => `- ${h.label}: ${h.completed}/${h.total}`)
        .join("\n");
        
      const protocolText = summaryData.weeklyProtocolGoals.length > 0
        ? summaryData.weeklyProtocolGoals
            .map((g) => {
              const countText = (g.targetCount && g.targetCount > 0) ? ` (${g.completedCount || 0}/${g.targetCount})` : "";
              const failText = (g.status === "failed" && g.failReason) ? ` - Reason: ${g.failReason}` : "";
              return `- "${g.text}" [Status: ${(g.status || (g.completed ? "completed" : "pending")).toUpperCase()}${countText}]${failText}`;
            })
            .join("\n")
        : "No weekly execution focus targets logged.";

      const weightText = summaryData.weightHistory.length > 0
        ? summaryData.weightHistory.map((w) => `- ${w.date}: ${w.weight} lbs`).join("\n")
        : "No weigh-ins logged recently.";

      const contextBundle = `Weekly Adherence: ${summaryData.overallPercentage}% (${summaryData.totalCompleted}/${summaryData.totalPossible} total checks).\nHabit Breakdown:\n${breakdownText}\n\nRecent Bodyweight Log:\n${weightText}\n\nWeekly Execution Protocol Targets:\n${protocolText}\n\nDaily Journal Notes:\n${journalText}`;
      
      const userPrompt = "Review my completed week based on my performance data, recent bodyweight trend, weekly execution protocol targets, and journal notes. Seamlessly weave my weight progress and execution protocol targets (along with their Smashed/Failed/Pending status) into your standard narrative and verdict sections. Maintain a sharp, direct, conversational coaching tone blending physical adherence and lifestyle execution. If compliance or weight trend is off-track, tell me to sort my shit out.";

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: `${getCoachSystemPrompt()}\n\nATHLETE PROFILE & LIVE METRICS:\n${contextBundle}`,
              },
            ],
          },
          contents: [
            { role: "user", parts: [{ text: userPrompt }] }
          ],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini request failed (${res.status})`);
      }

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!reply) throw new Error("No response generated by Gemini.");

      setHasGenerated(true);
      setSummaryData((prev) => (prev ? { ...prev, aiSummary: reply.trim() } : null));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate AI weekly summary.");
    } finally {
      setLoadingAi(false);
    }
  };

  const handleLockInWeek = async () => {
    if (!summaryData || !summaryData.hasWeighedInToday) {
      return;
    }

    const todayStr = todayKey();
    const weekKey = `p35_finalised_week_${todayStr}`;
    const overallPct = summaryData.overallPercentage ?? 0;
    
    const fullBackupData: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("p35_")) {
        fullBackupData[key] = localStorage.getItem(key) || "";
      }
    }

    const weekArchiveRecord = {
      date: todayStr,
      overallPercentage: overallPct,
      totalCompleted: summaryData.totalCompleted ?? 0,
      totalPossible: summaryData.totalPossible ?? 0,
      breakdown: summaryData.habitBreakdown ?? [],
      weeklyProtocolGoals: summaryData.weeklyProtocolGoals ?? [],
      aiSynthesis: summaryData.aiSummary ?? "",
      fullLocalStorageSnapshot: fullBackupData,
    };

    try {
      localStorage.setItem(weekKey, JSON.stringify(weekArchiveRecord));
      localStorage.setItem("p35_last_locked_week", todayStr);
      await triggerFridayBackup(todayStr);
    } catch (err) {
      console.error("Failed to save weekly archive or trigger backup", err);
    }
    
    setIsOpen(false);
    calculateWeekData();

    window.dispatchEvent(new Event("p35-week-finalised"));

    if (overallPct < 50) {
      toast.error(`Week locked in at ${overallPct}%. Absolute shambles. Sort your shit out.`);
    } else if (overallPct < 80) {
      toast.error(`Week locked in at ${overallPct}%. Decent base, but you left meat on the bone.`);
    } else if (overallPct === 100) {
      toast.success(`Week locked in at 100%. Absolute clinic. Flawless execution.`);
    } else {
      toast.success(`Week locked in at ${overallPct}%. Smashing it. Standard held.`);
    }
  };

  if (!summaryData || !summaryData.isSunday) {
    return null;
  }

  return (
    <div className={`panel p-4 space-y-3 ${summaryData.isFinalised ? "border-emerald-500/40 bg-emerald-500/10" : "border-primary/40 bg-primary/10"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${summaryData.isFinalised ? "bg-emerald-500/20 text-emerald-400" : "bg-primary/20 text-primary"}`}>
            {summaryData.isFinalised ? <Check className="size-5" /> : <CalendarCheck className="size-5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {summaryData.isFinalised ? "Sunday: Week Finalised & Locked" : "Sunday: Finalise Week"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {summaryData.isFinalised ? "Weekly audit complete and backed up. Refinalise anytime if adjustments are needed." : "Review metrics, protocol targets, synthesize journals, and lock in."}
            </p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (open) {
            calculateWeekData();
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" variant={summaryData.isFinalised ? "outline" : "default"} className="gap-1.5 shrink-0">
              <Sparkles className="size-4" />
              {summaryData.isFinalised ? "Refinalise" : "Finalise"}
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

              <div className="rounded-lg border border-border bg-surface-2/60 p-4 text-center space-y-1">
                <p className="stat-label">You were on form for</p>
                <p className="font-display text-3xl font-bold text-primary">{summaryData.overallPercentage}%</p>
                <p className="text-xs text-muted-foreground">of the week ({summaryData.totalCompleted}/{summaryData.totalPossible} total checks)</p>
              </div>

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

              {summaryData.weeklyProtocolGoals.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weekly Execution Protocol</p>
                    <span className="text-[10px] text-muted-foreground italic">Check dashboard to amend</span>
                  </div>
                  <div className="space-y-2 rounded-lg border border-border bg-surface-2/40 p-3">
                    {summaryData.weeklyProtocolGoals.map((g) => {
                      const currentStatus = g.status || (g.completed ? "completed" : "pending");
                      const current = g.completedCount || 0;
                      const total = g.targetCount || 0;
                      
                      return (
                        <div key={g.id} className="flex flex-col gap-2 py-2 border-b border-border/40 last:border-0">
                          <span className={`text-xs font-medium ${currentStatus === "completed" ? "text-emerald-400" : currentStatus === "failed" ? "text-rose-400 line-through opacity-80" : "text-foreground"}`}>
                            {g.text}
                          </span>
                          {g.failReason && currentStatus === "failed" && (
                            <span className="text-[11px] text-rose-300/80 italic pl-1">Reason: {g.failReason}</span>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              currentStatus === "completed" 
                                ? "bg-emerald-500/20 text-emerald-300" 
                                : currentStatus === "failed" 
                                ? "bg-rose-500/20 text-rose-300" 
                                : "bg-amber-500/20 text-amber-300"
                            }`}>
                              {currentStatus === "completed" ? "Smashed" : currentStatus === "failed" ? "Failed" : total > 0 ? `${current}/${total}` : "Pending"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                    {loadingAi ? <Loader2 className="size-3 animate-spin" /> : "Generate / Refresh"}
                  </Button>
                </div>
                {loadingAi ? (
                  <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span>Synthesizing journal notes and weight trend...</span>
                  </div>
                ) : hasGenerated ? (
                  <FormattedSynthesis text={summaryData.aiSummary} />
                ) : (
                  <p className="text-xs text-muted-foreground italic py-2">
                    {summaryData.aiSummary}
                  </p>
                )}
              </div>

              <Button 
                className="w-full" 
                disabled={!summaryData.hasWeighedInToday} 
                onClick={() => void handleLockInWeek()}
              >
                {summaryData.hasWeighedInToday ? "Lock In & Close Summary" : "Weekly Weight Needed First"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
