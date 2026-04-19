import type { SavedLevelFilter } from '../db/savedLevels';

export type { SavedLevelFilter };

export type RootStackParamList = {
  Home: undefined;
  StatDetail: { filters?: SavedLevelFilter[] } | undefined;
  SavedLevels: undefined;
  Session: { sessionId: string };
  SessionForm: { sessionId?: string } | undefined;
};
