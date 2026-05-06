import type { Grid2DStatDef, ChoiceStatDef, StatDef, StatValue, NumberStatDef } from '../components/EntryForm/types';
import type { ExerciseDef } from '../components/EntryForm/types';
import type { ChoiceOption, ChoiceStat, NumberStat } from './types';
import {
  getAllChoiceOptions,
  getChoiceStats,
  getNumberStats,
  upsertChoiceOption,
  upsertChoiceStat,
  upsertNumberStat,
} from './parameters';
import { getExercises, getExerciseGrid2Ds, getExerciseStats, saveExerciseLayout, upsertExercise } from './forms';
import type { InsertNumberInput, InsertChoiceInput } from './datapoints';

const GRID2D_SEP = '·';

// ─── DB → EntryForm type conversions ─────────────────────────────────────────

function dbToNumberStatDef(s: NumberStat): NumberStatDef {
  return {
    id: s.id, name: s.name, type: 'scalar',
    min: s.min, max: s.max, step: s.step, majorStep: s.majorStep,
    unit: s.unit ?? undefined, lblMin: s.lblMin, lblMax: s.lblMax,
  };
}

function dbToChoiceStatDef(n: ChoiceStat, options: ChoiceOption[]): ChoiceStatDef {
  return {
    id: n.id, name: n.name, type: 'named',
    options: options
      .filter((o) => o.archivedAt === null)
      .map((o) => ({ id: o.id, label: o.label })),
  };
}

// ─── Load all exercise definitions from DB ────────────────────────────────────

export async function loadExerciseDefs(): Promise<{
  exercises: ExerciseDef[];
  statLibrary: (NumberStatDef | ChoiceStatDef)[];
}> {
  const [allScalars, allNamed, allOptions, dbExercises] = await Promise.all([
    getNumberStats(),
    getChoiceStats(),
    getAllChoiceOptions(),
    getExercises(),
  ]);

  const scalarMap = new Map(allScalars.map((s) => [s.id, s]));
  const namedMap = new Map(allNamed.map((n) => [n.id, n]));

  const optionsByStat = new Map<string, ChoiceOption[]>();
  for (const opt of allOptions) {
    const list = optionsByStat.get(opt.statId) ?? [];
    list.push(opt);
    optionsByStat.set(opt.statId, list);
  }

  const statLibrary: (NumberStatDef | ChoiceStatDef)[] = [
    ...allScalars.map(dbToNumberStatDef),
    ...allNamed.map((n) => dbToChoiceStatDef(n, optionsByStat.get(n.id) ?? [])),
  ];

  const exercises: ExerciseDef[] = [];

  for (const dbExercise of dbExercises) {
    const [slots, grid2ds] = await Promise.all([
      getExerciseStats(dbExercise.id),
      getExerciseGrid2Ds(dbExercise.id),
    ]);

    const ordered: { sortOrder: number; param: StatDef }[] = [];

    for (const slot of slots) {
      if (slot.statType === 'scalar') {
        const s = scalarMap.get(slot.statId);
        if (s) ordered.push({ sortOrder: slot.sortOrder, param: { ...dbToNumberStatDef(s), clearAfterSubmit: slot.clearAfterSubmit } });
      } else {
        const n = namedMap.get(slot.statId);
        if (n) ordered.push({
          sortOrder: slot.sortOrder,
          param: { ...dbToChoiceStatDef(n, optionsByStat.get(n.id) ?? []), clearAfterSubmit: slot.clearAfterSubmit },
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
            axisX: dbToNumberStatDef(axisX),
            axisY: dbToNumberStatDef(axisY),
            clearAfterSubmit: g.clearAfterSubmit,
          } as Grid2DStatDef,
        });
      }
    }

    ordered.sort((a, b) => a.sortOrder - b.sortOrder);
    exercises.push({ id: dbExercise.id, name: dbExercise.name, params: ordered.map((o) => o.param) });
  }

  return { exercises, statLibrary };
}

// ─── Save a stat to DB ────────────────────────────────────────────────────────

export async function saveStatToDb(stat: StatDef): Promise<void> {
  if (stat.type === 'scalar') {
    await upsertNumberStat({
      id: stat.id, name: stat.name,
      min: stat.min, max: stat.max, step: stat.step, majorStep: stat.majorStep,
      unit: stat.unit ?? null, lblMin: stat.lblMin, lblMax: stat.lblMax,
      target: null,
    });
  } else if (stat.type === 'named') {
    await upsertChoiceStat({ id: stat.id, name: stat.name });
    for (let i = 0; i < stat.options.length; i++) {
      await upsertChoiceOption({
        id: stat.options[i].id,
        statId: stat.id,
        label: stat.options[i].label,
        sortOrder: i,
      });
    }
  } else {
    await saveStatToDb(stat.axisX);
    await saveStatToDb(stat.axisY);
  }
}

// ─── Save a full exercise definition to DB ────────────────────────────────────

export async function saveExerciseDefToDb(exerciseDef: ExerciseDef): Promise<void> {
  for (const stat of exerciseDef.params) {
    await saveStatToDb(stat);
  }
  await upsertExercise({ id: exerciseDef.id, name: exerciseDef.name, sortOrder: 0 });
  await saveExerciseLayout(
    exerciseDef.id,
    exerciseDef.params.map((p, i) => {
      const cas = p.clearAfterSubmit;
      if (p.type === 'scalar') return { type: 'scalar' as const, statId: p.id, sortOrder: i, clearAfterSubmit: cas };
      if (p.type === 'named') return { type: 'named' as const, statId: p.id, sortOrder: i, clearAfterSubmit: cas };
      return { type: 'grid2d' as const, id: p.id, name: p.name, axisXId: p.axisX.id, axisYId: p.axisY.id, sortOrder: i, clearAfterSubmit: cas };
    }),
  );
}

// ─── Convert exercise values to datapoint inputs ──────────────────────────────

export function exerciseValuesToDatapoints(
  values: Record<string, StatValue>,
  stats: StatDef[],
): { scalars: InsertNumberInput[]; named: InsertChoiceInput[] } {
  const scalars: InsertNumberInput[] = [];
  const named: InsertChoiceInput[] = [];

  for (const stat of stats) {
    const val = values[stat.id];
    if (val === undefined || val === '') continue;

    if (stat.type === 'scalar') {
      const n = parseFloat(val);
      if (!isNaN(n)) scalars.push({ statId: stat.id, value: n });
    } else if (stat.type === 'named') {
      named.push({ statId: stat.id, optionId: val });
    } else {
      const parts = val.split(GRID2D_SEP);
      if (parts.length === 2) {
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        if (!isNaN(x)) scalars.push({ statId: stat.axisX.id, value: x });
        if (!isNaN(y)) scalars.push({ statId: stat.axisY.id, value: y });
      }
    }
  }

  return { scalars, named };
}
