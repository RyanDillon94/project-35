import { getMuscleGroupForExercise, MuscleGroup, MUSCLE_GROUPS } from "./strengthMapping";

export type WorkoutSet = {
  exerciseName: string;
  weight: number;
  reps: number;
  date: string; // YYYY-MM-DD
};

export type MuscleGroupSummary = {
  strengthChange: number;
  volumeChange: number;
  currentVolume: number;
  baselineVolume: number;
};

export type ProgressReport = {
  overallStrengthChange: number;
  overallVolumeChange: number;
  muscleGroups: Record<MuscleGroup, MuscleGroupSummary>;
  weeklyTrend: any[];
};

export function calculateE1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function calculateTrainingProgress(
  sets: WorkoutSet[],
  windowDays = 28
): ProgressReport {
  const now = new Date().getTime();
  const windowMs = windowDays * 86_400_000;
  const cutoffTime = now - windowMs;

  const validSets = sets.filter(s => {
    if (!s || s.weight <= 0 || s.reps <= 0) return false;
    const time = new Date(s.date).getTime();
    return !isNaN(time) && time >= cutoffTime && time <= now;
  });

  if (validSets.length === 0) {
    const emptyGroups = {} as Record<MuscleGroup, MuscleGroupSummary>;
    MUSCLE_GROUPS.forEach(g => {
      emptyGroups[g] = { strengthChange: 0, volumeChange: 0, currentVolume: 0, baselineVolume: 0 };
    });
    return { overallStrengthChange: 0, overallVolumeChange: 0, muscleGroups: emptyGroups, weeklyTrend: [] };
  }

  const sortedDates = Array.from(new Set(validSets.map(s => s.date))).sort();
  const baselineDateStr = sortedDates[0];
  const recentDateStr = sortedDates[sortedDates.length - 1];

  const baselineTimeLimit = new Date(baselineDateStr).getTime() + 3 * 86_400_000;
  const recentTimeLimit = new Date(recentDateStr).getTime() - 3 * 86_400_000;

  const exerciseComparison: Map<string, { muscle: MuscleGroup; baseE1rm: number; recentE1rm: number; baseVol: number; recentVol: number; baseSets: number; recentSets: number }> = new Map();

  validSets.forEach(s => {
    const muscle = getMuscleGroupForExercise(s.exerciseName);
    if (!muscle) return;

    const time = new Date(s.date).getTime();
    const e1rm = calculateE1RM(s.weight, s.reps);
    const vol = s.weight * s.reps;

    if (!exerciseComparison.has(s.exerciseName)) {
      exerciseComparison.set(s.exerciseName, {
        muscle,
        baseE1rm: 0,
        recentE1rm: 0,
        baseVol: 0,
        recentVol: 0,
        baseSets: 0,
        recentSets: 0,
      });
    }

    const entry = exerciseComparison.get(s.exerciseName)!;

    if (time <= baselineTimeLimit) {
      entry.baseVol += vol;
      entry.baseSets += 1;
      if (e1rm > entry.baseE1rm) entry.baseE1rm = e1rm;
    }

    if (time >= recentTimeLimit) {
      entry.recentVol += vol;
      entry.recentSets += 1;
      if (e1rm > entry.recentE1rm) entry.recentE1rm = e1rm;
    }
  });

  const muscleVolumeW1: Record<MuscleGroup, number> = { Chest: 0, Back: 0, Shoulders: 0, Biceps: 0, Triceps: 0, Legs: 0 };
  const muscleVolumeW4: Record<MuscleGroup, number> = { Chest: 0, Back: 0, Shoulders: 0, Biceps: 0, Triceps: 0, Legs: 0 };
  let totalVolumeW1 = 0;
  let totalVolumeW4 = 0;

  const muscleStrengthChanges: Record<MuscleGroup, { totalWeightedChange: number; totalWeight: number }> = {
    Chest: { totalWeightedChange: 0, totalWeight: 0 },
    Back: { totalWeightedChange: 0, totalWeight: 0 },
    Shoulders: { totalWeightedChange: 0, totalWeight: 0 },
    Biceps: { totalWeightedChange: 0, totalWeight: 0 },
    Triceps: { totalWeightedChange: 0, totalWeight: 0 },
    Legs: { totalWeightedChange: 0, totalWeight: 0 },
  };

  exerciseComparison.forEach((data) => {
    muscleVolumeW1[data.muscle] += data.baseVol;
    muscleVolumeW4[data.muscle] += data.recentVol;
    totalVolumeW1 += data.baseVol;
    totalVolumeW4 += data.recentVol;

    if (data.baseE1rm > 0 && data.recentE1rm > 0) {
      const exChange = ((data.recentE1rm - data.baseE1rm) / data.baseE1rm) * 100;
      const weight = data.recentSets + data.baseSets;

      muscleStrengthChanges[data.muscle].totalWeightedChange += exChange * weight;
      muscleStrengthChanges[data.muscle].totalWeight += weight;
    }
  });

  const overallVolumeChange = totalVolumeW1 > 0 
    ? Math.round(((totalVolumeW4 - totalVolumeW1) / totalVolumeW1) * 1000) / 10 
    : 0;

  const muscleGroupSummaries = {} as Record<MuscleGroup, MuscleGroupSummary>;
  let overallWeightedStrengthChange = 0;
  let overallStrengthWeight = 0;

  MUSCLE_GROUPS.forEach(group => {
    const mData = muscleStrengthChanges[group];
    const strengthChange = mData.totalWeight > 0 
      ? Math.round((mData.totalWeightedChange / mData.totalWeight) * 10) / 10 
      : 0;

    const v1 = muscleVolumeW1[group];
    const v4 = muscleVolumeW4[group];
    const volumeChange = v1 > 0 
      ? Math.round(((v4 - v1) / v1) * 1000) / 10 
      : (v4 > 0 ? 100 : 0);

    muscleGroupSummaries[group] = {
      strengthChange,
      volumeChange,
      currentVolume: v4,
      baselineVolume: v1,
    };

    // Aggregate ONLY compound lift groups into the overall strength headline score
    if (mData.totalWeight > 0 && group !== "Biceps" && group !== "Triceps") {
      overallWeightedStrengthChange += mData.totalWeightedChange;
      overallStrengthWeight += mData.totalWeight;
    }
  });

  const overallStrengthChange = overallStrengthWeight > 0 
    ? Math.round((overallWeightedStrengthChange / overallStrengthWeight) * 10) / 10 
    : 0;

  return {
    overallStrengthChange,
    overallVolumeChange,
    muscleGroups: muscleGroupSummaries,
    weeklyTrend: [],
  };
}