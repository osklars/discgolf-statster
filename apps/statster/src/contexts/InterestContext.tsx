import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as metaDb from '../db/meta';
import { openInterestDb } from '../db/interestDb';
import { seedIfEmpty } from '../db/seed';
import { Colors, Typography } from '../constants/theme';

export type Interest = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  dbFile: string;
};

type InterestContextValue = {
  interests: Interest[];
  activeInterest: Interest;
  ready: boolean;
  justCreated: boolean;
  switchInterest: (id: string) => Promise<void>;
  addInterest: (interest: Omit<Interest, 'id' | 'dbFile'>) => Promise<void>;
  clearJustCreated: () => void;
};

const InterestContext = createContext<InterestContextValue | null>(null);

export function InterestProvider({ children }: { children: React.ReactNode }) {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [justCreated, setJustCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const allInterests = await metaDb.getAllInterests();

        if (allInterests.length === 0) {
          // First run — no interests yet; show creation screen.
          setReady(true);
          return;
        }

        const savedId = await metaDb.getActiveInterestId();
        const initialId =
          savedId && allInterests.some((i) => i.id === savedId) ? savedId : allInterests[0].id;

        const active = allInterests.find((i) => i.id === initialId) ?? allInterests[0];
        await openInterestDb(active.dbFile);
        await seedIfEmpty();

        setInterests(allInterests);
        setActiveId(initialId);
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }

    init();
  }, []);

  const activeInterest = (interests.find((i) => i.id === activeId) ?? interests[0]) as Interest;

  const switchInterest = useCallback(
    async (id: string) => {
      const interest = interests.find((i) => i.id === id);
      if (!interest) return;
      await openInterestDb(interest.dbFile);
      await seedIfEmpty();
      await metaDb.setActiveInterestId(id);
      setActiveId(id);
    },
    [interests],
  );

  const addInterest = useCallback(async (partial: Omit<Interest, 'id' | 'dbFile'>) => {
    const id = `interest_${Date.now()}`;
    const interest: Interest = { ...partial, id, dbFile: `${id}.db` };
    await metaDb.insertInterest(interest);
    await openInterestDb(interest.dbFile);
    await metaDb.setActiveInterestId(id);
    setInterests((prev) => [...prev, interest]);
    setActiveId(id);
    setJustCreated(true);
  }, []);

  const clearJustCreated = useCallback(() => setJustCreated(false), []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>DB init failed</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <InterestContext.Provider value={{ interests, activeInterest, ready, justCreated, switchInterest, addInterest, clearJustCreated }}>
      {children}
    </InterestContext.Provider>
  );
}

export function useInterest(): InterestContextValue {
  const ctx = useContext(InterestContext);
  if (!ctx) throw new Error('useInterest must be used within InterestProvider');
  return ctx;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  errorTitle: {
    ...Typography.title,
    color: '#c0392b',
    marginBottom: 8,
  },
  errorBody: {
    ...Typography.label,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
