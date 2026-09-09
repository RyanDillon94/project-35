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

export type HabitDay = {
  date: string;
  gymCompleted: boolean;
  stepsHit: boolean;
  proteinBanked: boolean;
};

export type CheckpointPhoto = {
  id: string;
  date: string;
  label: "Front" | "Side" | "Back";
  dataUrl: string;
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

// 1. WEIGH-INS HOOK
export function useWeighIns(userId: string) {
  const qc = useQueryClient();
  const queryKey = ["p35-weigh-ins", userId];

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

// 2. USER SETTINGS & HEVY WORKOUT HOOK
export function useUserSettings(userId: string) {
  const qc = useQueryClient();
  const queryKey = ["p35-settings", userId];

  const { data = { hevyApiKey: "", workout: null } } = useQuery<UserSettings>({
    queryKey,
    queryFn: () => {
      const apiKey = localStorage.getItem("p35_hevy_api_key") || "";
      const workout = getLocal<HevyWorkout | null>("p35_cached_workout", null);
      return { hevyApiKey: apiKey, workout };
    },
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
      const current = getLocal<UserSettings>("p35-settings", {
        hevyApiKey: localStorage.getItem("p35_hevy_api_key") || "",
        workout: getLocal<HevyWorkout | null>("p35_cached_workout", null),
      });
      return { ...current, ...patch };
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

// 3. DAILY NON-NEGOTIABLES / HABITS HOOK
export function useHabits(userId: string, dateKey: string) {
  const qc = useQueryClient();
  const queryKey = ["p35-habits", userId, dateKey];

  const defaultDay: HabitDay = {
    date: dateKey,
    gymCompleted: false,
    stepsHit: false,
    proteinBanked: false,
  };

  const { data: day = defaultDay } = useQuery<HabitDay>({
    queryKey,
    queryFn: () => getLocal<HabitDay>(`p35_habits_${dateKey}`, defaultDay),
    staleTime: Infinity,
  });

  const toggle = useMutation({
    mutationFn: async (habitKey: keyof Omit<HabitDay, "date">) => {
      const current = getLocal<HabitDay>(`p35_habits_${dateKey}`, defaultDay);
      const updated = { ...current, [habitKey]: !current[habitKey] };
      setLocal(`p35_habits_${dateKey}`, updated);
      return updated;
    },
    onSuccess: (updated) => {
      qc.setQueryData(queryKey, updated);
    },
  });

  return { day, toggle };
}

// 4. PHOTO CHECKPOINTS HOOK
export function usePhotos(userId: string) {
  const qc = useQueryClient();
  const queryKey = ["p35-photos", userId];

  const { data: photos = [] } = useQuery<CheckpointPhoto[]>({
    queryKey,
    queryFn: () => getLocal<CheckpointPhoto[]>("p35_photos", []),
    staleTime: Infinity,
  });

  const savePhoto = useMutation({
    mutationFn: async (photo: CheckpointPhoto) => {
      const current = getLocal<CheckpointPhoto[]>("p35_photos", []);
      const updated = [photo, ...current.filter((p) => p.id !== photo.id)];
      setLocal("p35_photos", updated);
      return updated;
    },
    onSuccess: (updated) => {
      qc.setQueryData(queryKey, updated);
    },
  });

  return { photos, savePhoto };
}

// 5. EXPORT / IMPORT BACKUP UTILITIES
export function exportDashboardBackup() {
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    weighIns: getLocal("p35_weigh_ins", []),
    hevyApiKey: localStorage.getItem("p35_hevy_api_key") || "",
    workout: getLocal("p35_cached_workout", null),
    photos: getLocal("p35_photos", []),
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `project35-backup-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
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
        if (data.workout) setLocal("p35_cached_workout", data.workout);
        if (data.photos) setLocal("p35_photos", data.photos);
        resolve(true);
      } catch {
        resolve(false);
      }
    };
    reader.readAsText(file);
  });
}
