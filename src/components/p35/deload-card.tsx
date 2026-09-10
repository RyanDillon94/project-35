import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BatteryCharging, BatteryLow, CheckCircle2 } from "lucide-react";
import { getDeloadOffset, toggleDeloadWeek } from "@/utils/dateUtils";

export function DeloadCard() {
  const [isDeload, setIsDeload] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      setIsDeload(getDeloadOffset() > 0);
    } catch {}
  }, []);

  const toggleDeload = () => {
    try {
      toggleDeloadWeek();
      const activeNow = getDeloadOffset() > 0;
      setIsDeload(activeNow);

      if (activeNow) {
        setStatusMessage("Deload Week Activated");
      } else {
        setStatusMessage("Deload Week Deactivated");
      }

      // Hide the status banner after 4 solid seconds
      setTimeout(() => {
        setStatusMessage(null);
      }, 4000);

      // Soft trigger for other components to re-render without a full page reload
      window.dispatchEvent(new Event("storage"));
    } catch {
      setStatusMessage("Failed to update deload state");
    }
  };

  return (
    <div className="flex flex-col w-full rounded-lg border border-border bg-surface-2/60 p-3.5 gap-2">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3 min-w-0 pr-2">
          {isDeload ? (
            <BatteryLow className="size-5 shrink-0 text-amber-500 animate-pulse" />
          ) : (
            <BatteryCharging className="size-5 shrink-0 text-primary" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate text-foreground">Deload / Holiday Mode</p>
            <p className="text-xs text-muted-foreground truncate">
              {isDeload ? "Active — Deload Week" : "Standard mode active"}
            </p>
          </div>
        </div>

        <Button
          variant={isDeload ? "default" : "outline"}
          size="sm"
          onClick={toggleDeload}
          className={`gap-1.5 shrink-0 ${isDeload ? "bg-amber-500 hover:bg-amber-600 text-black font-semibold" : ""}`}
        >
          {isDeload ? "Active" : "Enable"}
        </Button>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-medium text-primary animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="size-4 shrink-0 text-primary" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
}
