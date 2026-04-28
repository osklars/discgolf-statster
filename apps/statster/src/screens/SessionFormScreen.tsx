import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { EntryForm } from '../components/EntryForm';
import type { Param, ParamValue } from '../components/EntryForm/types';
import { Colors } from '../constants/theme';
import { startSession } from '../db/sessions';
import { createEntry, getEntriesForSession } from '../db/entries';
import { insertDatapoints } from '../db/datapoints';
import { formValuesToDatapoints } from '../db/mappers';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionForm'>;

export function SessionFormScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const existingSessionId = route.params?.sessionId;
  const sessionIdRef = useRef<string | null>(null);
  const [entryCount, setEntryCount] = useState(0);

  useEffect(() => {
    if (existingSessionId) {
      sessionIdRef.current = existingSessionId;
      getEntriesForSession(existingSessionId)
        .then((entries) => setEntryCount(entries.length))
        .catch(console.error);
    }
  }, [existingSessionId]);

  const handleLogThrow = useCallback(async (
    formId: string,
    params: Param[],
    values: Record<string, ParamValue>,
  ) => {
    if (!sessionIdRef.current) {
      const session = await startSession();
      sessionIdRef.current = session.id;
    }

    const nextCount = entryCount + 1;
    const entry = await createEntry(sessionIdRef.current, formId, nextCount);
    const { scalars, named } = formValuesToDatapoints(values, params);
    await insertDatapoints(entry.id, scalars, named);
    setEntryCount(nextCount);
  }, [entryCount]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <EntryForm
        onBack={() => navigation.goBack()}
        entryCount={entryCount}
        onLogThrow={handleLogThrow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
