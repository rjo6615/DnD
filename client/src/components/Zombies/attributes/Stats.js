import React, { useMemo, useState, useCallback } from "react";
import { Modal, Button } from "react-bootstrap";
import DockControls from '../components/DockControls';
import STATS from "../statSchema";
import StatBreakdownModal from "./StatBreakdownModal";
import { normalizeEquipmentMap } from './equipmentNormalization';
import { resolveAbilityCheckRollMode, rollSkillWithDiceBox } from './Skills';
import proficiencyBonus from '../../../utils/proficiencyBonus';
import { resolveSavingThrowRollMode } from '../utils/barbarian';
import {
  DEFAULT_DICE_COLOR,
  normalizeDiceColor,
} from '../../../utils/diceColors';

const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const ABILITY_LABELS = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

const ABILITY_CODEX = {
  str: { icon: 'fa-hammer', accent: 'crimson', skills: ['Athletics'], governs: 'physical power, lifting, and forceful feats', checks: 'breaking restraints, climbing sheer surfaces, and wrestling foes', synergy: 'Barbarian, Fighter, and Paladin builds' },
  dex: { icon: 'fa-dagger', accent: 'emerald', skills: ['Acrobatics', 'Sleight of Hand', 'Stealth'], governs: 'agility, reflexes, balance, and precision', checks: 'sneaking past a guard, balancing on a ledge, and picking a pocket', synergy: 'Rogue, Ranger, Monk, and agile Fighter builds' },
  con: { icon: 'fa-shield-halved', accent: 'amber', skills: [], governs: 'endurance, stamina, and physical resilience', checks: 'withstanding poison, marching through hardship, and holding your breath', synergy: 'Every adventurer, especially frontline and concentration-focused builds' },
  int: { icon: 'fa-book-open', accent: 'azure', skills: ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'], governs: 'reasoning, memory, lore, and deduction', checks: 'recalling ancient lore, deciphering magic, and finding hidden clues', synergy: 'Wizard, Artificer, and knowledge-focused Rogue builds' },
  wis: { icon: 'fa-eye', accent: 'verdant', skills: ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'], governs: 'perception, intuition, awareness, and judgment', checks: 'spotting danger, reading intentions, and tracking a trail', synergy: 'Cleric, Druid, Monk, Ranger, and perceptive builds' },
  cha: { icon: 'fa-crown', accent: 'violet', skills: ['Deception', 'Intimidation', 'Performance', 'Persuasion'], governs: 'confidence, presence, and force of personality', checks: 'negotiating, performing, deceiving, and commanding attention', synergy: 'Bard, Paladin, Sorcerer, Warlock, and social builds' },
};

const signed = (value) => `${value >= 0 ? '+' : ''}${value}`;
const scoreTier = (score) => score >= 20 ? 'Legendary' : score >= 18 ? 'Excellent' : score >= 14 ? 'Strong' : score >= 10 ? 'Steady' : 'Developing';

const formatAdjustmentSegment = (value, label) => {
  const sign = value >= 0 ? '+' : '-';
  return `${sign} ${Math.abs(value)} ${label}`;
};

const formatRollBreakdown = ({ keptD20, rolledD20s, rollMode, modifier, abilityLabel, proficiency = 0 }) => {
  const diceLine = rollMode === 'advantage' || rollMode === 'disadvantage'
    ? `${keptD20} (d20) (Rolled ${rolledD20s.join(' and ')})`
    : `${keptD20} (d20)`;

  return [
    diceLine,
    formatAdjustmentSegment(modifier, `${abilityLabel} Modifier`),
    proficiency ? formatAdjustmentSegment(proficiency, 'Proficiency Bonus') : null,
  ].filter(Boolean).join(' ');
};

const formatAbilityCheckBreakdown = (options) => formatRollBreakdown(options);

const formatSavingThrowBreakdown = (options) => formatRollBreakdown(options);

const getTotalLevel = (form = {}) => (Array.isArray(form.occupation) ? form.occupation : []).reduce(
  (total, entry) => total + (Number(entry?.Level ?? entry?.level ?? 0) || 0),
  0
);

const normalizeAbilityToken = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  const entries = Object.entries(ABILITY_LABELS);
  return entries.find(([key, label]) => normalized === key || normalized === label.toLowerCase())?.[0] || normalized;
};

export const isSavingThrowProficient = (form = {}, statKey) => {
  const target = normalizeAbilityToken(statKey);
  const sources = [
    ...(Array.isArray(form.savingThrows) ? form.savingThrows : []),
    ...(Array.isArray(form.savingThrowProficiencies) ? form.savingThrowProficiencies : []),
    ...(Array.isArray(form.occupation) ? form.occupation.flatMap((entry) => entry?.savingThrows || entry?.proficiencies?.savingThrows || []) : []),
  ];
  return sources.some((entry) => normalizeAbilityToken(entry) === target);
};

const createEmptyStatMap = () => ({
  str: 0,
  dex: 0,
  con: 0,
  int: 0,
  wis: 0,
  cha: 0,
});

export default function Stats({
  form,
  showStats,
  handleCloseStats,
  isDocked = false,
  dockedSide = null,
  onDockClose,
  onDockChange,
}) {
  const [stats] = useState({
    str: form.str || 0,
    dex: form.dex || 0,
    con: form.con || 0,
    int: form.int || 0,
    wis: form.wis || 0,
    cha: form.cha || 0,
  });

  const diceFaceColor = useMemo(
    () => normalizeDiceColor(form?.diceColor) || DEFAULT_DICE_COLOR,
    [form?.diceColor],
  );

  const [showBreakdown, setShowBreakdown] = useState(false);
  const [selectedStat, setSelectedStat] = useState(null);
  const [favoriteStats, setFavoriteStats] = useState(() => new Set());
  const equippedItems = useMemo(() => {
    if (typeof form?.equipment === 'object' && form.equipment !== null) {
      const normalized = normalizeEquipmentMap(form.equipment);
      return Object.values(normalized).filter(Boolean);
    }
    return Array.isArray(form.item) ? form.item.filter(Boolean) : [];
  }, [form.equipment, form.item]);

  const { bonuses: totalItemBonus, overrides: itemOverrides } = equippedItems.reduce(
    (acc, el) => {
      STAT_KEYS.forEach((key) => {
        const bonusValue = Number(el.statBonuses?.[key] || 0);
        if (!Number.isNaN(bonusValue)) {
          acc.bonuses[key] += bonusValue;
        }
        const overrideRaw = el.statOverrides?.[key];
        if (overrideRaw !== undefined && overrideRaw !== null) {
          const overrideValue = Number(overrideRaw);
          if (!Number.isNaN(overrideValue)) {
            const current = acc.overrides[key];
            acc.overrides[key] =
              current === undefined ? overrideValue : Math.max(current, overrideValue);
          }
        }
      });
      return acc;
    },
    { bonuses: createEmptyStatMap(), overrides: {} }
  );

  const totalFeatBonus = (form.feat || []).reduce(
    (acc, el) => ({
      str: acc.str + Number(el.str || 0),
      dex: acc.dex + Number(el.dex || 0),
      con: acc.con + Number(el.con || 0),
      int: acc.int + Number(el.int || 0),
      wis: acc.wis + Number(el.wis || 0),
      cha: acc.cha + Number(el.cha || 0),
    }),
    { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
  );

  const raceBonus = form.race?.abilities || {};
  const classBonus = (form.occupation || []).reduce(
    (acc, occ) => ({
      str: acc.str + Number(occ.str || 0),
      dex: acc.dex + Number(occ.dex || 0),
      con: acc.con + Number(occ.con || 0),
      int: acc.int + Number(occ.int || 0),
      wis: acc.wis + Number(occ.wis || 0),
      cha: acc.cha + Number(occ.cha || 0),
    }),
    { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
  );

  const breakdowns = Object.keys(stats).reduce((acc, key) => {
    const base = stats[key] - classBonus[key];
    const race = Number(raceBonus[key] || 0);
    const feat = totalFeatBonus[key];
    const item = totalItemBonus[key];
    const cls = classBonus[key];
    const totalWithoutOverride = base + cls + race + feat + item;
    const overrideValue = itemOverrides[key];
    const breakdown = {
      base,
      class: cls,
      race,
      feat,
      item,
      total: totalWithoutOverride,
    };
    if (
      overrideValue !== undefined &&
      overrideValue !== null &&
      overrideValue > totalWithoutOverride
    ) {
      breakdown.override = overrideValue;
      breakdown.total = overrideValue;
    }
    acc[key] = breakdown;
    return acc;
  }, {});

  const computedStats = Object.fromEntries(
    Object.entries(breakdowns).map(([key, b]) => [key, b.total])
  );

  const statMods = Object.fromEntries(
    Object.entries(computedStats).map(([key, value]) => [key, Math.floor((value - 10) / 2)])
  );

  const abilitySummary = useMemo(() => {
    const entries = STAT_KEYS.map((key) => ({ key, score: computedStats[key], modifier: statMods[key] }));
    const highest = entries.reduce((best, entry) => entry.score > best.score ? entry : best, entries[0]);
    const lowest = entries.reduce((worst, entry) => entry.score < worst.score ? entry : worst, entries[0]);
    const average = entries.reduce((total, entry) => total + entry.modifier, 0) / entries.length;
    return {
      highest,
      lowest,
      average: Number.isInteger(average) ? signed(average) : signed(average.toFixed(1)),
      saves: entries.filter(({ key }) => isSavingThrowProficient(form, key)).length,
      proficiency: proficiencyBonus(getTotalLevel(form)),
    };
  }, [computedStats, form, statMods]);

  const toggleFavorite = useCallback((statKey) => {
    setFavoriteStats((previous) => {
      const next = new Set(previous);
      next.has(statKey) ? next.delete(statKey) : next.add(statKey);
      return next;
    });
  }, []);

  const handleView = (stat) => {
    setSelectedStat(stat);
    setShowBreakdown(true);
  };

  const handleCloseBreakdown = () => {
    setShowBreakdown(false);
  };

  const handleRoll = useCallback(
    async (statKey) => {
      const statMod = statMods[statKey] ?? 0;
      const statInfo = STATS.find((stat) => stat.key === statKey);
      const statLabel = statInfo?.label || statKey.toUpperCase();

      if (!isDocked) {
        handleCloseStats?.();
      }

      const { mode: rollMode } = resolveAbilityCheckRollMode(form, statKey);
      const rollResult = await rollSkillWithDiceBox(statMod, {
        diceColor: diceFaceColor,
        rollMode,
      });
      const { result, d20 } = rollResult;
      const rolledD20s = Array.isArray(rollResult.rolledD20s) && rollResult.rolledD20s.length > 0
        ? rollResult.rolledD20s
        : [d20];
      const breakdown = formatAbilityCheckBreakdown({
        keptD20: rollResult.keptD20 ?? d20,
        rolledD20s,
        rollMode: rollResult.rollMode || rollMode,
        modifier: statMod,
        abilityLabel: statLabel,
      });

      const diceRolls = [
        {
          sides: 20,
          value: d20,
          rolls: rolledD20s,
          kept: rollResult.keptD20 ?? d20,
          rollMode: rollResult.rollMode || rollMode,
          type: `${statLabel} Check`,
          category: 'base',
        },
      ];

      window.dispatchEvent(
        new CustomEvent('damage-roll', {
          detail: {
            value: result,
            breakdown,
            source: rollMode === 'advantage'
              ? `${statLabel} with Advantage`
              : rollMode === 'disadvantage'
                ? `${statLabel} with Disadvantage`
                : statLabel,
            rollLabel: 'Stat Roll',
            critical: d20 === 20,
            fumble: d20 === 1,
            diceRolls,
          },
        })
      );

    },
    [diceFaceColor, form, handleCloseStats, isDocked, statMods]
  );


  const handleSavingThrow = useCallback(
    async (statKey) => {
      const statMod = statMods[statKey] ?? 0;
      const abilityLabel = ABILITY_LABELS[statKey] || STATS.find((stat) => stat.key === statKey)?.label || statKey.toUpperCase();
      const proficient = isSavingThrowProficient(form, statKey);
      const proficiency = proficient ? proficiencyBonus(getTotalLevel(form)) : 0;

      if (!isDocked) {
        handleCloseStats?.();
      }

      const { mode: rollMode, advantageSources, disadvantageSources } = resolveSavingThrowRollMode(form, statKey);
      const rollResult = await rollSkillWithDiceBox(statMod + proficiency, {
        diceColor: diceFaceColor,
        rollMode,
      });
      const { result, d20 } = rollResult;
      const rolledD20s = Array.isArray(rollResult.rolledD20s) && rollResult.rolledD20s.length > 0
        ? rollResult.rolledD20s
        : [d20];
      const actualRollMode = rollResult.rollMode || rollMode;
      const breakdown = formatSavingThrowBreakdown({
        keptD20: rollResult.keptD20 ?? d20,
        rolledD20s,
        rollMode: actualRollMode,
        modifier: statMod,
        proficiency,
        abilityLabel,
      });

      const diceRolls = [
        {
          sides: 20,
          value: d20,
          rolls: rolledD20s,
          kept: rollResult.keptD20 ?? d20,
          rollMode: actualRollMode,
          type: `${abilityLabel} Saving Throw`,
          rollType: 'savingThrow',
          category: 'base',
        },
      ];

      window.dispatchEvent(
        new CustomEvent('damage-roll', {
          detail: {
            value: result,
            breakdown,
            source: actualRollMode === 'advantage'
              ? `${abilityLabel} Saving Throw with Advantage`
              : actualRollMode === 'disadvantage'
                ? `${abilityLabel} Saving Throw with Disadvantage`
                : `${abilityLabel} Saving Throw`,
            rollLabel: 'Saving Throw',
            rollType: 'savingThrow',
            critical: d20 === 20,
            fumble: d20 === 1,
            diceRolls,
            advantageSources,
            disadvantageSources,
          },
        })
      );
    },
    [diceFaceColor, form, handleCloseStats, isDocked, statMods]
  );

  const dialogClassName = useMemo(() => {
    if (!isDocked) {
      return undefined;
    }

    const classes = ['docked-modal'];
    if (dockedSide) {
      classes.push(`docked-modal--${dockedSide}`);
    }
    classes.push('docked-modal--stats');
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

    handleCloseStats?.();
  }, [handleCloseStats, isDocked, onDockClose]);

  return (
    <>
      <Modal
        show={showStats}
        onHide={handleModalHide}
        size="xl"
        scrollable
        centered={!isDocked}
        className={modalClassName}
        backdrop={isDocked ? false : true}
        enforceFocus={!isDocked}
        restoreFocus={!isDocked}
        dialogClassName={dialogClassName}
      >
        <Modal.Header className="modal-header">
          <DockControls
            dockedSide={dockedSide}
            onDockChange={onDockChange}
            isDocked={isDocked}
          />
          <Modal.Title className="modal-title">Character Attribute Summary</Modal.Title>
        </Modal.Header>
        <Modal.Body className="stats-modal-body">
          <section className="attribute-codex__hero" aria-label="Character attribute overview">
            <div>
              <span className="attribute-codex__eyebrow">Adventurer&apos;s Codex</span>
              <h2>Know the strengths behind your legend.</h2>
              <p>Modifiers power your checks, saves, attacks, and class features.</p>
            </div>
            <div className="attribute-codex__proficiency"><span>Proficiency bonus</span><strong>{signed(abilitySummary.proficiency)}</strong></div>
          </section>
          <section className="attribute-summary-grid" aria-label="Attribute highlights">
            <div className="attribute-summary-card"><span>Highest attribute</span><strong>{ABILITY_LABELS[abilitySummary.highest.key]} {abilitySummary.highest.score}</strong></div>
            <div className="attribute-summary-card"><span>Highest modifier</span><strong>{signed(Math.max(...Object.values(statMods)))}</strong></div>
            <div className="attribute-summary-card"><span>Weakest attribute</span><strong>{ABILITY_LABELS[abilitySummary.lowest.key]} {abilitySummary.lowest.score}</strong></div>
            <div className="attribute-summary-card"><span>Average modifier</span><strong>{abilitySummary.average}</strong></div>
            <div className="attribute-summary-card"><span>Save proficiencies</span><strong>{abilitySummary.saves} / 6</strong></div>
          </section>
          <div className="stat-card-grid" aria-label="Ability scores">
            {STATS.map(({ key, label }) => (
              <article className={`stat-card stat-card--${ABILITY_CODEX[key].accent}`} key={key}>
                <div className="stat-card-header">
                  <div className="stat-card-title">
                    <span className="stat-card-key">{key.toUpperCase()}</span>
                    {label && <span className="stat-card-label">{label}</span>}
                  </div>
                  <div className="stat-card-actions">
                    <Button onClick={() => toggleFavorite(key)} variant="link" aria-label={`${favoriteStats.has(key) ? 'Remove' : 'Favorite'} ${label || key}`} aria-pressed={favoriteStats.has(key)} className={`stat-card-view stat-card-favorite ${favoriteStats.has(key) ? 'is-favorite' : ''}`}><i className={`${favoriteStats.has(key) ? 'fa-solid' : 'fa-regular'} fa-star`}></i></Button>
                    <Button
                      onClick={() => handleView(key)}
                      variant="link"
                      aria-label={`View ${label || key} details`}
                      className="stat-card-view"
                    >
                      <i className="fa-solid fa-eye"></i>
                    </Button>
                    <Button
                      onClick={() => handleRoll(key)}
                      variant="link"
                      aria-label={`Roll ${label || key} check`}
                      className="stat-card-view stat-card-roll"
                    >
                      <i className="fa-solid fa-dice-d20"></i>
                    </Button>
                    <Button
                      onClick={() => handleSavingThrow(key)}
                      variant="link"
                      aria-label={`Roll ${ABILITY_LABELS[key] || label || key} saving throw`}
                      className="stat-card-view stat-card-save"
                    >
                      <i className="fa-solid fa-heart"></i>
                    </Button>
                  </div>
                </div>
                <div className="stat-card-showcase">
                  <div className="stat-card-icon" aria-hidden="true"><i className={`fa-solid ${ABILITY_CODEX[key].icon}`}></i></div>
                  <div className="stat-card-modifier"><span aria-label="Modifier"></span><strong>{signed(statMods[key])}</strong></div>
                </div>
                <div className="stat-card-body">
                  <div className="stat-card-metric">
                    <span className="stat-card-metric-label">Total</span>
                    <span className="stat-card-metric-value">{computedStats[key]}</span>
                  </div>
                  <div className="stat-card-metric">
                    <span className="stat-card-metric-label">Modifier</span>
                    <span className="stat-card-metric-value">{statMods[key]}</span>
                  </div>
                  <span className="stat-card-tier">{scoreTier(computedStats[key])}</span>
                </div>
                <div className={`stat-card-save-status ${isSavingThrowProficient(form, key) ? 'is-proficient' : ''}`}><span>Saving Throw</span><strong>{signed(statMods[key] + (isSavingThrowProficient(form, key) ? abilitySummary.proficiency : 0))}</strong><em>{isSavingThrowProficient(form, key) ? '✓ Proficient' : 'Not Proficient'}</em></div>
                <div className="stat-card-skills"><span>Associated skills</span><p>{ABILITY_CODEX[key].skills.length ? ABILITY_CODEX[key].skills.join(' · ') : 'No associated skills'}</p></div>
              </article>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer className="modal-footer">
          <Button className="action-btn close-btn" onClick={handleModalHide}>Close</Button>
        </Modal.Footer>
      </Modal>
      <StatBreakdownModal
        show={showBreakdown}
        onHide={handleCloseBreakdown}
        statKey={selectedStat}
        breakdown={selectedStat ? breakdowns[selectedStat] : null}
        codex={selectedStat ? ABILITY_CODEX[selectedStat] : null}
        modifier={selectedStat ? statMods[selectedStat] : null}
        savingThrow={selectedStat ? statMods[selectedStat] + (isSavingThrowProficient(form, selectedStat) ? abilitySummary.proficiency : 0) : null}
        proficient={selectedStat ? isSavingThrowProficient(form, selectedStat) : false}
      />
    </>
  );
}
