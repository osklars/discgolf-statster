import type { SavedLevelFilter } from '../db/savedLevels';

export type { SavedLevelFilter };

export type RootStackParamList = {
  Home: undefined;
  StatDetail: { filters?: SavedLevelFilter[] } | undefined;
  SavedLevels: undefined;
  UnifiedSession: { sessionId?: string } | undefined;
  Forms: undefined;
  FormEditor: { formId: string; isNew?: boolean; sortOrder?: number };
  ParamEditor: { paramType: 'scalar' | 'named'; paramId?: string; addToFormId?: string; initialName?: string };
};
