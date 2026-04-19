export type RootStackParamList = {
  Home: undefined;
  StatDetail: undefined;
  Session: { sessionId: string };
  SessionForm: { sessionId?: string } | undefined;
};
