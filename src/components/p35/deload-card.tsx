import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BatteryCharging, BatteryLow } from "lucide-react";
import { toast } from "sonner";

export function DeloadCard() {
  const [isDeload, setIsDeload] = useState(false);

  useEffect(() => {
    try {
      const active = 
        localStorage.getItem("p35_is_deload") === "true" || 
        localStorage.getItem("p35_deload_mode") === "true";
      setIsDeload(active);
    } catch {}
  }, []);

  const toggleDeload = () => {
    const next = !isDeload;
    setIsDeload(next);
    try {
      localStorage.setItem("p35_is_deload", String(next));
      localStorage.setItem("p35_deload_mode", String(next));
      
      if (next) {
        toast.success("Deload / Holiday Mode active. Refreshing standards...");
      } else {
        toast.info("Deload mode turned off. Resuming standard...");
      }

      // Small delay to let the toast show, then reload the page so all components and dates recalculate
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch {
      toast.error("Failed to save deload state.");
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
            {isDeload ? "Active — Standards relaxed for recovery or travel" : "Standard mode active"}
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
