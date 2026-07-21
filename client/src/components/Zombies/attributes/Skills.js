import React, { useState, useEffect, useMemo, useCallback } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Button, Form, Alert } from 'react-bootstrap';
import { useParams } from 'react-router-dom';

import { SKILLS } from '../skillSchema';
import proficiencyBonus from '../../../utils/proficiencyBonus';
import { normalizeEquipmentMap } from './equipmentNormalization';
import DockControls from '../components/DockControls';
import {
  rollDiceWithBox,
  setDiceBoxThemeColor,
} from '../../../utils/diceBoxManager';
import {
  DEFAULT_DICE_COLOR,
  normalizeDiceColor,
  applyDiceFaceColor,
} from '../../../utils/diceColors';
import { canUsePrimalKnowledgeForSkill, getRageBenefits } from '../utils/barbarian';

const EMPTY_OBJECT = Object.freeze({});

const ABILITY_LABELS = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

const ABILITY_ICONS = {
  str: '✦', dex: '↟', con: '⬡', int: '✧', wis: '◉', cha: '❖',
};

const ABILITY_ORDER = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const formatBonus = (value) => `${Number(value) >= 0 ? '+' : ''}${Number(value)}`;

const formatAdjustmentSegment = (value, label) => {
  if (!value) return null;
  const sign = value >= 0 ? '+' : '-';
  return `${sign} ${Math.abs(value)} ${label}`;
};

const normalizeD20Value = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (rounded < 1) return 1;
  if (rounded > 20) return 20;
  return rounded;
};

const waitForNextAnimationFrame = () =>
  new Promise((resolve) => {
    if (
      typeof window === 'undefined' ||
      typeof window.requestAnimationFrame !== 'function'
    ) {
      resolve();
      return;
    }

    window.requestAnimationFrame(() => resolve());
  });

export function rollSkill(bonus = 0, d20Override = null) {
  const normalizedOverride = normalizeD20Value(d20Override);
  const d20 =
    normalizedOverride !== null
      ? normalizedOverride
      : Math.floor(Math.random() * 20) + 1;
  if (d20 === 20) {
    window.dispatchEvent(new CustomEvent('critical-hit', { detail: 'critical' }));
  } else if (d20 === 1) {
    window.dispatchEvent(new CustomEvent('critical-failure', { detail: 'fumble' }));
  }
  const result = d20 + bonus;
  return { result, d20 };
}

export const resolveD20RollMode = ({ advantageSources = [], disadvantageSources = [] } = {}) => {
  const hasAdvantage = Array.isArray(advantageSources) && advantageSources.length > 0;
  const hasDisadvantage = Array.isArray(disadvantageSources) && disadvantageSources.length > 0;
  if (hasAdvantage && !hasDisadvantage) return 'advantage';
  if (hasDisadvantage && !hasAdvantage) return 'disadvantage';
  return 'normal';
};

export const resolveAbilityCheckRollMode = (character, abilityKey, options = {}) => {
  const normalizedAbility = String(abilityKey || '').toLowerCase();
  const advantageSources = Array.isArray(options.advantageSources)
    ? [...options.advantageSources]
    : [];
  const disadvantageSources = Array.isArray(options.disadvantageSources)
    ? [...options.disadvantageSources]
    : [];

  if (getRageBenefits(character).advantage.abilityChecks.includes(normalizedAbility)) {
    advantageSources.push('Rage');
  }

  return {
    mode: resolveD20RollMode({ advantageSources, disadvantageSources }),
    advantageSources,
    disadvantageSources,
  };
};

const resolveKeptD20 = (values, mode) => {
  if (mode === 'advantage') return Math.max(...values);
  if (mode === 'disadvantage') return Math.min(...values);
  return values[0];
};

