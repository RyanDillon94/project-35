import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { exportDashboardBackup, importDashboardBackup } from "@/lib/p35-cloud";
import { Download, Upload, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function DataBackupCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (file?: File) => {
    if (!file) return;
    const success = await importDashboardBackup(file);
    if (success) {
      toast.success("Backup restored successfully. Reloading data...");
      setTimeout(() => window.location.reload(), 800);
    } else {
      toast.error("Invalid backup file. Could not restore data.");
    }
  };

  return (
    <div className="mt-8 border-t border-border/40 pt-6 pb-12 text-center">
      <details className="group mx-auto max-w-sm">
        <summary className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground select-none list-none [&::-webkit-details-marker]:hidden">
          <ShieldCheck className="size-3.5" />
          <span>Local Storage & Backups</span>
        </summary>

        <div className="mt-4 rounded-xl border border-border/60 bg-surface-2/40 p-4 space-y-3 text-left animate-in fade-in zoom-in-95">
          <p className="text-xs text-muted-foreground">
            All data lives entirely on this device. Create an offline snapshot or restore a previous export.
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5"
              onClick={exportDashboardBackup}
            >
              <Download className="size-3.5" /> Export Data
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-3.5" /> Restore File
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              handleImport(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </details>
    </div>
  );
}
