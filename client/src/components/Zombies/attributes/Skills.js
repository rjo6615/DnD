import React, { useState, useEffect, useMemo, useCallback } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Button, Form, Alert } from 'react-bootstrap';
import { useParams } from 'react-router-dom';

import { SKILLS } from '../skillSchema';
import proficiencyBonus from '../../../utils/proficiencyBonus';
import SkillInfoModal from './SkillInfoModal';
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
  const [showSkillInfo, setShowSkillInfo] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
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

  const executeSkillRoll = async (skillKey, ability, proficient, expertise, labelSuffix = '') => {
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

    if (!isDocked && !labelSuffix) {
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
    const ability = selectedModifierAbility || modifierPrompt.ability;
    const suffix = ability === 'str' && ability !== modifierPrompt.ability ? '— Primal Knowledge' : '';
    setIsRollingSkill(true);
    try {
      await executeSkillRoll(
        modifierPrompt.skillKey,
        ability,
        modifierPrompt.proficient,
        modifierPrompt.expertise,
        suffix
      );
      setModifierPrompt(null);
      setSelectedModifierAbility('');
      if (!isDocked) {
        handleCloseSkill?.();
      }
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
    setShowSkillInfo(true);
  };

  const handleCloseSkillInfo = () => {
    setShowSkillInfo(false);
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
          <Card.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {error && (
              <Alert variant="danger" onClose={() => setError('')} dismissible>
                {error}
              </Alert>
            )}
            <div className="points-container" style={{ display: 'flex' }}>
              <span className="points-label text-light">Proficiencies Left:</span>
              <span className="points-value">{proficiencyPointsLeft}</span>
            </div>
            <div className="points-container" style={{ display: 'flex' }}>
              <span className="points-label text-light">Expertise Left:</span>
              <span className="points-value">{expertisePointsLeft}</span>
            </div>
            <div className="skills-card-grid">
              {SKILLS.map(({
                key,
                label,
                ability,
                armorPenalty = 0,
              }) => {
                const { proficient = false, expertise = false } =
                  skills[key] || {};
                const penalty = armorPenalty
                  ? armorPenalty * totalCheckPenalty
                  : 0;
                const isProficient = proficient || lockedProficiencies.has(key);
                const multiplier = expertise ? 2 : isProficient ? 1 : 0;
                const total =
                  modMap[ability] +
                  profBonus * multiplier +
                  penalty +
                  itemTotals[key] +
                  featTotals[key] +
                  raceTotals[key];
                const isSelectable = selectableSkills.has(key);
                const isRaceSkill = raceProficiencies.has(key);
                const isBackgroundSkill = backgroundProficiencies.has(key);
                const abilityLabel = ability?.toUpperCase();
                const proficiencyId = `skill-${key}-proficiency`;
                const expertiseId = `skill-${key}-expertise`;

                return (
                  <div key={key} className="skill-card">
                    <div className="skill-card-header">
                      <div className="skill-card-title">
                        <span className="skill-card-name">{label}</span>
                        <span className="skill-card-ability">{abilityLabel}</span>
                      </div>
                      <div className="skill-card-actions">
                        <Button
                          onClick={() => handleView(key)}
                          variant="link"
                          aria-label={`view ${label}`}
                        >
                          <i className="fa-solid fa-eye"></i>
                        </Button>
                        <Button
                          onClick={() =>
                            handleRoll(key, ability, isProficient, expertise)
                          }
                          variant="link"
                          aria-label={`roll ${label}`}
                        >
                          <i className="fa-solid fa-dice-d20"></i>
                        </Button>
                      </div>
                    </div>
                    <div className="skill-card-metrics">
                      <div className="skill-card-metric">
                        <span className="skill-card-metric-label">Total</span>
                        <span className="skill-card-metric-value">{total}</span>
                      </div>
                      <div className="skill-card-metric">
                        <span className="skill-card-metric-label">Mod</span>
                        <span className="skill-card-metric-value">
                          {modMap[ability]}
                        </span>
                      </div>
                    </div>
                    <div className="skill-card-toggles">
                      <Form.Check
                        id={proficiencyId}
                        className="skill-checkbox"
                        type="checkbox"
                        label="Proficient"
                        checked={proficient}
                        disabled={!isSelectable || isRaceSkill || isBackgroundSkill}
                        onChange={() => toggleProficient(key)}
                      />
                      <Form.Check
                        id={expertiseId}
                        className="skill-checkbox"
                        type="checkbox"
                        label="Expertise"
                        checked={expertise}
                        disabled={
                          !isProficient ||
                          !selectableExpertise.has(key) ||
                          lockedExpertise.has(key) ||
                          (!expertise && expertisePointsLeft <= 0)
                        }
                        onChange={() => toggleExpertise(key)}
                      />
                    </div>
                  </div>
                );
              })}
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
      <SkillInfoModal
        show={showSkillInfo}
        onHide={handleCloseSkillInfo}
        skillKey={selectedSkill}
      />
    </>
  );
}

