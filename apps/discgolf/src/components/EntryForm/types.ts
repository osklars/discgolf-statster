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
  displayFormat?: string;
};

export type NamedParam = {
  id: string;
  name: string;
  type: 'named';
  options: { id: string; label: string }[];
};

export type Param = ScalarParam | NamedParam;

// always a string: scalar → "85", named/disc → optionId
export type ParamValue = string;

export type EntryFormState = {
  expandedIds: Set<string>;
  values: Record<string, ParamValue>;
  params: Param[];
};
