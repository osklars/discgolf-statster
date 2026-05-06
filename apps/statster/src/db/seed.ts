import { upsertChoiceOption, upsertChoiceStat, upsertNumberStat } from './parameters';
import { upsertExercise, saveExerciseLayout } from './forms';
import { getInterestDb } from './interestDb';
import { INTEREST_DB_SCHEMA } from './schema';

// Bump this any time you want the app to wipe and re-seed on next launch.
const SEED_VERSION = 5;

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
  DROP TABLE IF EXISTS saved_level;
`;

export async function seedIfEmpty(): Promise<void> {
  const db = getInterestDb();

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
  await db.execAsync(INTEREST_DB_SCHEMA);
  await seedDiscGolf();
  await db.runAsync(
    "INSERT OR REPLACE INTO seed_meta (key, value) VALUES ('seed_version', ?)",
    [String(SEED_VERSION)],
  );
}

// ── Layout entry helpers ──────────────────────────────────────────────────────

type NE = { type: 'named'; statId: string; sortOrder: number; clearAfterSubmit?: boolean };
type SE = { type: 'scalar'; statId: string; sortOrder: number; clearAfterSubmit?: boolean };
type LayoutRow = NE | SE;

function n(statId: string, sortOrder: number, clearAfterSubmit = true): NE {
  return { type: 'named', statId, sortOrder, clearAfterSubmit };
}
function s(statId: string, sortOrder: number, clearAfterSubmit = true): SE {
  return { type: 'scalar', statId, sortOrder, clearAfterSubmit };
}

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seedDiscGolf(): Promise<void> {
  // ── Choice stats ────────────────────────────────────────────────────────────

  await upsertChoiceStat({ id: 'disc', name: 'Disc' });
  const discs = [
    { id: 'd_destroyer', label: 'Destroyer' },
    { id: 'd_wraith',    label: 'Wraith'     },
    { id: 'd_buzzz',     label: 'Buzzz'      },
    { id: 'd_roc3',      label: 'Roc3'       },
    { id: 'd_luna',      label: 'Luna'       },
    { id: 'd_aviar',     label: 'Aviar'      },
  ];
  for (let i = 0; i < discs.length; i++) {
    await upsertChoiceOption({ id: discs[i].id, statId: 'disc', label: discs[i].label, sortOrder: i });
  }

  await upsertChoiceStat({ id: 'hand', name: 'Hand' });
  await upsertChoiceOption({ id: 'hand_bh', statId: 'hand', label: 'Backhand', sortOrder: 0 });
  await upsertChoiceOption({ id: 'hand_fh', statId: 'hand', label: 'Forehand', sortOrder: 1 });

  await upsertChoiceStat({ id: 'shot_shape', name: 'Shot shape' });
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
    await upsertChoiceOption({ id: shapes[i].id, statId: 'shot_shape', label: shapes[i].label, sortOrder: i });
  }

  await upsertChoiceStat({ id: 'throw_type', name: 'Throw type' });
  await upsertChoiceOption({ id: 'tt_real',     statId: 'throw_type', label: 'Real',     sortOrder: 0 });
  await upsertChoiceOption({ id: 'tt_practice', statId: 'throw_type', label: 'Practice', sortOrder: 1 });
  await upsertChoiceOption({ id: 'tt_mulligan', statId: 'throw_type', label: 'Mulligan', sortOrder: 2 });

  await upsertChoiceStat({ id: 'putt_shape', name: 'Putt shape' });
  const puttShapes = [
    { id: 'ps_straight', label: 'Straight' },
    { id: 'ps_uphill',   label: 'Uphill'   },
    { id: 'ps_downhill', label: 'Downhill' },
    { id: 'ps_hyzer',    label: 'Hyzer'    },
    { id: 'ps_ani',      label: 'Anhyzer'  },
    { id: 'ps_lofty',    label: 'Lofty'    },
    { id: 'ps_turbo',    label: 'Turbo'    },
  ];
  for (let i = 0; i < puttShapes.length; i++) {
    await upsertChoiceOption({ id: puttShapes[i].id, statId: 'putt_shape', label: puttShapes[i].label, sortOrder: i });
  }

  await upsertChoiceStat({ id: 'putt_stance', name: 'Stance' });
  const stances = [
    { id: 'st_staggered',       label: 'Staggered'       },
    { id: 'st_straddle',        label: 'Straddle'        },
    { id: 'st_jump',            label: 'Jump'            },
    { id: 'st_step',            label: 'Step'            },
    { id: 'st_knee',            label: 'Knee'            },
    { id: 'st_straddle_left',   label: 'Straddle left'   },
    { id: 'st_straddle_right',  label: 'Straddle right'  },
  ];
  for (let i = 0; i < stances.length; i++) {
    await upsertChoiceOption({ id: stances[i].id, statId: 'putt_stance', label: stances[i].label, sortOrder: i });
  }

  await upsertChoiceStat({ id: 'putt_result', name: 'Result' });
  const puttResults = [
    { id: 'pr_make',        label: 'Make'       },
    { id: 'pr_airball',     label: 'Airball'    },
    { id: 'pr_cage',        label: 'Cage'       },
    { id: 'pr_band',        label: 'Band'       },
    { id: 'pr_chain_out',   label: 'Chain-out'  },
    { id: 'pr_spit_out',    label: 'Spit-out'   },
    { id: 'pr_cut_through', label: 'Cut-through'},
  ];
  for (let i = 0; i < puttResults.length; i++) {
    await upsertChoiceOption({ id: puttResults[i].id, statId: 'putt_result', label: puttResults[i].label, sortOrder: i });
  }

  // ── Number stats ────────────────────────────────────────────────────────────

  await upsertNumberStat({ id: 'diff',        name: 'Difficulty',      min: 1,  max: 10,  step: 1,   majorStep: 1,  lblMin: 'easy',  lblMax: 'hard',  unit: null, target: null });
  await upsertNumberStat({ id: 'target_dist', name: 'Target distance', min: 0,  max: 160, step: 5,   majorStep: 50, lblMin: '0m',    lblMax: '160m',  unit: 'm',  target: null });
  await upsertNumberStat({ id: 'distance',    name: 'Distance',        min: 0,  max: 160, step: 5,   majorStep: 50, lblMin: '0m',    lblMax: '160m',  unit: 'm',  target: null });
  await upsertNumberStat({ id: 'putt_dist',   name: 'Distance',        min: 0,  max: 30,  step: 1,   majorStep: 5,  lblMin: '0m',    lblMax: '30m',   unit: 'm',  target: null });

  // ── Quality stats (target = ideal value) ────────────────────────────────────

  await upsertNumberStat({ id: 'grade',          name: 'Grade',          min: 1,  max: 10, step: 1,   majorStep: 1, lblMin: 'shank',      lblMax: 'pure',      unit: null, target: 10 });
  await upsertNumberStat({ id: 'line',           name: 'Line',           min: -2, max: 2,  step: 1,   majorStep: 1, lblMin: 'early',      lblMax: 'pulled',    unit: null, target: 0  });
  await upsertNumberStat({ id: 'height',         name: 'Height',         min: -2, max: 2,  step: 1,   majorStep: 1, lblMin: 'too low',    lblMax: 'too high',  unit: null, target: 0  });
  await upsertNumberStat({ id: 'release_angle',  name: 'Release angle',  min: -2, max: 2,  step: 1,   majorStep: 1, lblMin: 'hyzer',      lblMax: 'anhyzer',   unit: null, target: 0  });
  await upsertNumberStat({ id: 'flip',           name: 'Flip',           min: -2, max: 2,  step: 1,   majorStep: 1, lblMin: 'too stable', lblMax: 'too flippy',unit: null, target: 0  });
  await upsertNumberStat({ id: 'miss',           name: 'Miss',           min: -2, max: 2,  step: 0.5, majorStep: 1, lblMin: 'left',       lblMax: 'right',     unit: 'm',  target: 0  });

  // ── Exercises ────────────────────────────────────────────────────────────────

  await upsertExercise({ id: 'throw_detailed', name: 'Throw detailed', sortOrder: 0 });
  await saveExerciseLayout('throw_detailed', [
    n('disc',         0,  false),
    n('shot_shape',   1),
    n('hand',         2,  false),
    s('target_dist',  3),
    s('diff',         4),
    s('grade',        5),
    s('distance',     6),
    s('line',         7),
    s('height',       8),
    s('release_angle',9),
    s('flip',         10),
    n('throw_type',   11, false),
  ] satisfies LayoutRow[]);

  await upsertExercise({ id: 'throw', name: 'Throw', sortOrder: 1 });
  await saveExerciseLayout('throw', [
    n('disc',       0, false),
    n('shot_shape', 1),
    n('hand',       2, false),
    s('grade',      3),
  ] satisfies LayoutRow[]);

  await upsertExercise({ id: 'putt_detailed', name: 'Putt detailed', sortOrder: 2 });
  await saveExerciseLayout('putt_detailed', [
    s('putt_dist',   0),
    n('putt_shape',  1),
    n('putt_stance', 2),
    s('grade',       3),
    n('putt_result', 4),
    s('miss',        5),
  ] satisfies LayoutRow[]);

  await upsertExercise({ id: 'putt', name: 'Putt', sortOrder: 3 });
  await saveExerciseLayout('putt', [
    s('putt_dist', 0),
    s('grade',     1),
  ] satisfies LayoutRow[]);

  // ── Default levels ───────────────────────────────────────────────────────────

  const db = getInterestDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO saved_level (id, name, filters, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
    ['sl_overall', 'Overall', '[]', 0, now],
  );
}
