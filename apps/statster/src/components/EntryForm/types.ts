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

export type Param = ScalarParam | NamedParam | Grid2DParam;

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
