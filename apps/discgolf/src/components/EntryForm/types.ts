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
};

export type NamedParam = {
  id: string;
  name: string;
  type: 'named';
  options: { id: string; label: string }[];
};

export type DiscParam = {
  id: string;
  name: string;
  type: 'disc';
  discs: { id: string; label: string; subLabel: string }[];
};

export type Grid2DParam = {
  id: string;
  name: string;
  type: 'grid2d';
  axisX: ScalarParam;
  axisY: ScalarParam;
};

export type Param = ScalarParam | NamedParam | DiscParam | Grid2DParam;

// always a string: scalar → "85", named/disc → optionId, grid2d → "85·3"
export type ParamValue = string;

export type EntryFormState = {
  activeTab: 'before' | 'after';
  expandedIds: Set<string>;
  values: Record<string, ParamValue>;
  beforeParams: Param[];
  afterParams: Param[];
};
