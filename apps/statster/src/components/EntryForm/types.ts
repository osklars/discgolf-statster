export type ScalarParam = {
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

export type NamedParam = {
  id: string;
  name: string;
  type: 'named';
  options: { id: string; label: string }[];
  clearAfterSubmit?: boolean;
};

export type Grid2DParam = {
  id: string;
  name: string;
  type: 'grid2d';
  axisX: ScalarParam;
  axisY: ScalarParam;
  clearAfterSubmit?: boolean;
};

// Quality: scalar with an ideal target value — used for XP and proficiency scoring.
export type QualityParam = {
  id: string;
  name: string;
  type: 'quality';
  min: number;
  max: number;
  step: number;
  majorStep: number;
  unit?: string;
  lblMin: string;
  lblMax: string;
  target: number;
  clearAfterSubmit?: boolean;
};

export type Param = ScalarParam | NamedParam | Grid2DParam | QualityParam;

// always a string: scalar → "85", named/disc → optionId, grid2d → "85·3"
export type ParamValue = string;

export type EntryFormState = {
  expandedIds: Set<string>;
  values: Record<string, ParamValue>;
  params: Param[];
};

export type FormDefinition = {
  id: string;
  name: string;
  params: Param[];
};
