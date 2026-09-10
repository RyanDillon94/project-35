import { Button } from "@/components/ui/button";
import { getDeloadOffset, toggleDeloadWeek } from "@/utils/dateUtils";
import { Umbrella } from "lucide-react";

export function DeloadCard() {
  const isDeloadActive = getDeloadOffset() > 0;

  return (
    <div className="text-center w-full">
      <details className="group mx-auto max-w-sm">
        <summary className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground select-none list-none [&::-webkit-details-marker]:hidden">
          <Umbrella className="size-3.5" />
          <span>Deload / Holiday Mode</span>
          {isDeloadActive && <span className="size-1.5 rounded-full bg-amber-400 inline-block ml-1" />}
        </summary>

        <div className="mt-3 rounded-xl border border-border/60 bg-surface-2/40 p-4 space-y-3 text-left animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Status:</span>
            <span className={isDeloadActive ? "text-amber-400 font-medium" : "text-muted-foreground"}>
              {isDeloadActive ? "Active (+7d Roadmap Shift)" : "Standard Execution"}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Use this when traveling or sick to pause routine tracking and shift schedule offsets.
          </p>

          <Button
            variant="outline"
            size="sm"
            className={`w-full h-8 text-xs font-medium transition-colors ${
              isDeloadActive 
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30' 
                : 'text-secondary-foreground hover:bg-secondary/80'
            }`}
            onClick={() => {
              toggleDeloadWeek();
              window.location.reload();
            }}
          >
            {isDeloadActive ? 'Undo Deload' : 'Mark Deload Week'}
          </Button>
        </div>
      </details>
    </div>
  );
}
