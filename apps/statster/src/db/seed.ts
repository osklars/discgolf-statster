import { upsertNamedOption, upsertNamedParameter, upsertScalarParameter } from './parameters';
import { getForms, upsertForm, saveFormLayout } from './forms';

export async function seedIfEmpty(): Promise<void> {
  const existing = await getForms();
  if (existing.length > 0) return;

  await seedDiscGolf();
}

async function seedDiscGolf(): Promise<void> {
  // ── Named parameters ────────────────────────────────────────────────────────

  await upsertNamedParameter({ id: 'disc', name: 'Disc' });
  const discs = [
    { id: 'd_destroyer', label: 'Destroyer' },
    { id: 'd_wraith',    label: 'Wraith' },
    { id: 'd_buzzz',     label: 'Buzzz' },
    { id: 'd_roc3',      label: 'Roc3' },
    { id: 'd_luna',      label: 'Luna' },
    { id: 'd_aviar',     label: 'Aviar' },
  ];
  for (let i = 0; i < discs.length; i++) {
    await upsertNamedOption({ id: discs[i].id, parameterId: 'disc', label: discs[i].label, sortOrder: i });
  }

  await upsertNamedParameter({ id: 'hand', name: 'Hand' });
  await upsertNamedOption({ id: 'hand_bh', parameterId: 'hand', label: 'Backhand', sortOrder: 0 });
  await upsertNamedOption({ id: 'hand_fh', parameterId: 'hand', label: 'Forehand', sortOrder: 1 });

  await upsertNamedParameter({ id: 'shot_shape', name: 'Shot shape' });
  const shapes = [
    { id: 'ss_straight',   label: 'Straight' },
    { id: 'ss_hyzer',      label: 'Hyzer' },
    { id: 'ss_ani',        label: 'Anhyzer' },
    { id: 'ss_flex',       label: 'Flex' },
    { id: 'ss_spike',      label: 'Spike hyzer' },
    { id: 'ss_grenade',    label: 'Grenade' },
    { id: 'ss_tomahawk',   label: 'Tomahawk' },
    { id: 'ss_roller',     label: 'Roller' },
  ];
  for (let i = 0; i < shapes.length; i++) {
    await upsertNamedOption({ id: shapes[i].id, parameterId: 'shot_shape', label: shapes[i].label, sortOrder: i });
  }

  await upsertNamedParameter({ id: 'release_angle', name: 'Release angle' });
  await upsertNamedOption({ id: 'ra_ani',   parameterId: 'release_angle', label: 'Anhyzer', sortOrder: 0 });
  await upsertNamedOption({ id: 'ra_flat',  parameterId: 'release_angle', label: 'Flat',    sortOrder: 1 });
  await upsertNamedOption({ id: 'ra_hyzer', parameterId: 'release_angle', label: 'Hyzer',   sortOrder: 2 });

  await upsertNamedParameter({ id: 'line', name: 'Line' });
  await upsertNamedOption({ id: 'line_early',  parameterId: 'line', label: 'Early',   sortOrder: 0 });
  await upsertNamedOption({ id: 'line_on',     parameterId: 'line', label: 'On line', sortOrder: 1 });
  await upsertNamedOption({ id: 'line_pulled', parameterId: 'line', label: 'Pulled',  sortOrder: 2 });

  await upsertNamedParameter({ id: 'flip', name: 'Flip' });
  await upsertNamedOption({ id: 'flip_stable', parameterId: 'flip', label: 'Too stable', sortOrder: 0 });
  await upsertNamedOption({ id: 'flip_ok',     parameterId: 'flip', label: 'Good',       sortOrder: 1 });
  await upsertNamedOption({ id: 'flip_flippy', parameterId: 'flip', label: 'Too flippy', sortOrder: 2 });

  await upsertNamedParameter({ id: 'height', name: 'Height' });
  await upsertNamedOption({ id: 'height_low',  parameterId: 'height', label: 'Too low',  sortOrder: 0 });
  await upsertNamedOption({ id: 'height_ok',   parameterId: 'height', label: 'Good',     sortOrder: 1 });
  await upsertNamedOption({ id: 'height_high', parameterId: 'height', label: 'Too high', sortOrder: 2 });

  await upsertNamedParameter({ id: 'throw_type', name: 'Throw type' });
  await upsertNamedOption({ id: 'tt_real',     parameterId: 'throw_type', label: 'Real',     sortOrder: 0 });
  await upsertNamedOption({ id: 'tt_practice', parameterId: 'throw_type', label: 'Practice', sortOrder: 1 });
  await upsertNamedOption({ id: 'tt_mulligan', parameterId: 'throw_type', label: 'Mulligan', sortOrder: 2 });

  await upsertNamedParameter({ id: 'lie', name: 'Lie' });
  const lies = [
    { id: 'lie_tee',  label: 'Tee' },
    { id: 'lie_fair', label: 'Fairway' },
    { id: 'lie_scr',  label: 'Scramble' },
    { id: 'lie_app',  label: 'Approach' },
    { id: 'lie_putt', label: 'Putt' },
  ];
  for (let i = 0; i < lies.length; i++) {
    await upsertNamedOption({ id: lies[i].id, parameterId: 'lie', label: lies[i].label, sortOrder: i });
  }

  // ── Scalar parameters ───────────────────────────────────────────────────────

  await upsertScalarParameter({ id: 'diff',        name: 'Difficulty',       min: 1, max: 10,  step: 1, majorStep: 1,  lblMin: 'easy',  lblMax: 'hard',  unit: null });
  await upsertScalarParameter({ id: 'grade',       name: 'Grade',            min: 1, max: 10,  step: 1, majorStep: 1,  lblMin: 'shank', lblMax: 'pure',  unit: null });
  await upsertScalarParameter({ id: 'target_dist', name: 'Target distance',  min: 0, max: 200, step: 5, majorStep: 50, lblMin: '0m',    lblMax: '200m',  unit: 'm'  });
  await upsertScalarParameter({ id: 'distance',    name: 'Distance',         min: 0, max: 200, step: 5, majorStep: 50, lblMin: '0m',    lblMax: '200m',  unit: 'm'  });

  // ── Forms ───────────────────────────────────────────────────────────────────

  await upsertForm({ id: 'throw', name: 'Throw', sortOrder: 0 });
  await saveFormLayout('throw', [
    { type: 'named',  paramId: 'disc',          sortOrder: 0 },
    { type: 'named',  paramId: 'hand',          sortOrder: 1 },
    { type: 'named',  paramId: 'shot_shape',    sortOrder: 2 },
    { type: 'scalar', paramId: 'target_dist',   sortOrder: 3 },
    { type: 'scalar', paramId: 'diff',          sortOrder: 4 },
    { type: 'scalar', paramId: 'grade',         sortOrder: 5 },
    { type: 'scalar', paramId: 'distance',      sortOrder: 6 },
    { type: 'named',  paramId: 'release_angle', sortOrder: 7 },
    { type: 'named',  paramId: 'line',          sortOrder: 8 },
    { type: 'named',  paramId: 'flip',          sortOrder: 9 },
    { type: 'named',  paramId: 'height',        sortOrder: 10 },
    { type: 'named',  paramId: 'throw_type',    sortOrder: 11 },
  ]);

  await upsertForm({ id: 'throw_mini', name: 'Throw mini', sortOrder: 1 });
  await saveFormLayout('throw_mini', [
    { type: 'named',  paramId: 'disc',       sortOrder: 0 },
    { type: 'named',  paramId: 'hand',       sortOrder: 1 },
    { type: 'scalar', paramId: 'grade',      sortOrder: 2 },
    { type: 'named',  paramId: 'throw_type', sortOrder: 3 },
  ]);

  await upsertForm({ id: 'throw_detailed', name: 'Throw detailed', sortOrder: 2 });
  await saveFormLayout('throw_detailed', [
    { type: 'named',  paramId: 'lie',          sortOrder: 0 },
    { type: 'named',  paramId: 'disc',         sortOrder: 1 },
    { type: 'named',  paramId: 'hand',         sortOrder: 2 },
    { type: 'named',  paramId: 'shot_shape',   sortOrder: 3 },
    { type: 'scalar', paramId: 'target_dist',  sortOrder: 4 },
    { type: 'scalar', paramId: 'diff',         sortOrder: 5 },
    { type: 'scalar', paramId: 'grade',        sortOrder: 6 },
    { type: 'scalar', paramId: 'distance',     sortOrder: 7 },
    { type: 'named',  paramId: 'release_angle',sortOrder: 8 },
    { type: 'named',  paramId: 'line',         sortOrder: 9 },
    { type: 'named',  paramId: 'flip',         sortOrder: 10 },
    { type: 'named',  paramId: 'height',       sortOrder: 11 },
    { type: 'named',  paramId: 'throw_type',   sortOrder: 12 },
  ]);

  await upsertForm({ id: 'putt', name: 'Putt', sortOrder: 3 });
  await saveFormLayout('putt', [
    { type: 'named',  paramId: 'disc',       sortOrder: 0 },
    { type: 'named',  paramId: 'hand',       sortOrder: 1 },
    { type: 'scalar', paramId: 'target_dist',sortOrder: 2 },
    { type: 'scalar', paramId: 'diff',       sortOrder: 3 },
    { type: 'scalar', paramId: 'grade',      sortOrder: 4 },
    { type: 'named',  paramId: 'throw_type', sortOrder: 5 },
  ]);
}
