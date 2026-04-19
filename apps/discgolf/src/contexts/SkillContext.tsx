import React, { createContext, useCallback, useContext, useState } from 'react';

export type Skill = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  dbFile: string;
};

const MOCK_SKILLS: Skill[] = [
  { id: 'disc_golf', name: 'Disc Golf', emoji: '🥏', color: '#0C447C', dbFile: 'disc_golf.db' },
  { id: 'guitar',   name: 'Guitar',    emoji: '🎸', color: '#7C3D0C', dbFile: 'guitar.db' },
  { id: 'gym',      name: 'Gym',       emoji: '🏋️', color: '#0C6B3D', dbFile: 'gym.db' },
];

type SkillContextValue = {
  skills: Skill[];
  activeSkill: Skill;
  switchSkill: (id: string) => void;
  addSkill: (skill: Omit<Skill, 'id' | 'dbFile'>) => void;
};

const SkillContext = createContext<SkillContextValue | null>(null);

export function SkillProvider({ children }: { children: React.ReactNode }) {
  const [skills, setSkills] = useState<Skill[]>(MOCK_SKILLS);
  const [activeId, setActiveId] = useState(MOCK_SKILLS[0].id);

  const activeSkill = skills.find((s) => s.id === activeId) ?? skills[0];

  const switchSkill = useCallback((id: string) => {
    setActiveId(id);
    // TODO: open per-skill db connection here once expo-sqlite is wired up
  }, []);

  const addSkill = useCallback((skill: Omit<Skill, 'id' | 'dbFile'>) => {
    const id = `skill_${Date.now()}`;
    const dbFile = `${id}.db`;
    setSkills((prev) => [...prev, { ...skill, id, dbFile }]);
    setActiveId(id);
  }, []);

  return (
    <SkillContext.Provider value={{ skills, activeSkill, switchSkill, addSkill }}>
      {children}
    </SkillContext.Provider>
  );
}

export function useSkill(): SkillContextValue {
  const ctx = useContext(SkillContext);
  if (!ctx) throw new Error('useSkill must be used within SkillProvider');
  return ctx;
}
