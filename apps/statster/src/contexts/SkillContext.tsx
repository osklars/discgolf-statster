import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as metaDb from '../db/meta';
import { openSkillDb } from '../db/skillDb';
// getSkillDb() is available for other modules once openSkillDb has been called
import { Colors, Typography } from '../constants/theme';

export type Skill = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  dbFile: string;
};

const DEFAULT_SKILLS: Skill[] = [
  { id: 'disc_golf', name: 'Disc Golf', emoji: '🥏', color: '#0C447C', dbFile: 'disc_golf.db' },
];

type SkillContextValue = {
  skills: Skill[];
  activeSkill: Skill;
  ready: boolean;
  switchSkill: (id: string) => Promise<void>;
  addSkill: (skill: Omit<Skill, 'id' | 'dbFile'>) => Promise<void>;
};

const SkillContext = createContext<SkillContextValue | null>(null);

export function SkillProvider({ children }: { children: React.ReactNode }) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        let allSkills = await metaDb.getAllSkills();

        if (allSkills.length === 0) {
          for (const skill of DEFAULT_SKILLS) {
            await metaDb.insertSkill(skill);
          }
          allSkills = DEFAULT_SKILLS;
        }

        const savedId = await metaDb.getActiveSkillId();
        const initialId =
          savedId && allSkills.some((s) => s.id === savedId) ? savedId : allSkills[0].id;

        const active = allSkills.find((s) => s.id === initialId) ?? allSkills[0];
        await openSkillDb(active.dbFile);

        setSkills(allSkills);
        setActiveId(initialId);
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }

    init();
  }, []);

  const activeSkill = skills.find((s) => s.id === activeId) ?? skills[0];

  const switchSkill = useCallback(
    async (id: string) => {
      const skill = skills.find((s) => s.id === id);
      if (!skill) return;
      await openSkillDb(skill.dbFile);
      await metaDb.setActiveSkillId(id);
      setActiveId(id);
    },
    [skills],
  );

  const addSkill = useCallback(async (partial: Omit<Skill, 'id' | 'dbFile'>) => {
    const id = `skill_${Date.now()}`;
    const skill: Skill = { ...partial, id, dbFile: `${id}.db` };
    await metaDb.insertSkill(skill);
    await openSkillDb(skill.dbFile);
    await metaDb.setActiveSkillId(id);
    setSkills((prev) => [...prev, skill]);
    setActiveId(id);
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>DB init failed</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </View>
    );
  }

  if (!ready || !activeSkill) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SkillContext.Provider value={{ skills, activeSkill, ready, switchSkill, addSkill }}>
      {children}
    </SkillContext.Provider>
  );
}

export function useSkill(): SkillContextValue {
  const ctx = useContext(SkillContext);
  if (!ctx) throw new Error('useSkill must be used within SkillProvider');
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
