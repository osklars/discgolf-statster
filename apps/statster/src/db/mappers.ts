import type { Grid2DParam, NamedParam, Param, ParamValue, ScalarParam } from '../components/EntryForm/types';
import type { FormDefinition } from '../components/EntryForm/types';
import type { NamedOption, NamedParameter, ScalarParameter } from './types';
import {
  getAllNamedOptions,
  getNamedParameters,
  getScalarParameters,
  upsertNamedOption,
  upsertNamedParameter,
  upsertScalarParameter,
} from './parameters';
import { getForms, getFormGrid2Ds, getFormParams, saveFormLayout, upsertForm } from './forms';
import type { InsertNamedInput, InsertScalarInput } from './datapoints';

const GRID2D_SEP = '·';

// ─── DB → EntryForm type conversions ─────────────────────────────────────────

function dbToScalarParam(s: ScalarParameter): ScalarParam {
  return {
    id: s.id, name: s.name, type: 'scalar',
    min: s.min, max: s.max, step: s.step, majorStep: s.majorStep,
    unit: s.unit ?? undefined, lblMin: s.lblMin, lblMax: s.lblMax,
  };
}

function dbToNamedParam(n: NamedParameter, options: NamedOption[]): NamedParam {
  return {
    id: n.id, name: n.name, type: 'named',
    options: options
      .filter((o) => o.archivedAt === null)
      .map((o) => ({ id: o.id, label: o.label })),
  };
}

// ─── Load all form definitions from DB ───────────────────────────────────────

export async function loadFormDefinitions(): Promise<{
  forms: FormDefinition[];
  paramLibrary: (ScalarParam | NamedParam)[];
}> {
  const [allScalars, allNamed, allOptions, dbForms] = await Promise.all([
    getScalarParameters(),
    getNamedParameters(),
    getAllNamedOptions(),
    getForms(),
  ]);

  const scalarMap = new Map(allScalars.map((s) => [s.id, s]));
  const namedMap = new Map(allNamed.map((n) => [n.id, n]));

  const optionsByParam = new Map<string, NamedOption[]>();
  for (const opt of allOptions) {
    const list = optionsByParam.get(opt.parameterId) ?? [];
    list.push(opt);
    optionsByParam.set(opt.parameterId, list);
  }

  const paramLibrary: (ScalarParam | NamedParam)[] = [
    ...allScalars.map(dbToScalarParam),
    ...allNamed.map((n) => dbToNamedParam(n, optionsByParam.get(n.id) ?? [])),
  ];

  const forms: FormDefinition[] = [];

  for (const dbForm of dbForms) {
    const [formParams, grid2ds] = await Promise.all([
      getFormParams(dbForm.id),
      getFormGrid2Ds(dbForm.id),
    ]);

    const ordered: { sortOrder: number; param: Param }[] = [];

    for (const fp of formParams) {
      if (fp.paramType === 'scalar') {
        const s = scalarMap.get(fp.paramId);
        if (s) ordered.push({ sortOrder: fp.sortOrder, param: { ...dbToScalarParam(s), clearAfterSubmit: fp.clearAfterSubmit } });
      } else {
        const n = namedMap.get(fp.paramId);
        if (n) ordered.push({
          sortOrder: fp.sortOrder,
          param: { ...dbToNamedParam(n, optionsByParam.get(n.id) ?? []), clearAfterSubmit: fp.clearAfterSubmit },
        });
      }
    }

    for (const g of grid2ds) {
      const axisX = scalarMap.get(g.axisXId);
      const axisY = scalarMap.get(g.axisYId);
      if (axisX && axisY) {
        ordered.push({
          sortOrder: g.sortOrder,
          param: {
            id: g.id, name: g.name, type: 'grid2d',
            axisX: dbToScalarParam(axisX),
            axisY: dbToScalarParam(axisY),
            clearAfterSubmit: g.clearAfterSubmit,
          } as Grid2DParam,
        });
      }
    }

    ordered.sort((a, b) => a.sortOrder - b.sortOrder);
    forms.push({ id: dbForm.id, name: dbForm.name, params: ordered.map((o) => o.param) });
  }

  return { forms, paramLibrary };
}

// ─── Save a param to DB ───────────────────────────────────────────────────────

export async function saveParamToDb(param: Param): Promise<void> {
  if (param.type === 'scalar') {
    await upsertScalarParameter({
      id: param.id, name: param.name,
      min: param.min, max: param.max, step: param.step, majorStep: param.majorStep,
      unit: param.unit ?? null, lblMin: param.lblMin, lblMax: param.lblMax,
    });
  } else if (param.type === 'named') {
    await upsertNamedParameter({ id: param.id, name: param.name });
    for (let i = 0; i < param.options.length; i++) {
      await upsertNamedOption({
        id: param.options[i].id,
        parameterId: param.id,
        label: param.options[i].label,
        sortOrder: i,
      });
    }
  } else {
    await saveParamToDb(param.axisX);
    await saveParamToDb(param.axisY);
  }
}

// ─── Save a full form definition to DB ───────────────────────────────────────

export async function saveFormDefinitionToDb(formDef: FormDefinition): Promise<void> {
  for (const param of formDef.params) {
    await saveParamToDb(param);
  }
  await upsertForm({ id: formDef.id, name: formDef.name, sortOrder: 0 });
  await saveFormLayout(
    formDef.id,
    formDef.params.map((p, i) => {
      if (p.type === 'scalar') return { type: 'scalar' as const, paramId: p.id, sortOrder: i };
      if (p.type === 'named') return { type: 'named' as const, paramId: p.id, sortOrder: i };
      return { type: 'grid2d' as const, id: p.id, name: p.name, axisXId: p.axisX.id, axisYId: p.axisY.id, sortOrder: i };
    }),
  );
}

// ─── Convert form values to datapoint inputs ──────────────────────────────────

export function formValuesToDatapoints(
  values: Record<string, ParamValue>,
  params: Param[],
): { scalars: InsertScalarInput[]; named: InsertNamedInput[] } {
  const scalars: InsertScalarInput[] = [];
  const named: InsertNamedInput[] = [];

  for (const param of params) {
    const val = values[param.id];
    if (val === undefined || val === '') continue;

    if (param.type === 'scalar') {
      const n = parseFloat(val);
      if (!isNaN(n)) scalars.push({ parameterId: param.id, value: n });
    } else if (param.type === 'named') {
      named.push({ parameterId: param.id, optionId: val });
    } else {
      const parts = val.split(GRID2D_SEP);
      if (parts.length === 2) {
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        if (!isNaN(x)) scalars.push({ parameterId: param.axisX.id, value: x });
        if (!isNaN(y)) scalars.push({ parameterId: param.axisY.id, value: y });
      }
    }
  }

  return { scalars, named };
}
