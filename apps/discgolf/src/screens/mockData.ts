export type Entry = {
  id: string;
  formName: string;
  values: Record<string, string>;
  timestamp: number;
};

export type Session = {
  id: string;
  date: string;
  courseName: string;
  entries: Entry[];
};

export type StatLevel = {
  name: string;
  level: number;
  progress: number;
  recentLevelUp: string | null;
};

export const MOCK_SESSIONS: Session[] = [
  {
    id: 's1',
    date: '2026-04-17',
    courseName: 'Järvafältet',
    entries: [
      {
        id: 'e1',
        formName: 'Practice round',
        values: { disc: 'Destroyer', hand: 'Backhand', exec: '8', throw_dist: '120' },
        timestamp: 1713340000,
      },
      {
        id: 'e2',
        formName: 'Practice round',
        values: { disc: 'Luna', hand: 'Forehand', exec: '6', throw_dist: '85' },
        timestamp: 1713340060,
      },
      {
        id: 'e3',
        formName: 'Practice round',
        values: { disc: 'Buzzz', hand: 'Backhand', exec: '9', throw_dist: '145' },
        timestamp: 1713340120,
      },
      {
        id: 'e4',
        formName: 'Practice round',
        values: { disc: 'Destroyer', hand: 'Backhand', exec: '5', throw_dist: '110' },
        timestamp: 1713340180,
      },
      {
        id: 'e5',
        formName: 'Practice round',
        values: { disc: 'Roc3', hand: 'Backhand', exec: '7', throw_dist: '70' },
        timestamp: 1713340240,
      },
    ],
  },
  {
    id: 's2',
    date: '2026-04-14',
    courseName: 'Hellasgården',
    entries: [
      {
        id: 'e6',
        formName: 'Practice round',
        values: { disc: 'Wraith', hand: 'Backhand', exec: '7', throw_dist: '155' },
        timestamp: 1713080000,
      },
      {
        id: 'e7',
        formName: 'Practice round',
        values: { disc: 'Aviar', hand: 'Backhand', exec: '8', throw_dist: '40' },
        timestamp: 1713080060,
      },
    ],
  },
  {
    id: 's3',
    date: '2026-04-10',
    courseName: 'Järvafältet',
    entries: [
      {
        id: 'e8',
        formName: 'Practice round',
        values: { disc: 'Destroyer', hand: 'Backhand', exec: '9', throw_dist: '160' },
        timestamp: 1712736000,
      },
    ],
  },
];

export const MOCK_STATS: StatLevel[] = [
  { name: 'Overall', level: 42, progress: 0.55, recentLevelUp: '2026-04-15' },
  { name: 'Distance', level: 12, progress: 0.7, recentLevelUp: '2026-04-10' },
  { name: 'Execution', level: 8, progress: 0.3, recentLevelUp: null },
  { name: 'Consistency', level: 5, progress: 0.9, recentLevelUp: '2026-04-15' },
  { name: 'Form', level: 3, progress: 0.4, recentLevelUp: null },
];
