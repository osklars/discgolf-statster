export type NumberStat = {
  id: string;
  name: string;
  min: number;
  max: number;
  step: number;
  majorStep: number;
  unit: string | null;
  lblMin: string;
  lblMax: string;
  target: number | null;
  createdAt: string;
};

export type ChoiceStat = {
  id: string;
  name: string;
  createdAt: string;
};

export type ChoiceOption = {
  id: string;
  statId: string;
  label: string;
  sortOrder: number;
  archivedAt: string | null;
};

export type Exercise = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
};

export type ExerciseStatSlot = {
  exerciseId: string;
  statId: string;
  statType: 'scalar' | 'named';
  sortOrder: number;
  clearAfterSubmit: boolean;
};

export type ExerciseGrid2D = {
  id: string;
  exerciseId: string;
  name: string;
  axisXId: string;
  axisYId: string;
  sortOrder: number;
  clearAfterSubmit: boolean;
};

export type Session = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  notes: string | null;
  name: string | null;
};

export type SessionSummary = {
  id: string;
  startedAt: string;
  entryCount: number;
  name: string | null;
};

export type Entry = {
  id: string;
  sessionId: string;
  exerciseId: string;
  entryNumber: number;
  loggedAt: string;
};

export type NumberDatapoint = {
  id: string;
  entryId: string;
  statId: string;
  value: number;
};

export type ChoiceDatapoint = {
  id: string;
  entryId: string;
  statId: string;
  optionId: string;
};

export type DatapointsForEntry = {
  scalars: NumberDatapoint[];
  named: ChoiceDatapoint[];
};

export type NumberFilter = {
  statId: string;
  min?: number;
  max?: number;
};

export type ChoiceFilter = {
  statId: string;
  optionIds: string[];
};

export type EntryQueryFilters = {
  numberFilters?: NumberFilter[];
  choiceFilters?: ChoiceFilter[];
  sessionId?: string;
};
