import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HevyWorkout } from "./hevy.functions";

export type WeightEntry = {
  date: string;
  weight: number;
};

export type UserSettings = {
  hevyApiKey: string;
  workout: HevyWorkout | null;
};

export type HabitKey = "gym" | "steps" | "protein";
export type HabitsState = Record<HabitKey, boolean>;

export type PhotoSlot = "baseline" | "current";
export type PhotosState = Record<PhotoSlot, string | null>;

export type CoachMsg = {
  role: "user" | "assistant";
  content: string;
};

// Safe LocalStorage helpers
function getLocal<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to save ${key} to localStorage:`, err);
  }
}

// Helper to pull all daily habit history across all dates
function getAllLocalHabits(): Record<string, HabitsState> {
  const habits: Record<string, HabitsState> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("p35_habits_")) {
        const day = key.replace("p35_habits_", "");
        habits[day] = getLocal<HabitsState>(key, { gym: false, steps: false, protein: false });
      }
    }
  } catch (err) {
    console.error("Failed to read habits from localStorage:", err);
  }
  return habits;
}

// Build a complete snapshot of all dashboard state
export function buildFullBackup() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    weighIns: getLocal("p35_weigh_ins", []),
    hevyApiKey: localStorage.getItem("p35_hevy_api_key") || "",
    geminiApiKey: localStorage.getItem("p35_gemini_api_key") || "",
    workout: getLocal("p35_cached_workout", null),
    photos: getLocal("p35_photos", { baseline: null, current: null }),
    coachMessages: getLocal("p35_coach_messages", []),
    habits: getAllLocalHabits(),
  };
}

// Compress images so phone localStorage does not exceed storage limits
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1000;
        let { width, height } = img;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context failed"));

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 1. HABITS HOOK
export function useHabitDay(userId: string | null, dayKey: string) {
  const qc = useQueryClient();
  const queryKey = ["p35-habits", userId || "local", dayKey];

  const defaultHabits: HabitsState = {
    gym: false,
    steps: false,
    protein: false,
  };

  const { data: habits = defaultHabits } = useQuery<HabitsState>({
    queryKey,
    queryFn: () => getLocal<HabitsState>(`p35_habits_${dayKey}`, defaultHabits),
    staleTime: Infinity,
  });

  const toggle = useMutation({
    mutationFn: async (key: HabitKey) => {
      const current = getLocal<HabitsState>(`p35_habits_${dayKey}`, defaultHabits);
      const updated = { ...current, [key]: !current[key] };
      setLocal(`p35_habits_${dayKey}`, updated);
      return updated;
    },
    onSuccess: (updated) => {
      qc.setQueryData(queryKey, updated);
    },
  });

  return { habits, toggle };
}

// 2. WEIGH-INS HOOK
export function useWeighIns(userId: string | null) {
  const qc = useQueryClient();
  const queryKey = ["p35-weigh-ins", userId || "local"];

  const { data: entries = [] } = useQuery<WeightEntry[]>({
    queryKey,
    queryFn: () => getLocal<WeightEntry[]>("p35_weigh_ins", []),
    staleTime: Infinity,
  });

  const save = useMutation({
    mutationFn: async (entry: WeightEntry) => {
      const current = getLocal<WeightEntry[]>("p35_weigh_ins", []);
      const index = current.findIndex((e) => e.date === entry.date);
      let updated: WeightEntry[];
      if (index >= 0) {
        updated = [...current];
        updated[index] = entry;
      } else {
        updated = [...current, entry];
      }
      setLocal("p35_weigh_ins", updated);
      return updated;
    },
    onSuccess: (updated) => {
      qc.setQueryData(queryKey, updated);
    },
  });

  return { entries, save };
}

// 3. USER SETTINGS HOOK
export function useUserSettings(userId: string | null) {
  const qc = useQueryClient();
  const queryKey = ["p35-settings", userId || "local"];

  const { data = { hevyApiKey: "", workout: null } } = useQuery<UserSettings>({
    queryKey,
    queryFn: () => ({
      hevyApiKey: localStorage.getItem("p35_hevy_api_key") || "",
      workout: getLocal<HevyWorkout | null>("p35_cached_workout", null),
    }),
    staleTime: Infinity,
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      if (patch.hevyApiKey !== undefined) {
        localStorage.setItem("p35_hevy_api_key", patch.hevyApiKey);
      }
      if (patch.workout !== undefined) {
        setLocal("p35_cached_workout", patch.workout);
      }
      return {
        hevyApiKey: localStorage.getItem("p35_hevy_api_key") || "",
        workout: getLocal<HevyWorkout | null>("p35_cached_workout", null),
        ...patch,
      };
    },
    onSuccess: (updated) => {
      qc.setQueryData(queryKey, updated);
    },
  });

  return {
    hevyApiKey: data.hevyApiKey,
    workout: data.workout,
    update,
  };
}

// 4. PHOTOS HOOK
export function usePhotos(userId: string | null) {
  const qc = useQueryClient();
  const queryKey = ["p35-photos", userId || "local"];

  const defaultPhotos: PhotosState = {
    baseline: null,
    current: null,
  };

  const { data: photos = defaultPhotos } = useQuery<PhotosState>({
    queryKey,
    queryFn: () => getLocal<PhotosState>("p35_photos", defaultPhotos),
    staleTime: Infinity,
  });

  const upload = useMutation({
    mutationFn: async ({ slot, file }: { slot: PhotoSlot; file: File }) => {
      const dataUrl = await compressImage(file);
      const current = getLocal<PhotosState>("p35_photos", defaultPhotos);
      const updated = { ...current, [slot]: dataUrl };
      setLocal("p35_photos", updated);
      return updated;
    },
    onSuccess: (updated) => {
      qc.setQueryData(queryKey, updated);
    },
  });

  return { photos, upload };
}

// 5. BACKUP EXPORT & IMPORT UTILITIES
export function exportDashboardBackup() {
  const backup = buildFullBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `project35-backup-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importDashboardBackup(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.weighIns) setLocal("p35_weigh_ins", data.weighIns);
        if (data.hevyApiKey) localStorage.setItem("p35_hevy_api_key", data.hevyApiKey);
        if (data.geminiApiKey) localStorage.setItem("p35_gemini_api_key", data.geminiApiKey);
        if (data.workout) setLocal("p35_cached_workout", data.workout);
        if (data.photos) setLocal("p35_photos", data.photos);
        if (data.coachMessages) setLocal("p35_coach_messages", data.coachMessages);

        // Restore all habit states
        if (data.habits && typeof data.habits === "object") {
          for (const [dayKey, state] of Object.entries(data.habits)) {
            setLocal(`p35_habits_${dayKey}`, state);
          }
        }
        resolve(true);
      } catch {
        resolve(false);
      }
    };
    reader.readAsText(file);
  });
}

// 6. COACH MESSAGES HOOK
export function useCoachMessages(userId: string | null) {
  const qc = useQueryClient();
  const queryKey = ["p35-coach-msgs", userId || "local"];

  const { data: messages = [] } = useQuery<CoachMsg[]>({
    queryKey,
    queryFn: () => getLocal<CoachMsg[]>("p35_coach_messages", []),
    staleTime: Infinity,
  });

  const add = useMutation({
    mutationFn: async (msg: CoachMsg) => {
      const current = getLocal<CoachMsg[]>("p35_coach_messages", []);
      const updated = [...current, msg];
      setLocal("p35_coach_messages", updated);
      return updated;
    },
    onSuccess: (updated) => {
      qc.setQueryData(queryKey, updated);
    },
  });

  return { messages, add };
}

// 7. FRIDAY WEIGH-IN AUTO BACKUP
export async function triggerFridayBackup(date: string): Promise<void> {
  const backup = buildFullBackup();
  const jsonStr = JSON.stringify(backup, null, 2);
  const fileName = `p35-backup-${date}.json`;
  const file = new File([jsonStr], fileName, { type: "application/json" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Project 35 Backup (${date})`,
        text: `Complete snapshot for ${date}`,
      });
      return;
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
    }
  }

  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