export async function rollSkillWithDiceBox(bonus = 0, options = {}) {
  const { diceColor = null, rollMode = 'normal' } = options || {};
  const normalizedRollMode = rollMode === 'advantage' || rollMode === 'disadvantage' ? rollMode : 'normal';
  const normalizedColor = normalizeDiceColor(diceColor) || DEFAULT_DICE_COLOR;

  applyDiceFaceColor(normalizedColor);
  setDiceBoxThemeColor(normalizedColor);
  await waitForNextAnimationFrame();

  try {
    const diceCount = normalizedRollMode === 'normal' ? 1 : 2;
    const { rolls } = await rollDiceWithBox([{ count: diceCount, sides: 20 }]);
    const firstGroup = Array.isArray(rolls) ? rolls[0] : undefined;
    const rolledD20s = (Array.isArray(firstGroup) ? firstGroup : [firstGroup])
      .map(normalizeD20Value)
      .filter((value) => value !== null)
      .slice(0, diceCount);
    if (rolledD20s.length === diceCount) {
      const keptD20 = resolveKeptD20(rolledD20s, normalizedRollMode);
      return {
        ...rollSkill(bonus, keptD20),
        d20: keptD20,
        rolledD20s,
        keptD20,
        rollMode: normalizedRollMode,
        usedDiceBox: true,
      };
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Skill roll using dice box failed', error);
  }

  const fallbackRolls = Array.from(
    { length: normalizedRollMode === 'normal' ? 1 : 2 },
    () => Math.floor(Math.random() * 20) + 1
  );
  const keptD20 = resolveKeptD20(fallbackRolls, normalizedRollMode);
  return {
    ...rollSkill(bonus, keptD20),
    d20: keptD20,
    rolledD20s: fallbackRolls,
    keptD20,
    rollMode: normalizedRollMode,
    usedDiceBox: false,
  };
}

export default function Skills({
  form,
  showSkill,
  handleCloseSkill,
  totalLevel,
  strMod,
  dexMod,
  conMod,
  intMod,
  chaMod,
  wisMod,
  onSkillsChange,
  onRollResult,
  isDocked = false,
  dockedSide = null,
  onDockClose,
  onDockChange,
}) {
  const params = useParams();
  const safeForm = form ?? {};
  const diceFaceColor = useMemo(
    () => normalizeDiceColor(safeForm?.diceColor) || DEFAULT_DICE_COLOR,
    [safeForm?.diceColor],
  );
  const formSkills = safeForm.skills ?? EMPTY_OBJECT;
  const formProficiencyPoints = safeForm.proficiencyPoints || 0;
  const formExpertisePoints = safeForm.expertisePoints || 0;
  const [skills, setSkills] = useState(formSkills);
  const [error, setError] = useState('');
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('ability');
  const [collapsedAbilities, setCollapsedAbilities] = useState({});
  const [modifierPrompt, setModifierPrompt] = useState(null);
  const [selectedModifierAbility, setSelectedModifierAbility] = useState('');
  const [isRollingSkill, setIsRollingSkill] = useState(false);
  const raceProficiencies = useMemo(() => {
    return new Set(
      Object.entries(form?.race?.skills || {})
        .filter(([, s]) => s?.proficient)
        .map(([key]) => key)
    );
  }, [form?.race?.skills]);
  const backgroundProficiencies = useMemo(() => {
    return new Set(
      Object.entries(form?.background?.skills || {})
        .filter(([, s]) => s?.proficient)
        .map(([key]) => key)
    );
  }, [form?.background?.skills]);
  const raceExpertise = useMemo(() => {
    return new Set(
      Object.entries(form?.race?.skills || {})
        .filter(([, s]) => s?.expertise)
        .map(([key]) => key)
    );
  }, [form?.race?.skills]);
  const backgroundExpertise = useMemo(() => {
    return new Set(
      Object.entries(form?.background?.skills || {})
        .filter(([, s]) => s?.expertise)
        .map(([key]) => key)
    );
  }, [form?.background?.skills]);
  const lockedExpertise = useMemo(() => {
    return new Set([...raceExpertise, ...backgroundExpertise]);
  }, [raceExpertise, backgroundExpertise]);
  const lockedProficiencies = useMemo(() => {
    return new Set([...raceProficiencies, ...backgroundProficiencies]);
  }, [raceProficiencies, backgroundProficiencies]);
  const currentProficiencyCount = Object.values(formSkills).filter(
    (s) => s.proficient
  ).length;
  const [proficiencyPointsLeft, setProficiencyPointsLeft] = useState(
    Math.max(0, formProficiencyPoints - currentProficiencyCount)
  );
  const currentExpertiseCount = Object.values(formSkills).filter(
    (s) => s.expertise
  ).length;
  const [expertisePointsLeft, setExpertisePointsLeft] = useState(
    Math.max(0, formExpertisePoints - currentExpertiseCount)
  );

  useEffect(() => {
    const count = Object.values(formSkills).filter(
      (s) => s.proficient
    ).length;
    setSkills(formSkills);
    setProficiencyPointsLeft(
      Math.max(0, formProficiencyPoints - count)
    );
    const expertiseUsed = Object.values(formSkills).filter(
      (s) => s.expertise
    ).length;
    setExpertisePointsLeft(
      Math.max(0, formExpertisePoints - expertiseUsed)
    );
  }, [
    formSkills,
    formProficiencyPoints,
    formExpertisePoints,
    lockedProficiencies,
    lockedExpertise,
  ]);

  const hasEquipment =
    typeof safeForm.equipment === 'object' && safeForm.equipment !== null;
  const normalizedEquipment = useMemo(
    () => normalizeEquipmentMap(safeForm.equipment),
    [safeForm.equipment]
  );
  const equippedArmor = useMemo(() => {
    if (hasEquipment) {
      return Object.values(normalizedEquipment).filter((item) => {
        if (!item) return false;
        if (item.source === 'armor') return true;
        if (item.acBonus != null || item.armorBonus != null || item.ac != null)
          return true;
        if (item.maxDex != null || item.maxDexterity != null) return true;
        if (item.checkPenalty != null || item.stealth != null) return true;
        return false;
      });
    }
    return Array.isArray(safeForm.armor) ? safeForm.armor.filter(Boolean) : [];
  }, [hasEquipment, normalizedEquipment, safeForm.armor]);
  const armorItems = equippedArmor.map((el) =>
    Array.isArray(el)
      ? el
      : [
          el.name,
          el.acBonus ?? el.armorBonus ?? el.ac,
          el.maxDex ?? el.maxDexterity,
          el.checkPenalty ?? el.stealth,
        ]
  );
  const checkPenalty = armorItems.map((item) => Number(item[3] ?? 0));
  const totalCheckPenalty = checkPenalty.reduce(
    (sum, a) => Number(sum) + Number(a),
    0
  );

  const modMap = {
    str: strMod,
    dex: dexMod,
    con: conMod,
    int: intMod,
    wis: wisMod,
    cha: chaMod,
  };

  const equippedItems = useMemo(() => {
    if (hasEquipment) {
      return Object.values(normalizedEquipment).filter(Boolean);
    }
    return Array.isArray(safeForm.item) ? safeForm.item.filter(Boolean) : [];
  }, [safeForm.item, hasEquipment, normalizedEquipment]);

  const itemTotals = SKILLS.reduce((acc, { key }) => {
    acc[key] = equippedItems.reduce(
      (sum, el) => sum + Number(el.skillBonuses?.[key] || 0),
      0
    );
    return acc;
  }, {});

  const featTotals = SKILLS.reduce((acc, { key }) => {
    acc[key] = (safeForm.feat || []).reduce(
      (sum, el) => sum + Number(el[key] || 0),
      0
    );
    return acc;
  }, {});

  const raceTotals = SKILLS.reduce((acc, { key }) => {
    acc[key] = Number(safeForm.race?.[key] || 0);
    return acc;
  }, {});

  const profBonus = proficiencyBonus(totalLevel);

  const selectableSkills = new Set(safeForm.allowedSkills || []);
  const selectableExpertise = new Set(safeForm.allowedExpertise || []);

  const skillRecords = useMemo(() => SKILLS.map((skill) => {
    const { key, ability, armorPenalty = 0 } = skill;
    const current = skills[key] || {};
    const isProficient = Boolean(current.proficient || lockedProficiencies.has(key));
    const expertise = Boolean(current.expertise || lockedExpertise.has(key));
    const armorPenaltyValue = armorPenalty ? armorPenalty * totalCheckPenalty : 0;
    const proficiencyValue = profBonus * (expertise ? 2 : isProficient ? 1 : 0);
    return {
      ...skill,
      proficient: isProficient,
      expertise,
      armorPenaltyValue,
      proficiencyValue,
      itemBonus: itemTotals[key],
      featBonus: featTotals[key],
      raceBonus: raceTotals[key],
      total: modMap[ability] + proficiencyValue + armorPenaltyValue + itemTotals[key] + featTotals[key] + raceTotals[key],
    };
  }), [skills, lockedProficiencies, lockedExpertise, totalCheckPenalty, profBonus, itemTotals, featTotals, raceTotals, strMod, dexMod, conMod, intMod, wisMod, chaMod]);

  const visibleSkillGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = skillRecords.filter((skill) => {
      const matchesQuery = !query || [skill.label, ABILITY_LABELS[skill.ability], skill.description]
        .some((value) => value.toLowerCase().includes(query));
      const matchesFilter = skillFilter === 'all'
        || (skillFilter === 'proficient' && skill.proficient)
        || (skillFilter === 'expertise' && skill.expertise)
        || (skillFilter === 'untrained' && !skill.proficient)
        || skillFilter === skill.ability;
      return matchesQuery && matchesFilter;
    });
    const byAbility = ABILITY_ORDER.map((ability) => ({
      ability,
      skills: filtered.filter((skill) => skill.ability === ability).sort((a, b) => {
        if (sortOrder === 'highest') return b.total - a.total || a.label.localeCompare(b.label);
        if (sortOrder === 'alphabetical') return a.label.localeCompare(b.label);
        if (sortOrder === 'proficient') return Number(b.proficient) - Number(a.proficient) || b.total - a.total;
        if (sortOrder === 'expertise') return Number(b.expertise) - Number(a.expertise) || b.total - a.total;
        return 0;
      }),
    }));
    return sortOrder === 'highest' || sortOrder === 'alphabetical' || sortOrder === 'proficient' || sortOrder === 'expertise'
      ? byAbility.filter((group) => group.skills.length)
      : byAbility.filter((group) => group.skills.length);
  }, [skillRecords, searchQuery, skillFilter, sortOrder]);

  const strongestSkill = useMemo(
    () => skillRecords.reduce((best, skill) => (!best || skill.total > best.total ? skill : best), null),
    [skillRecords],
  );
  const passivePerception = (skillRecords.find((skill) => skill.key === 'perception')?.total || 0) + 10;
  const activeSkill = skillRecords.find((skill) => skill.key === selectedSkill) || null;

  const dialogClassName = useMemo(() => {
    if (!isDocked) {
      return undefined;
    }

    const classes = ['docked-modal'];
    if (dockedSide) {
      classes.push(`docked-modal--${dockedSide}`);
    }
    classes.push('docked-modal--skills');
    return classes.join(' ');
  }, [isDocked, dockedSide]);

  const modalClassName = useMemo(() => {
    const classes = ['dnd-modal', 'modern-modal'];
    if (isDocked) {
      classes.push('docked-modal-container');
    }
    return classes.join(' ');
  }, [isDocked]);

  const handleModalHide = useCallback(() => {
    if (isDocked) {
      if (typeof onDockClose === 'function') {
        onDockClose();
      }
      return;
    }

    handleCloseSkill?.();
  }, [isDocked, onDockClose, handleCloseSkill]);

  if (!form) {
    return <div>Loading...</div>;
  }

  async function updateSkill(skill, updated) {
    try {
      const res = await apiFetch(`/skills/update-skills/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, ...updated }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Failed to update skill');
      }
      const data = await res.json();
      setSkills((prev) => {
        const newSkills = {
          ...prev,
          [skill]: { proficient: data.proficient, expertise: data.expertise },
        };
        const proficientCount = Object.values(newSkills).filter(
          (s) => s.proficient
        ).length;
        setProficiencyPointsLeft(
          Math.max(0, (safeForm.proficiencyPoints || 0) - proficientCount)
        );
        onSkillsChange?.(newSkills);
        return newSkills;
      });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error updating skill');
    }
  }

  const toggleProficient = (skill) => {
    if (lockedProficiencies.has(skill)) return;
    if (!selectableSkills.has(skill)) return;
    const current = skills[skill] || { proficient: false, expertise: false };
    if (!current.proficient && proficiencyPointsLeft <= 0) return;
    const updated = {
      proficient: !current.proficient,
      expertise: current.proficient ? current.expertise : false,
    };
    if (!updated.proficient) {
      updated.expertise = false;
    }
    updateSkill(skill, updated);
  };

  const toggleExpertise = (skill) => {
    const current = skills[skill] || { proficient: false, expertise: false };
    if (!(current.proficient || lockedProficiencies.has(skill))) return;
    if (!selectableExpertise.has(skill)) return;
    if (!current.expertise && expertisePointsLeft <= 0) return;
    const updated = {
      proficient: current.proficient,
      expertise: !current.expertise,
    };
    updateSkill(skill, updated);
  };

  const executeSkillRoll = async (skillKey, ability, proficient, expertise, labelSuffix = '', options = {}) => {
    const { closeParentBeforeRoll = true } = options;
    const skill = SKILLS.find((s) => s.key === skillKey);
    const skillLabel = skill?.label || skill?.name || skillKey;
    const armorPenalty = skill?.armorPenalty || 0;
    const penalty = armorPenalty ? armorPenalty * totalCheckPenalty : 0;
    const proficiencyValue = profBonus * (expertise ? 2 : proficient ? 1 : 0);
    const bonus =
      modMap[ability] +
      proficiencyValue +
      penalty +
      itemTotals[skillKey] +
      featTotals[skillKey] +
      raceTotals[skillKey];
    const abilityLabel =
      ABILITY_LABELS[ability] || ability?.toUpperCase?.() || ability || 'Ability';

    if (closeParentBeforeRoll && !isDocked) {
      handleCloseSkill?.();
    }

    const rollModeResult = resolveAbilityCheckRollMode(safeForm, ability);
    const { result, d20, rolledD20s, keptD20, rollMode } = await rollSkillWithDiceBox(bonus, {
      diceColor: diceFaceColor,
      rollMode: rollModeResult.mode,
    });
    const actualRollMode = rollMode || rollModeResult.mode;
    const breakdownParts = [actualRollMode === 'advantage' || actualRollMode === 'disadvantage'
      ? `${keptD20 ?? d20} (d20) (Rolled ${(rolledD20s || [d20]).join(' and ')})`
      : `${d20} (d20)`];

    const segments = [
      formatAdjustmentSegment(modMap[ability], `${abilityLabel} Modifier`),
      proficiencyValue
        ? formatAdjustmentSegment(
            proficiencyValue,
            expertise ? 'Expertise Bonus' : 'Proficiency Bonus'
          )
        : null,
      formatAdjustmentSegment(penalty, 'Armor Penalty'),
      formatAdjustmentSegment(itemTotals[skillKey], 'Item Bonus'),
      formatAdjustmentSegment(featTotals[skillKey], 'Feat Bonus'),
      formatAdjustmentSegment(raceTotals[skillKey], 'Race Bonus'),
    ];

    segments.filter(Boolean).forEach((segment) => {
      breakdownParts.push(segment);
    });

    const diceRolls = [
      {
        sides: 20,
        value: d20,
        type: `${skillLabel} Check`,
        category: 'base',
      },
    ];
    window.dispatchEvent(
      new CustomEvent('damage-roll', {
        detail: {
          value: result,
          breakdown: breakdownParts.join(' '),
          source: labelSuffix ? `${abilityLabel} (${skillLabel}) ${labelSuffix}` : skillLabel,
          rollLabel: 'Skill Roll',
          critical: d20 === 20,
          fumble: d20 === 1,
          diceRolls,
          rollMode: actualRollMode,
          advantageSources: rollModeResult.advantageSources,
          disadvantageSources: rollModeResult.disadvantageSources,
        },
      })
    );
  };

  const handleRoll = async (skillKey, ability, proficient, expertise) => {
    if (isRollingSkill || modifierPrompt) return;
    if (canUsePrimalKnowledgeForSkill(safeForm, skillKey)) {
      setModifierPrompt({ skillKey, ability, proficient, expertise });
      setSelectedModifierAbility(ability);
      return;
    }
    setIsRollingSkill(true);
    try {
      await executeSkillRoll(skillKey, ability, proficient, expertise);
    } finally {
      setIsRollingSkill(false);
    }
  };

  const confirmModifierPrompt = async () => {
    if (!modifierPrompt || isRollingSkill) return;
    const prompt = { ...modifierPrompt };
    const ability = selectedModifierAbility || prompt.ability;
    const suffix = ability === 'str' && ability !== prompt.ability ? '— Primal Knowledge' : '';

    closeModifierPrompt();
    if (!isDocked) {
      handleCloseSkill?.();
    }

    setIsRollingSkill(true);
    try {
      await executeSkillRoll(
        prompt.skillKey,
        ability,
        prompt.proficient,
        prompt.expertise,
        suffix,
        { closeParentBeforeRoll: false }
      );
    } finally {
      setIsRollingSkill(false);
    }
  };

  const closeModifierPrompt = () => {
    if (isRollingSkill) return;
    setModifierPrompt(null);
    setSelectedModifierAbility('');
  };

  const handleView = (skill) => {
    setSelectedSkill(skill);
  };


  return (
    <>
      <Modal
        className={modalClassName}
        show={showSkill}
        onHide={handleModalHide}
        size="lg"
        scrollable
        centered={!isDocked}
        backdrop={isDocked ? false : true}
        enforceFocus={!isDocked}
        restoreFocus={!isDocked}
        dialogClassName={dialogClassName}
      >
        <Card className="modern-card text-center">
          <Card.Header className="modal-header">
            <DockControls
              dockedSide={dockedSide}
              onDockChange={onDockChange}
              isDocked={isDocked}
            />
            <Card.Title className="modal-title">Skills</Card.Title>
          </Card.Header>
          <Card.Body className="skill-codex-body">
            {error && (
              <Alert variant="danger" onClose={() => setError('')} dismissible>
                {error}
              </Alert>
            )}
            <section className="skill-codex-summary" aria-label="Skill summary">
              <div className="skill-codex-summary__title">
                <span className="skill-codex-kicker">Adventurer's reference</span>
                <h2>Skill Codex</h2>
                <p>Master your strengths, chart your training, and roll with confidence.</p>
              </div>
              <div className="skill-codex-stats">
                <div className={`skill-codex-stat ${proficiencyPointsLeft === 0 ? 'is-complete' : ''}`}>
                  <span>Proficiencies remaining</span><strong>{proficiencyPointsLeft === 0 ? '✓ Complete' : proficiencyPointsLeft}</strong>
                </div>
                <div className={`skill-codex-stat ${expertisePointsLeft === 0 ? 'is-complete' : ''}`}>
                  <span>Expertise remaining</span><strong>{expertisePointsLeft === 0 ? '✓ Complete' : expertisePointsLeft}</strong>
                </div>
                <div className="skill-codex-stat"><span>Highest skill</span><strong>{strongestSkill ? `${strongestSkill.label} ${formatBonus(strongestSkill.total)}` : '—'}</strong></div>
                <div className="skill-codex-stat"><span>Passive perception</span><strong>{passivePerception}</strong></div>
                <div className="skill-codex-stat"><span>Proficiency bonus</span><strong>{formatBonus(profBonus)}</strong></div>
              </div>
            </section>

            <section className="skill-codex-toolbar" aria-label="Search and filter skills">
              <label className="skill-codex-search">
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                <span className="visually-hidden">Search skills</span>
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search skills, abilities, or lore" />
              </label>
              <div className="skill-codex-filter-row" role="group" aria-label="Skill status filters">
                {[
                  ['all', 'All'], ['proficient', 'Proficient'], ['expertise', 'Expertise'], ['untrained', 'Untrained'],
                ].map(([value, label]) => <button key={value} type="button" className={`skill-filter-chip ${skillFilter === value ? 'is-active' : ''}`} onClick={() => setSkillFilter(value)} aria-pressed={skillFilter === value}>{label}</button>)}
              </div>
              <label className="skill-codex-sort">Sort
                <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} aria-label="Sort skills">
                  <option value="ability">Ability</option><option value="highest">Highest bonus</option><option value="alphabetical">Alphabetical</option><option value="proficient">Proficient</option><option value="expertise">Expertise</option>
                </select>
              </label>
            </section>

            <div className="skill-codex-layout">
              <main className="skill-codex-library" aria-live="polite">
                {visibleSkillGroups.length ? visibleSkillGroups.map(({ ability, skills: abilitySkills }) => (
                  <section key={ability} className={`skill-ability-group skill-ability-group--${ability}`}>
                    <button type="button" className="skill-ability-heading" onClick={() => setCollapsedAbilities((previous) => ({ ...previous, [ability]: !previous[ability] }))} aria-expanded={!collapsedAbilities[ability]}>
                      <span className="skill-ability-icon" aria-hidden="true">{ABILITY_ICONS[ability]}</span>
                      <span><small>{ABILITY_LABELS[ability]}</small><strong>{formatBonus(modMap[ability])} modifier</strong></span>
                      <span className="skill-ability-count">{abilitySkills.length} skills <i className={`fa-solid fa-chevron-${collapsedAbilities[ability] ? 'down' : 'up'}`} aria-hidden="true" /></span>
                    </button>
                    {!collapsedAbilities[ability] && <div className="skill-codex-grid">
                      {abilitySkills.map((skill) => {
                        const isSelectable = selectableSkills.has(skill.key);
                        const isRaceSkill = raceProficiencies.has(skill.key);
                        const isBackgroundSkill = backgroundProficiencies.has(skill.key);
                        const canToggleProficiency = isSelectable && !isRaceSkill && !isBackgroundSkill && (skill.proficient || proficiencyPointsLeft > 0);
                        const canToggleExpertise = skill.proficient && selectableExpertise.has(skill.key) && !lockedExpertise.has(skill.key) && (skill.expertise || expertisePointsLeft > 0);
                        const status = skill.expertise ? 'Expertise' : skill.proficient ? 'Proficient' : 'Not trained';
                        return <article key={skill.key} className={`skill-codex-card ${selectedSkill === skill.key ? 'is-selected' : ''}`}>
                          <button type="button" className="skill-codex-card__main" onClick={() => handleView(skill.key)} aria-label={`View ${skill.label} details`}>
                            <span className="skill-codex-card__bonus">{formatBonus(skill.total)}</span>
                            <span className="skill-codex-card__identity"><strong>{skill.label}</strong><small>{ABILITY_LABELS[skill.ability]} · {skill.ability.toUpperCase()} {formatBonus(modMap[skill.ability])}</small></span>
                          </button>
                          <div className="skill-codex-card__actions">
                            <span className={`skill-status-chip is-${status.toLowerCase().replace(' ', '-')}`}>{status}</span>
                            <button type="button" className="skill-icon-button" onClick={() => handleRoll(skill.key, skill.ability, skill.proficient, skill.expertise)} aria-label={`roll ${skill.label}`} title="Roll skill check"><i className="fa-solid fa-dice-d20" aria-hidden="true" /></button>
                          </div>
                          <div className="skill-codex-card__training" role="group" aria-label={`${skill.label} training`}>
                            <button type="button" className={`skill-training-chip ${skill.proficient ? 'is-active' : ''}`} disabled={!canToggleProficiency} onClick={() => toggleProficient(skill.key)} aria-pressed={skill.proficient}>Proficient</button>
                            <button type="button" className={`skill-training-chip skill-training-chip--expertise ${skill.expertise ? 'is-active' : ''}`} disabled={!canToggleExpertise} onClick={() => toggleExpertise(skill.key)} aria-pressed={skill.expertise}>Expertise</button>
                          </div>
                        </article>;
                      })}
                    </div>}
                  </section>
                )) : <div className="skill-codex-empty">No skills match this search. Clear a filter to reveal your full codex.</div>}
              </main>
              <aside className={`skill-codex-inspector ${activeSkill ? 'is-open' : ''}`} aria-label="Skill details">
                {activeSkill ? <>
                  <div className="skill-codex-inspector__heading"><span className={`skill-status-chip is-${(activeSkill.expertise ? 'expertise' : activeSkill.proficient ? 'proficient' : 'not-trained')}`}>{activeSkill.expertise ? 'Expertise' : activeSkill.proficient ? 'Proficient' : 'Not trained'}</span><button type="button" className="skill-icon-button" onClick={() => setSelectedSkill(null)} aria-label="Close skill details"><i className="fa-solid fa-xmark" /></button></div>
                  <span className="skill-codex-inspector__ability">{ABILITY_ICONS[activeSkill.ability]} {ABILITY_LABELS[activeSkill.ability]}</span><h3>{activeSkill.label} <strong>{formatBonus(activeSkill.total)}</strong></h3><p>{activeSkill.description}</p>
                  <h4>Bonus breakdown</h4>
                  <dl className="skill-breakdown"><div><dt>Ability modifier</dt><dd>{formatBonus(modMap[activeSkill.ability])}</dd></div><div><dt>{activeSkill.expertise ? 'Expertise bonus' : 'Proficiency bonus'}</dt><dd>{formatBonus(activeSkill.proficiencyValue)}</dd></div><div><dt>Equipment & features</dt><dd>{formatBonus(activeSkill.itemBonus + activeSkill.featBonus + activeSkill.raceBonus)}</dd></div>{activeSkill.armorPenaltyValue !== 0 && <div><dt>Armor penalty</dt><dd>{formatBonus(activeSkill.armorPenaltyValue)}</dd></div>}</dl>
                  <Button className="skill-inspector-roll" onClick={() => handleRoll(activeSkill.key, activeSkill.ability, activeSkill.proficient, activeSkill.expertise)} aria-label={`roll ${activeSkill.label}`}>Roll {activeSkill.label}</Button>
                </> : <div className="skill-codex-inspector__empty"><i className="fa-solid fa-book-open" aria-hidden="true" /><strong>Skill inspector</strong><p>Select a skill to view its lore, current bonus, and training details.</p></div>}
              </aside>
            </div>
          </Card.Body>
          <Card.Footer className="modal-footer d-flex">
            <Button
              onClick={() => handleCloseSkill()}
              className="action-btn close-btn flex-fill"
            >Close</Button>
          </Card.Footer>
        </Card>
      </Modal>
      <Modal
        className="dnd-modal modern-modal"
        show={Boolean(modifierPrompt)}
        onHide={closeModifierPrompt}
        centered
        restoreFocus
        enforceFocus
      >
        <Card className="modern-card text-center">
          <Card.Header className="modal-header">
            <Card.Title className="modal-title">Choose Modifier</Card.Title>
          </Card.Header>
          <Card.Body>
            <Form.Group className="mb-3 mx-5" controlId="primal-knowledge-modifier">
              <Form.Label className="text-light">Modifier:</Form.Label>
              <Form.Select
                value={selectedModifierAbility}
                onChange={(event) => setSelectedModifierAbility(event.target.value)}
                autoFocus
              >
                {modifierPrompt && [modifierPrompt.ability, 'str']
                  .filter((value, index, array) => array.indexOf(value) === index)
                  .map((abilityKey) => (
                    <option key={abilityKey} value={abilityKey}>
                      {ABILITY_LABELS[abilityKey] || abilityKey.toUpperCase()} ({modMap[abilityKey] >= 0 ? '+' : ''}{modMap[abilityKey]}){abilityKey === 'str' && abilityKey !== modifierPrompt.ability ? ' — Primal Knowledge' : ''}
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>
          </Card.Body>
          <Card.Footer className="modal-footer">
            <Button className="action-btn close-btn" onClick={closeModifierPrompt} disabled={isRollingSkill}>
              Cancel
            </Button>
            <Button className="action-btn save-btn" onClick={confirmModifierPrompt} disabled={isRollingSkill}>
              Roll
            </Button>
          </Card.Footer>
        </Card>
      </Modal>
    </>
  );
}
