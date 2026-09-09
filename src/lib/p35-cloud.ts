import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WeightEntry } from "@/components/p35/weight-card";
import type { HevyWorkout } from "@/lib/hevy.functions";
import type { Json } from "@/integrations/supabase/types";

export type PhotoSlot = "baseline" | "current";
export type HabitKey = "gym" | "steps" | "protein";
export type CoachMsg = { role: "user" | "assistant"; content: string };

const PHOTO_BUCKET = "progress-photos";

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/* ---------------- weigh-ins ---------------- */

export function useWeighIns(userId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["weigh-ins", userId],
    enabled: !!userId,
    queryFn: async (): Promise<WeightEntry[]> => {
      const { data, error } = await supabase
        .from("weigh_ins")
        .select("entry_date, weight_lbs")
        .order("entry_date", { ascending: true });
      fail(error);
      return (data ?? []).map((row) => ({
        date: row.entry_date,
        weight: Number(row.weight_lbs),
      }));
    },
  });

  const save = useMutation({
    mutationFn: async (entry: WeightEntry) => {
      if (!userId) throw new Error("Sign in first.");
      const { error } = await supabase.from("weigh_ins").upsert(
        { user_id: userId, entry_date: entry.date, weight_lbs: entry.weight },
        { onConflict: "user_id,entry_date" },
      );
      fail(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["weigh-ins", userId] }),
  });

  return { entries: query.data ?? [], loading: query.isLoading, save };
}

/* ---------------- habits ---------------- */

export function useHabitDay(userId: string | null, day: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["habit-day", userId, day],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_days")
        .select("gym, steps, protein")
        .eq("day", day)
        .maybeSingle();
      fail(error);
      return data ?? { gym: false, steps: false, protein: false };
    },
  });

  const habits = query.data ?? { gym: false, steps: false, protein: false };

  const toggle = useMutation({
    mutationFn: async (key: HabitKey) => {
      if (!userId) throw new Error("Sign in first.");
      const { error } = await supabase.from("habit_days").upsert(
        { user_id: userId, day, ...habits, [key]: !habits[key], updated_at: new Date().toISOString() },
        { onConflict: "user_id,day" },
      );
      fail(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["habit-day", userId, day] }),
  });

  return { habits, toggle };
}

/* ---------------- photos ---------------- */

export function usePhotos(userId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["progress-photos", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Partial<Record<PhotoSlot, string>>> => {
      const { data, error } = await supabase.from("progress_photos").select("slot, storage_path");
      fail(error);
      const urls: Partial<Record<PhotoSlot, string>> = {};
      for (const row of data ?? []) {
        const { data: signed } = await supabase.storage
          .from(PHOTO_BUCKET)
          .createSignedUrl(row.storage_path, 60 * 60);
        if (signed?.signedUrl) urls[row.slot as PhotoSlot] = signed.signedUrl;
      }
      return urls;
    },
  });

  const upload = useMutation({
    mutationFn: async ({ slot, file }: { slot: PhotoSlot; file: File }) => {
      if (!userId) throw new Error("Sign in first.");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${slot}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
      fail(uploadError);
      const { error } = await supabase.from("progress_photos").upsert(
        { user_id: userId, slot, storage_path: path, updated_at: new Date().toISOString() },
        { onConflict: "user_id,slot" },
      );
      fail(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["progress-photos", userId] }),
  });

  return { photos: query.data ?? {}, upload };
}

/* ---------------- coach chat ---------------- */

export function useCoachMessages(userId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["coach-messages", userId],
    enabled: !!userId,
    queryFn: async (): Promise<CoachMsg[]> => {
      const { data, error } = await supabase
        .from("coach_messages")
        .select("role, content")
        .order("created_at", { ascending: true })
        .limit(200);
      fail(error);
      return (data ?? []).map((row) => ({ role: row.role as CoachMsg["role"], content: row.content }));
    },
  });

  const add = useMutation({
    mutationFn: async (message: CoachMsg) => {
      if (!userId) throw new Error("Sign in first.");
      const { error } = await supabase.from("coach_messages").insert({ user_id: userId, ...message });
      fail(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["coach-messages", userId] }),
  });

  return { messages: query.data ?? [], add };
}

/* ---------------- settings (Hevy key + last workout) ---------------- */

export function useUserSettings(userId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["user-settings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("hevy_api_key, latest_workout")
        .maybeSingle();
      fail(error);
      return {
        hevyApiKey: data?.hevy_api_key ?? "",
        workout: (data?.latest_workout as HevyWorkout | null) ?? null,
      };
    },
  });

  const update = useMutation({
    mutationFn: async (patch: { hevyApiKey?: string; workout?: HevyWorkout | null }) => {
      if (!userId) throw new Error("Sign in first.");
      const row = {
        user_id: userId,
        updated_at: new Date().toISOString(),
        ...(patch.hevyApiKey !== undefined ? { hevy_api_key: patch.hevyApiKey || null } : {}),
        ...(patch.workout !== undefined
          ? { latest_workout: patch.workout as unknown as Json }
          : {}),
      };
      const { error } = await supabase.from("user_settings").upsert(row, { onConflict: "user_id" });
      fail(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["user-settings", userId] }),
  });

  return {
    hevyApiKey: query.data?.hevyApiKey ?? "",
    workout: query.data?.workout ?? null,
    loading: query.isLoading,
    update,
  };
}
