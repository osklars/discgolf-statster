import { upsertNamedOption, upsertNamedParameter, upsertScalarParameter } from './parameters';
import { getForms, upsertForm, saveFormLayout } from './forms';

export async function seedIfEmpty(): Promise<void> {
  const existing = await getForms();
  if (existing.length > 0) return;

  await seedDiscGolf();
}

async function seedDiscGolf(): Promise<void> {
  // Named parameters
  await upsertNamedParameter({ id: 'disc', name: 'Disc' });
  const discs = [
    { id: 'd1', label: 'Destroyer' }, { id: 'd2', label: 'Buzzz' },
    { id: 'd3', label: 'Luna' },      { id: 'd4', label: 'Roc3' },
    { id: 'd5', label: 'Wraith' },    { id: 'd6', label: 'Aviar' },
  ];
  for (let i = 0; i < discs.length; i++) {
    await upsertNamedOption({ id: discs[i].id, parameterId: 'disc', label: discs[i].label, sortOrder: i });
  }

  await upsertNamedParameter({ id: 'hand', name: 'Hand' });
  await upsertNamedOption({ id: 'bh', parameterId: 'hand', label: 'Backhand', sortOrder: 0 });
  await upsertNamedOption({ id: 'fh', parameterId: 'hand', label: 'Forehand', sortOrder: 1 });

  await upsertNamedParameter({ id: 'lie', name: 'Lie' });
  const lies = [
    { id: 'tee', label: 'Tee' },       { id: 'fair', label: 'Fairway' },
    { id: 'scr', label: 'Scramble' },  { id: 'app', label: 'Approach' },
    { id: 'putt', label: 'Putt' },
  ];
  for (let i = 0; i < lies.length; i++) {
    await upsertNamedOption({ id: lies[i].id, parameterId: 'lie', label: lies[i].label, sortOrder: i });
  }

  // Scalar parameters
  const scalars: Parameters<typeof upsertScalarParameter>[0][] = [
    { id: 'diff',       name: 'Difficulty',      min: 1,  max: 10,  step: 1, majorStep: 1,  lblMin: 'easy',       lblMax: 'hard',    unit: null },
    { id: 'hyzer_i',    name: 'Hyzer (intended)', min: -5, max: 5,   step: 1, majorStep: 1,  lblMin: 'hyzer',      lblMax: 'anhyzer', unit: null },
    { id: 'nose_i',     name: 'Nose (intended)',  min: -5, max: 5,   step: 1, majorStep: 1,  lblMin: 'nose ↓',     lblMax: 'nose ↑',  unit: null },
    { id: 'exec',       name: 'Execution',        min: 1,  max: 10,  step: 1, majorStep: 1,  lblMin: 'shank',      lblMax: 'pured',   unit: null },
    { id: 'throw_dist', name: 'Distance',         min: 0,  max: 200, step: 5, majorStep: 50, lblMin: '0m',         lblMax: '200m',    unit: 'm'  },
    { id: 'height',     name: 'Height',           min: -2, max: 2,   step: 1, majorStep: 1,  lblMin: 'low',        lblMax: 'high',    unit: null },
    { id: 'line',       name: 'Line',             min: -2, max: 2,   step: 1, majorStep: 1,  lblMin: 'early',      lblMax: 'pulled',  unit: null },
    { id: 'form',       name: 'Form',             min: -2, max: 2,   step: 1, majorStep: 1,  lblMin: 'strenuous',  lblMax: 'smooth',  unit: null },
  ];
  for (const s of scalars) {
    await upsertScalarParameter(s);
  }

  // Form
  await upsertForm({ id: 'practice_round', name: 'Practice round', sortOrder: 0 });
  await saveFormLayout('practice_round', [
    { type: 'named',  paramId: 'disc',       sortOrder: 0 },
    { type: 'named',  paramId: 'hand',       sortOrder: 1 },
    { type: 'named',  paramId: 'lie',        sortOrder: 2 },
    { type: 'scalar', paramId: 'diff',       sortOrder: 3 },
    { type: 'scalar', paramId: 'hyzer_i',    sortOrder: 4 },
    { type: 'scalar', paramId: 'nose_i',     sortOrder: 5 },
    { type: 'scalar', paramId: 'exec',       sortOrder: 6 },
    { type: 'scalar', paramId: 'throw_dist', sortOrder: 7 },
    { type: 'scalar', paramId: 'height',     sortOrder: 8 },
    { type: 'scalar', paramId: 'line',       sortOrder: 9 },
    { type: 'scalar', paramId: 'form',       sortOrder: 10 },
  ]);
}
