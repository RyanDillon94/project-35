export type HevySet = {
  weightKg: number | null;
  reps: number | null;
  type?: string | undefined;
  rpe?: number | null;
  notes?: string | null;
};

export type HevyExercise = {
  title: string;
  notes?: string | null;
  sets: HevySet[];
};

export type HevyWorkout = {
  id: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  exercises: HevyExercise[];
};

export async function fetchLatestHevyWorkout({
  data,
}: {
  data: { apiKey: string };
}): Promise<{ workout: HevyWorkout | null; workouts: HevyWorkout[] }> {
  const cleanKey = data.apiKey.trim();
  if (!cleanKey) {
    throw new Error("Missing Hevy API key.");
  }

  const endpoint =
    window.location.hostname === "localhost"
      ? "https://api.hevyapp.com/v1/workouts?page=1&pageSize=10"
      : "/hevy-api/workouts?page=1&pageSize=10";

  const res = await fetch(endpoint, {
    headers: {
      "api-key": cleanKey,
      accept: "application/json",
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("Hevy rejected that API key. Check it in settings.");
  }
  if (!res.ok) {
    throw new Error(`Hevy request failed (${res.status}).`);
  }

const json = (await res.json()) as {
    workouts?: Array<{
      id?: string;
      title?: string;
      start_time?: string;
      end_time?: string;
      exercises?: Array<{
        title?: string;
        notes?: string | null;
        sets?: Array<{
          weight_kg?: number | null;
          reps?: number | null;
          type?: string;
          rpe?: number | null;
          notes?: string | null;
        }>;
      }>;
    }>;
  };

  const rawWorkouts = json.workouts ?? [];
  
  const workouts: HevyWorkout[] = rawWorkouts.map((raw) => ({
    id: raw.id ?? "unknown",
    title: raw.title ?? "Untitled workout",
    startTime: raw.start_time ?? null,
    endTime: raw.end_time ?? null,
    exercises: (raw.exercises ?? []).map((ex) => ({
      title: ex.title ?? "Exercise",
      notes: ex.notes ?? null,
      sets: (ex.sets ?? []).map((s) => ({
        weightKg: s.weight_kg ?? null,
        reps: s.reps ?? null,
        type: s.type,
        rpe: s.rpe ?? null,
        notes: s.notes ?? null,
      })),
    })),
  }));

  const latestWorkout = workouts[0] ?? null;

  try {
    if (latestWorkout) {
      localStorage.setItem("p35_cached_workout", JSON.stringify(latestWorkout));
    }
    if (workouts.length > 0) {
      localStorage.setItem("p35_hevy_workouts", JSON.stringify(workouts));
    }
  } catch {}

  return {
    workout: latestWorkout,
    workouts,
  };
}