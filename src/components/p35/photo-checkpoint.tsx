import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePhotos, type PhotoAngle, type PhotoSlot } from "@/lib/p35-cloud";
import { Camera, ImagePlus, Loader2, Maximize2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const ANGLES: Array<{ id: PhotoAngle; label: string }> = [
  { id: "front", label: "Front" },
  { id: "side", label: "Side" },
  { id: "back", label: "Back" },
];

export function PhotoCheckpoint({ userId }: { userId: string | null }) {
  const [selectedAngle, setSelectedAngle] = useState<PhotoAngle>("front");
  const [modalImage, setModalImage] = useState<{ src: string; title: string } | null>(null);

  const { photos, upload, removePhoto } = usePhotos(userId);
  const pending = useRef<PhotoSlot>("baseline");
  const inputRef = useRef<HTMLInputElement>(null);

  const activeAnglePhotos = photos[selectedAngle] || { baseline: null, current: null };

  const pick = (slot: PhotoSlot) => {
    pending.current = slot;
    inputRef.current?.click();
  };

  const onFile = (file?: File) => {
    if (!file) return;
    if (file.size > 10_000_000) {
      toast.error("Image too large. Use one under 10 MB.");
      return;
    }
    upload.mutate(
      { angle: selectedAngle, slot: pending.current, file },
      {
        onSuccess: () =>
          toast.success(
            `${pending.current === "baseline" ? "Baseline" : "Current"} (${selectedAngle.toUpperCase()}) saved.`,
          ),
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : "Upload failed."),
      },
    );
  };

  const slots: Array<{ slot: PhotoSlot; label: string; sublabel: string }> = [
    { slot: "baseline", label: "Baseline", sublabel: "Day 1 Standard" },
    { slot: "current", label: "Current", sublabel: "Latest Checkpoint" },
  ];

  return (
    <section className="panel p-5 space-y-4">
      {/* Header with Angle Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Camera className="size-5 text-primary" />
          <h2 className="text-lg font-bold">Photo Checkpoint</h2>
          {upload.isPending && <Loader2 className="size-4 animate-spin text-primary" />}
        </div>

        {/* Tab Pills */}
        <div className="flex rounded-lg border border-border bg-surface-2/60 p-1">
          {ANGLES.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedAngle(a.id)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                selectedAngle === a.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-Side Comparison Container */}
      <div className="grid grid-cols-2 gap-3">
        {slots.map(({ slot, label, sublabel }) => {
          const photoSrc = activeAnglePhotos[slot];
          return (
            <div key={slot} className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="stat-label font-semibold text-foreground">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{sublabel}</p>
                </div>
                {photoSrc && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setModalImage({
                          src: photoSrc,
                          title: `${label} (${selectedAngle.toUpperCase()})`,
                        })
                      }
                      aria-label={`View ${label}`}
                      className="rounded p-1 text-muted-foreground transition-colors hover:text-primary"
                    >
                      <Maximize2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto.mutate({ angle: selectedAngle, slot })}
                      aria-label={`Delete ${label}`}
                      className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => pick(slot)}
                className={`relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed transition-all ${
                  photoSrc
                    ? "border-border bg-surface-2/50 active:border-primary"
                    : "border-border/70 bg-surface-2/20 hover:border-primary/50 hover:bg-surface-2/40 active:border-primary"
                }`}
              >
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt={`${label} (${selectedAngle})`}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="grid size-9 place-items-center rounded-lg bg-surface-2 text-primary">
                      <ImagePlus className="size-4" />
                    </div>
                    Tap to upload
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Quick Action Button for Selected Angle */}
      <Button
        variant="secondary"
        className="w-full"
        disabled={upload.isPending}
        onClick={() => pick("current")}
      >
        <ImagePlus className="size-4 mr-2" /> Upload current ({selectedAngle})
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* Fullscreen Preview Modal */}
      {modalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setModalImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-sm w-full overflow-hidden rounded-2xl border border-border bg-surface-2 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-xs font-semibold text-primary">{modalImage.title}</p>
              <button
                type="button"
                onClick={() => setModalImage(null)}
                className="rounded-full bg-surface-2/80 p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <img
              src={modalImage.src}
              alt={modalImage.title}
              className="max-h-[75vh] w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
