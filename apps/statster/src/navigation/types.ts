import type { LevelFilter } from '../db/levels';

export type { LevelFilter };

export type RootStackParamList = {
  Home: undefined;
  StatDetail: { filters?: LevelFilter[] } | undefined;
  Levels: undefined;
  UnifiedSession: { sessionId?: string } | undefined;
  Exercises: undefined;
  ExerciseEditor: { exerciseId: string; isNew?: boolean; sortOrder?: number };
  StatEditor: { statType: 'scalar' | 'named'; statId?: string; addToExerciseId?: string; initialName?: string };
};
