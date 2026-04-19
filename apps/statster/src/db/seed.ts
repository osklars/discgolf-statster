import { upsertNamedOption, upsertNamedParameter, upsertScalarParameter } from './parameters';
import { getForms, upsertForm, saveFormLayout } from './forms';
import { getSkillDb } from './skillDb';
import { SKILL_DB_SCHEMA } from './schema';

const SEED_VERSION = 3;

const WIPE_DATA_SQL = `
  DROP TABLE IF EXISTS named_datapoint;
  DROP TABLE IF EXISTS scalar_datapoint;
  DROP TABLE IF EXISTS entry;
  DROP TABLE IF EXISTS session;
  DROP TABLE IF EXISTS form_param;
  DROP TABLE IF EXISTS form_grid2d;
  DROP TABLE IF EXISTS form;
  DROP TABLE IF EXISTS named_option;
  DROP TABLE IF EXISTS named_parameter;
  DROP TABLE IF EXISTS scalar_parameter;
`;

export async function seedIfEmpty(): Promise<void> {
  const db = getSkillDb();

  let storedVersion = 0;
  try {
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM seed_meta WHERE key = 'seed_version'",
    );
    storedVersion = row ? parseInt(row.value, 10) : 0;
  } catch {
    storedVersion = 0;
  }

  if (storedVersion === SEED_VERSION) return;

  await db.execAsync(WIPE_DATA_SQL);
  await db.execAsync(SKILL_DB_SCHEMA);
  await seedDiscGolf();
  await db.runAsync(
    "INSERT OR REPLACE INTO seed_meta (key, value) VALUES ('seed_version', ?)",
    [String(SEED_VERSION)],
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type NE = { type: 'named'; paramId: string; sortOrder: number; clearAfterSubmit?: boolean };
type SE = { type: 'scalar'; paramId: string; sortOrder: number; clearAfterSubmit?: boolean };
type LayoutRow = NE | SE;

function n(paramId: string, sortOrder: number, clearAfterSubmit = true): NE {
  return { type: 'named', paramId, sortOrder, clearAfterSubmit };
}
function s(paramId: string, sortOrder: number, clearAfterSubmit = true): SE {
  return { type: 'scalar', paramId, sortOrder, clearAfterSubmit };
}

// ── Seed data ─────────────────────────────────────────────────────────────────

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
    { id: 'ss_straight', label: 'Straight'    },
    { id: 'ss_hyzer',    label: 'Hyzer'       },
    { id: 'ss_ani',      label: 'Anhyzer'     },
    { id: 'ss_flex',     label: 'Flex'        },
    { id: 'ss_spike',    label: 'Spike hyzer' },
    { id: 'ss_grenade',  label: 'Grenade'     },
    { id: 'ss_tomahawk', label: 'Tomahawk'    },
    { id: 'ss_roller',   label: 'Roller'      },
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
    { id: 'lie_tee',  label: 'Tee'      },
    { id: 'lie_fair', label: 'Fairway'  },
    { id: 'lie_scr',  label: 'Scramble' },
    { id: 'lie_app',  label: 'Approach' },
    { id: 'lie_putt', label: 'Putt'     },
  ];
  for (let i = 0; i < lies.length; i++) {
    await upsertNamedOption({ id: lies[i].id, parameterId: 'lie', label: lies[i].label, sortOrder: i });
  }

  // ── Scalar parameters ───────────────────────────────────────────────────────

  await upsertScalarParameter({ id: 'diff',        name: 'Difficulty',      min: 1, max: 10,  step: 1, majorStep: 1,  lblMin: 'easy',  lblMax: 'hard',  unit: null });
  await upsertScalarParameter({ id: 'grade',       name: 'Grade',           min: 1, max: 10,  step: 1, majorStep: 1,  lblMin: 'shank', lblMax: 'pure',  unit: null });
  await upsertScalarParameter({ id: 'target_dist', name: 'Target distance', min: 0, max: 200, step: 5, majorStep: 50, lblMin: '0m',    lblMax: '200m',  unit: 'm'  });
  await upsertScalarParameter({ id: 'distance',    name: 'Distance',        min: 0, max: 200, step: 5, majorStep: 50, lblMin: '0m',    lblMax: '200m',  unit: 'm'  });

  // ── Forms ───────────────────────────────────────────────────────────────────
  // clearAfterSubmit defaults to true; pass false for "sticky" params (disc, hand, throw type)

  await upsertForm({ id: 'throw', name: 'Throw', sortOrder: 0 });
  await saveFormLayout('throw', [
    n('disc',          0,  false),
    n('hand',          1,  false),
    n('shot_shape',    2),
    s('target_dist',   3),
    s('diff',          4),
    s('grade',         5),
    s('distance',      6),
    n('release_angle', 7),
    n('line',          8),
    n('flip',          9),
    n('height',        10),
    n('throw_type',    11, false),
  ] satisfies LayoutRow[]);

  await upsertForm({ id: 'throw_slim', name: 'Throw slim', sortOrder: 1 });
  await saveFormLayout('throw_slim', [
    n('disc',       0, false),
    n('hand',       1, false),
    s('grade',      2),
    n('throw_type', 3, false),
  ] satisfies LayoutRow[]);

  await upsertForm({ id: 'putt', name: 'Putt', sortOrder: 2 });
  await saveFormLayout('putt', [
    n('disc',       0, false),
    n('hand',       1, false),
    n('throw_type', 2, false),
  ] satisfies LayoutRow[]);
}
