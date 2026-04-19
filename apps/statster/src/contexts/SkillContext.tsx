import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as metaDb from '../db/meta';
import { openSkillDb } from '../db/skillDb';

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

  useEffect(() => {
    async function init() {
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

  if (!ready || !activeSkill) return null;

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
