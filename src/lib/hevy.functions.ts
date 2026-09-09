import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ apiKey: z.string().min(4) });

export type HevySet = { weightKg: number | null; reps: number | null; type?: string | undefined };
export type HevyExercise = { title: string; sets: HevySet[] };
export type HevyWorkout = {
  id: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  exercises: HevyExercise[];
};

export const fetchLatestHevyWorkout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<{ workout: HevyWorkout | null }> => {
    const res = await fetch("https://api.hevyapp.com/v1/workouts?page=1&pageSize=5", {
      headers: { "api-key": data.apiKey, accept: "application/json" },
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
          sets?: Array<{ weight_kg?: number | null; reps?: number | null; type?: string }>;
        }>;
      }>;
    };

    const raw = json.workouts?.[0];
    if (!raw) return { workout: null };

    return {
      workout: {
        id: raw.id ?? "latest",
        title: raw.title ?? "Untitled workout",
        startTime: raw.start_time ?? null,
        endTime: raw.end_time ?? null,
        exercises: (raw.exercises ?? []).map((ex) => ({
          title: ex.title ?? "Exercise",
          sets: (ex.sets ?? []).map((s) => ({
            weightKg: s.weight_kg ?? null,
            reps: s.reps ?? null,
            type: s.type,
          })),
        })),
      },
    };
  });
