import { Badge } from "@/components/ui/badge";
import { ACTIVE_BLOCK, blockCountdown } from "@/lib/project35";
import { CalendarClock, Flame, ShieldHalf } from "lucide-react";

export function DashboardHeader() {
  const { weeksLeft, daysLeft, progress } = blockCountdown();

  return (
    <header className="panel glow-ring relative overflow-hidden p-5">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <ShieldHalf className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="stat-label">Character sheet</p>
          <h1 className="text-2xl leading-tight font-bold">
            Project 35: <span className="text-primary">The Undeniable Standard</span>
          </h1>
        </div>
      </div>

      <p className="mt-4 border-l-2 border-primary/60 pl-3 text-sm text-muted-foreground italic">
        Built over years. Ready for everything. Arrive at 35 in undeniable shape.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge className="gap-1.5 bg-primary/15 text-primary hover:bg-primary/20">
          <Flame className="size-3.5" />
          Phase 1: The Cut &amp; The Clock (Block 1: Weeks 1&ndash;12)
        </Badge>
        <Badge
          variant="outline"
          className="gap-1.5 border-border text-muted-foreground"
        >
          <CalendarClock className="size-3.5" />
          Target: November 2029 &mdash; Age 35
        </Badge>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { label: "Weeks left", value: String(weeksLeft) },
          { label: "Days left", value: String(daysLeft) },
          { label: "Block progress", value: `${progress}%` },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-border bg-surface-2/60 p-3 text-center"
          >
            <p className="font-display text-2xl font-bold text-primary">{item.value}</p>
            <p className="stat-label mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="size-3.5" /> Target: {ACTIVE_BLOCK.label}
      </p>
    </header>
  );
}
