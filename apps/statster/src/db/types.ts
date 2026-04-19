export type ScalarParameter = {
  id: string;
  name: string;
  min: number;
  max: number;
  step: number;
  majorStep: number;
  unit: string | null;
  lblMin: string;
  lblMax: string;
  createdAt: string;
};

export type NamedParameter = {
  id: string;
  name: string;
  createdAt: string;
};

export type NamedOption = {
  id: string;
  parameterId: string;
  label: string;
  sortOrder: number;
  archivedAt: string | null;
};

export type Form = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
};

export type FormParam = {
  formId: string;
  paramId: string;
  paramType: 'scalar' | 'named';
  sortOrder: number;
  clearAfterSubmit: boolean;
};

export type FormGrid2D = {
  id: string;
  formId: string;
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
};

export type SessionSummary = {
  id: string;
  startedAt: string;
  entryCount: number;
};

export type Entry = {
  id: string;
  sessionId: string;
  formId: string;
  entryNumber: number;
  loggedAt: string;
};

export type ScalarDatapoint = {
  id: string;
  entryId: string;
  parameterId: string;
  value: number;
};

export type NamedDatapoint = {
  id: string;
  entryId: string;
  parameterId: string;
  optionId: string;
};

export type DatapointsForEntry = {
  scalars: ScalarDatapoint[];
  named: NamedDatapoint[];
};

export type ScalarFilter = {
  parameterId: string;
  min?: number;
  max?: number;
};

export type NamedFilter = {
  parameterId: string;
  optionIds: string[];
};

export type EntryQueryFilters = {
  scalarFilters?: ScalarFilter[];
  namedFilters?: NamedFilter[];
  sessionId?: string;
};
