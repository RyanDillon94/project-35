import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BatteryCharging, BatteryLow } from "lucide-react";
import { getDeloadOffset, toggleDeloadWeek } from "@/utils/dateUtils";
import { toast } from "sonner";

export function DeloadCard() {
  const [isDeload, setIsDeload] = useState(false);

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
        toast.success("Deload Week Activated", {
          description: "Schedule offsets and standards have been adjusted for recovery.",
          duration: 4000,
        });
      } else {
        toast.info("Deload Week Deactivated", {
          description: "Full standard execution has been resumed.",
          duration: 4000,
        });
      }

      // Dispatch a custom event so other components can catch the state change without a full reload
      window.dispatchEvent(new Event("storage"));
    } catch {
      toast.error("Failed to update deload state.");
    }
  };

  return (
    <div className="flex items-center justify-between w-full rounded-lg border border-border bg-surface-2/60 p-3.5">
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
  );
}
