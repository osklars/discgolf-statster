export type NumberStatDef = {
  id: string;
  name: string;
  type: 'scalar';
  min: number;
  max: number;
  step: number;
  majorStep: number;
  unit?: string;
  lblMin: string;
  lblMax: string;
  clearAfterSubmit?: boolean;
};

export type ChoiceStatDef = {
  id: string;
  name: string;
  type: 'named';
  options: { id: string; label: string }[];
  clearAfterSubmit?: boolean;
};

export type Grid2DStatDef = {
  id: string;
  name: string;
  type: 'grid2d';
  axisX: NumberStatDef;
  axisY: NumberStatDef;
  clearAfterSubmit?: boolean;
};

export type StatDef = NumberStatDef | ChoiceStatDef | Grid2DStatDef;

// always a string: scalar → "85", named → optionId, grid2d → "85·3"
export type StatValue = string;

export type EntryFormState = {
  expandedIds: Set<string>;
  values: Record<string, StatValue>;
  stats: StatDef[];
};

export type ExerciseDef = {
  id: string;
  name: string;
  params: StatDef[];
};
