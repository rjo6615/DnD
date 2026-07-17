import React, { useEffect, useState, useMemo, useCallback } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Button, Form, Tabs, Tab, Badge } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import UpcastModal from './UpcastModal';
import { normalizeEquipmentMap } from './equipmentNormalization';
import { isExplicitlyUnowned } from '../utils/derivedStats';
import DockControls from '../components/DockControls';

/**
 * Modal component allowing users to select spells for their character.
 * Spells are fetched from the server and filtered by class and level.
 */
// Full-caster spell slot table indexed by class level then spell level
const SLOT_TABLE = {
  0: Array(10).fill(0),
  1: [0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  2: [0, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  3: [0, 4, 2, 0, 0, 0, 0, 0, 0, 0],
  4: [0, 4, 3, 0, 0, 0, 0, 0, 0, 0],
  5: [0, 4, 3, 2, 0, 0, 0, 0, 0, 0],
  6: [0, 4, 3, 3, 0, 0, 0, 0, 0, 0],
  7: [0, 4, 3, 3, 1, 0, 0, 0, 0, 0],
  8: [0, 4, 3, 3, 2, 0, 0, 0, 0, 0],
  9: [0, 4, 3, 3, 3, 1, 0, 0, 0, 0],
  10: [0, 4, 3, 3, 3, 2, 0, 0, 0, 0],
  11: [0, 4, 3, 3, 3, 2, 1, 0, 0, 0],
  12: [0, 4, 3, 3, 3, 2, 1, 0, 0, 0],
  13: [0, 4, 3, 3, 3, 2, 1, 1, 0, 0],
  14: [0, 4, 3, 3, 3, 2, 1, 1, 0, 0],
  15: [0, 4, 3, 3, 3, 2, 1, 1, 1, 0],
  16: [0, 4, 3, 3, 3, 2, 1, 1, 1, 0],
  17: [0, 4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [0, 4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [0, 4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [0, 4, 3, 3, 3, 3, 2, 2, 1, 1],
};

// Number of cantrips known by class level
const CANTRIP_TABLE = {
  0: 0,
  1: 3,
  2: 3,
  3: 3,
  4: 4,
  5: 4,
  6: 4,
  7: 4,
  8: 4,
  9: 4,
  10: 5,
  11: 5,
  12: 5,
  13: 5,
  14: 5,
  15: 5,
  16: 5,
  17: 5,
  18: 5,
  19: 5,
  20: 5,
};

const SPELLCASTING_CLASSES = {
  bard: 'full',
  cleric: 'full',
  druid: 'full',
  sorcerer: 'full',
  warlock: 'full',
  wizard: 'full',
  paladin: 'half',
  ranger: 'half',
};


const SCHOOL_ICONS = {
  abjuration: 'fa-shield-halved',
  conjuration: 'fa-circle-nodes',
  divination: 'fa-eye',
  enchantment: 'fa-heart',
  evocation: 'fa-fire-flame-curved',
  illusion: 'fa-masks-theater',
  necromancy: 'fa-skull',
  transmutation: 'fa-wand-magic-sparkles',
};

const CLASS_ICONS = {
  bard: 'fa-music',
  cleric: 'fa-sun',
  druid: 'fa-leaf',
  paladin: 'fa-shield-heart',
  ranger: 'fa-feather',
  sorcerer: 'fa-bolt',
  warlock: 'fa-hand-sparkles',
  wizard: 'fa-hat-wizard',
};

const normalizeToken = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const spellIconClass = (spell) => {
  const text = `${spell?.name || ''} ${spell?.school || ''} ${spell?.description || ''}`.toLowerCase();
  if (/fire|flame|burn|scorch/.test(text)) return 'fa-fire-flame-curved';
  if (/ice|cold|frost|sleet/.test(text)) return 'fa-snowflake';
  if (/heal|cure|restore|reviv/.test(text)) return 'fa-hand-holding-heart';
  if (/poison|acid|venom/.test(text)) return 'fa-flask-vial';
  if (/lightning|thunder|storm|bolt/.test(text)) return 'fa-bolt-lightning';
  if (/charm|suggest|friend|dominat/.test(text)) return 'fa-heart';
  if (/dead|death|necrotic|zombie/.test(text)) return 'fa-skull';
  if (/invisible|illusion|mirror|phantom/.test(text)) return 'fa-masks-theater';
  return SCHOOL_ICONS[normalizeToken(spell?.school)] || 'fa-sparkles';
};

const summarizeSpell = (description = '') => {
  const clean = String(description || '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'An arcane entry from the RealmTracker archives.';
  return clean.length > 150 ? `${clean.slice(0, 147)}…` : clean;
};

const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const createEmptyStatMap = () => ({
  str: 0,
  dex: 0,
  con: 0,
  int: 0,
  wis: 0,
  cha: 0,
});

const normalizeClassName = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const spellSupportsClass = (spell, className) => {
  const normalized = normalizeClassName(className);
  if (!normalized) {
    return false;
  }
  const classes = Array.isArray(spell?.classes) ? spell.classes : [];
  return classes.some((cls) => normalizeClassName(cls) === normalized);
};

const aggregateStatEffects = (entries) =>
  (Array.isArray(entries) ? entries : []).reduce(
    (acc, el) => {
      if (isExplicitlyUnowned(el)) {
        return acc;
      }
      STAT_KEYS.forEach((key) => {
        const bonusValue = Number(el?.statBonuses?.[key] || 0);
        if (!Number.isNaN(bonusValue)) {
          acc.bonuses[key] += bonusValue;
        }
        const overrideRaw = el?.statOverrides?.[key];
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

export default function SpellSelector({
  form,
  show,
  handleClose,
  onSpellsChange,
  onCastSpell,
  availableSlots = { regular: {}, warlock: {} },
  isDocked = false,
  dockedSide = null,
  onDockClose,
  onDockChange,
}) {
  const params = useParams();

  const hasEquipment = typeof form?.equipment === 'object' && form.equipment !== null;
  const normalizedEquipment = useMemo(
    () => normalizeEquipmentMap(form.equipment),
    [form.equipment]
  );
  const equippedItems = useMemo(() => {
    if (hasEquipment) {
      return Object.values(normalizedEquipment).filter(Boolean);
    }
    return Array.isArray(form.item) ? form.item.filter(Boolean) : [];
  }, [form.item, hasEquipment, normalizedEquipment]);

  const { bonuses: equipmentBonuses, overrides: equipmentOverrides } = useMemo(
    () => aggregateStatEffects(equippedItems),
    [equippedItems]
  );

  const totalLevel = useMemo(
    () =>
      Array.isArray(form.occupation)
        ? form.occupation.reduce(
            (total, el) => total + Number(el.Level),
            0
          )
        : 0,
    [form.occupation]
  );

  const getAvailableLevels = useCallback((effectiveLevel, casterProgression) => {
    const slotRow = SLOT_TABLE[effectiveLevel] || [];
    const options = [];
    if (
      casterProgression === 'full' &&
      (CANTRIP_TABLE[effectiveLevel] || 0) > 0
    )
      options.push(0);
    slotRow.forEach((slots, lvl) => {
      if (lvl > 0 && slots > 0) options.push(lvl);
    });
    return options;
  }, []);

  const classesInfo = useMemo(() => {
    return (form.occupation || [])
      .map((o) => {
        const name = o.Name || o.Occupation;
        const level = Number(o.Level) || 0;
        const key = (name || '').toLowerCase();
        const casterProgression = SPELLCASTING_CLASSES[key] || 'none';
        let effectiveLevel = 0;
        if (casterProgression === 'full') {
          effectiveLevel = level;
        } else if (casterProgression === 'half') {
          effectiveLevel = level === 1 ? 0 : Math.ceil(level / 2);
        }
        return { name, level, casterProgression, effectiveLevel };
      })
      .filter((o) => o.effectiveLevel >= 1);
  }, [form.occupation]);

  const levelOptions = useMemo(
    () =>
      classesInfo.reduce((acc, { name, effectiveLevel, casterProgression }) => {
        acc[name] = getAvailableLevels(effectiveLevel, casterProgression);
        return acc;
      }, {}),
    [classesInfo, getAvailableLevels]
  );

  const initialLevels = useMemo(
    () =>
      classesInfo.reduce((acc, { name }) => {
        const options = levelOptions[name] || [];
        const first =
          options.find((lvl) => lvl > 0) ?? options[0] ?? 0;
        acc[name] = first;
        return acc;
      }, {}),
    [classesInfo, levelOptions]
  );

  const [selectedLevels, setSelectedLevels] = useState(initialLevels);
  const [allSpells, setAllSpells] = useState({});
  const [selectedSpells, setSelectedSpells] = useState(
    (form.spells || []).map((s) => (typeof s === 'string' ? s : s.name))
  );
  // Track which class or caster each selected spell belongs to so it can be
  // persisted along with the spell. This is needed for grouping in
  // PlayerTurnActions.
  const [spellCasters, setSpellCasters] = useState(
    (form.spells || []).reduce((acc, s) => {
      if (s && typeof s !== 'string') {
        const caster = s.casterType || s.caster;
        if (caster) acc[s.name] = caster;
      }
      return acc;
    }, {})
  );
  const [pointsLeft, setPointsLeft] = useState({});
  const [activeClass, setActiveClass] = useState(classesInfo[0]?.name || '');
  const [error, setError] = useState(null);
  const [viewSpell, setViewSpell] = useState(null);
  const [spellsKnown, setSpellsKnown] = useState({});
  const [showUpcast, setShowUpcast] = useState(false);
  const [pendingSpell, setPendingSpell] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [castingFilter, setCastingFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState('all');
  const [traitFilters, setTraitFilters] = useState({
    concentration: false,
    ritual: false,
    cantrip: false,
    known: false,
  });

  const getScaledDamage = useCallback(
    (spell) => {
      let dmg = spell.damage;
      if (spell.scaling) {
        const tiers = Object.keys(spell.scaling)
          .map(Number)
          .sort((a, b) => a - b);
        tiers.forEach((tier) => {
          if (totalLevel >= tier) dmg = spell.scaling[tier];
        });
      }
      return dmg;
    },
    [totalLevel]
  );

  const handleUpcastSelect = (level, slotType) => {
    if (!pendingSpell) return;
    const diff = level - (pendingSpell.level || 0);
    let extra;
    if (diff > 0 && pendingSpell.higherLevels) {
      const incMatch = pendingSpell.higherLevels.match(/(\d+)d(\d+)/);
      if (incMatch) {
        extra = {
          count: parseInt(incMatch[1], 10),
          sides: parseInt(incMatch[2], 10),
        };
      }
    }
    const damage = getScaledDamage(pendingSpell);
    onCastSpell?.({
      level,
      damage,
      extraDice: extra,
      levelsAbove: diff > 0 ? diff : 0,
      slotType,
      castingTime: pendingSpell.castingTime,
      name: pendingSpell.name,
    });
    setShowUpcast(false);
    setPendingSpell(null);
    handleModalHide();
  };

  const chaMod = useMemo(() => {
    const featBonus = (form.feat || []).reduce(
      (sum, el) => sum + Number(el.cha || 0),
      0
    );
    const raceBonus = Number(form.race?.abilities?.cha || 0);
    const baseScore =
      Number(form.cha || 0) + equipmentBonuses.cha + featBonus + raceBonus;
    const overrideValue = equipmentOverrides.cha;
    const finalScore =
      overrideValue !== undefined &&
      overrideValue !== null &&
      overrideValue > baseScore
        ? overrideValue
        : baseScore;
    return Math.floor((finalScore - 10) / 2);
  }, [equipmentBonuses, equipmentOverrides, form.cha, form.feat, form.race]);

  const wisMod = useMemo(() => {
    const featBonus = (form.feat || []).reduce(
      (sum, el) => sum + Number(el.wis || 0),
      0
    );
    const raceBonus = Number(form.race?.abilities?.wis || 0);
    const baseScore =
      Number(form.wis || 0) + equipmentBonuses.wis + featBonus + raceBonus;
    const overrideValue = equipmentOverrides.wis;
    const finalScore =
      overrideValue !== undefined &&
      overrideValue !== null &&
      overrideValue > baseScore
        ? overrideValue
        : baseScore;
    return Math.floor((finalScore - 10) / 2);
  }, [equipmentBonuses, equipmentOverrides, form.feat, form.race, form.wis]);

  useEffect(() => {
    apiFetch('/spells')
      .then((res) => res.json())
      .then((data) => setAllSpells(data))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    setSelectedSpells(
      (form.spells || []).map((s) => (typeof s === 'string' ? s : s.name))
    );
    setSpellCasters(
      (form.spells || []).reduce((acc, s) => {
        if (s && typeof s !== 'string') {
          const caster = s.casterType || s.caster;
          if (caster) acc[s.name] = caster;
        }
        return acc;
      }, {})
    );
  }, [form.spells]);

  useEffect(() => {
    setSelectedLevels(initialLevels);
    setActiveClass(classesInfo[0]?.name || '');
  }, [initialLevels, classesInfo]);

  useEffect(() => {
    const fetchSpellsKnown = async () => {
      const result = {};
      await Promise.all(
        classesInfo.map(async ({ name, level }) => {
          try {
            const abilityMod =
              ['cleric', 'druid'].includes(name.toLowerCase()) ? wisMod : chaMod;
            const res = await apiFetch(
              `/classes/${name.toLowerCase()}/features/${level}?abilityMod=${abilityMod}`
            );
            if (res.ok) {
              const data = await res.json();
              if (typeof data.spellsKnown === 'number') {
                result[name] = data.spellsKnown;
              }
            }
          } catch (err) {
            setError(err.message);
          }
        })
      );
      setSpellsKnown(result);
    };
    fetchSpellsKnown();
  }, [classesInfo, chaMod, wisMod]);

  const spellList = useMemo(() => Object.values(allSpells), [allSpells]);

  const filterOptions = useMemo(() => {
    const schools = new Set();
    const castingTimes = new Set();
    const ranges = new Set();
    spellList.forEach((spell) => {
      if (spell.school) schools.add(spell.school);
      if (spell.castingTime) castingTimes.add(spell.castingTime);
      if (spell.range) ranges.add(spell.range);
    });
    return {
      schools: Array.from(schools).sort(),
      castingTimes: Array.from(castingTimes).sort(),
      ranges: Array.from(ranges).sort(),
    };
  }, [spellList]);

  const selectedSpellSet = useMemo(() => new Set(selectedSpells), [selectedSpells]);

  const filteredSpellsForClass = useCallback(
    (cls) => {
      const term = searchTerm.trim().toLowerCase();
      return spellList.filter((spell) => {
        if (!spellSupportsClass(spell, cls)) return false;
        if (spell.level !== Number(selectedLevels[cls])) return false;
        if (term) {
          const haystack = `${spell.name || ''} ${spell.school || ''} ${spell.description || ''}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        if (schoolFilter !== 'all' && spell.school !== schoolFilter) return false;
        if (castingFilter !== 'all' && spell.castingTime !== castingFilter) return false;
        if (rangeFilter !== 'all' && spell.range !== rangeFilter) return false;
        const duration = String(spell.duration || '').toLowerCase();
        if (traitFilters.concentration && !duration.includes('concentration')) return false;
        if (traitFilters.ritual && !spell.ritual) return false;
        if (traitFilters.cantrip && spell.level !== 0) return false;
        if (traitFilters.known && !selectedSpellSet.has(spell.name)) return false;
        return true;
      });
    },
    [castingFilter, rangeFilter, schoolFilter, searchTerm, selectedLevels, selectedSpellSet, spellList, traitFilters]
  );

  function spellsForClass(cls) {
    return filteredSpellsForClass(cls);
  }

  useEffect(() => {
    const newPoints = {};
    classesInfo.forEach(({ name, effectiveLevel }) => {
      const selectedLevel = Number(selectedLevels[name]);
      const total =
        selectedLevel === 0
          ? CANTRIP_TABLE[effectiveLevel] || 0
          : spellsKnown[name] ?? Infinity;
      const count = selectedSpells.reduce((sum, spellName) => {
        const info = Object.values(allSpells).find((s) => s.name === spellName);
        return info &&
          spellSupportsClass(info, name) &&
          (selectedLevel === 0 ? info.level === 0 : info.level > 0)
          ? sum + 1
          : sum;
      }, 0);
      newPoints[name] =
        total === Infinity ? Infinity : Math.max(0, total - count);
    });
    setPointsLeft(newPoints);
  }, [selectedLevels, selectedSpells, allSpells, classesInfo, spellsKnown]);

  function toggleSpell(name, caster) {
    const isSelected = selectedSpells.includes(name);
    const updatedSpells = isSelected
      ? selectedSpells.filter((s) => s !== name)
      : [...selectedSpells, name];
    const updatedCasters = { ...spellCasters };
    if (isSelected) {
      delete updatedCasters[name];
    } else {
      updatedCasters[name] = caster;
    }
    setSelectedSpells(updatedSpells);
    setSpellCasters(updatedCasters);
    saveSpells(updatedSpells, updatedCasters);
  }

  const handleModalHide = useCallback(() => {
    if (isDocked) {
      if (typeof onDockClose === 'function') {
        onDockClose();
      }
      return;
    }

    handleClose?.();
  }, [handleClose, isDocked, onDockClose]);

  const castSpell = useCallback(
    (spell, isSelected) => {
      if (!isSelected) return;
      if (spell.higherLevels) {
        setPendingSpell(spell);
        setShowUpcast(true);
      } else {
        const damage = getScaledDamage(spell);
        onCastSpell?.({
          level: spell.level,
          damage,
          castingTime: spell.castingTime,
          name: spell.name,
        });
        handleModalHide();
      }
    },
    [getScaledDamage, handleModalHide, onCastSpell]
  );

  const FilterPanel = ({ cls }) => (
    <aside className="spellbook-sidebar" aria-label="Spell filters">
      <div className="spellbook-filter-group spellbook-filter-group--classes">
        <span className="spellbook-filter-label">Class</span>
        <div className="spellbook-class-list" role="list">
          {classesInfo.map(({ name }) => {
            const key = normalizeToken(name);
            return (
              <button
                type="button"
                key={name}
                className={`spellbook-class-pill${activeClass === name ? ' is-active' : ''}`}
                onClick={() => setActiveClass(name)}
                aria-pressed={activeClass === name}
              >
                <i className={`fa-solid ${CLASS_ICONS[key] || 'fa-book-sparkles'}`} aria-hidden="true" />
                <span>{name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Form.Group className="spellbook-filter-group">
        <Form.Label htmlFor={`spellLevel-${cls}`} className="spellbook-filter-label">Level</Form.Label>
        <Form.Select
          id={`spellLevel-${cls}`}
          value={selectedLevels[cls]}
          onChange={(e) => setSelectedLevels((prev) => ({ ...prev, [cls]: Number(e.target.value) }))}
          className="spellbook-select"
        >
          {(levelOptions[cls] || []).map((lvl) => (
            <option key={lvl} value={lvl}>{lvl}</option>
          ))}
        </Form.Select>
      </Form.Group>

      <Form.Group className="spellbook-filter-group">
        <Form.Label className="spellbook-filter-label">School</Form.Label>
        <Form.Select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)} className="spellbook-select" aria-label="Spell school">
          <option value="all">All Schools</option>
          {filterOptions.schools.map((school) => <option key={school} value={school}>{school}</option>)}
        </Form.Select>
      </Form.Group>

      <Form.Group className="spellbook-filter-group">
        <Form.Label className="spellbook-filter-label">Casting Time</Form.Label>
        <Form.Select value={castingFilter} onChange={(e) => setCastingFilter(e.target.value)} className="spellbook-select" aria-label="Casting time">
          <option value="all">Any Time</option>
          {filterOptions.castingTimes.map((time) => <option key={time} value={time}>{time}</option>)}
        </Form.Select>
      </Form.Group>

      <Form.Group className="spellbook-filter-group">
        <Form.Label className="spellbook-filter-label">Range</Form.Label>
        <Form.Select value={rangeFilter} onChange={(e) => setRangeFilter(e.target.value)} className="spellbook-select" aria-label="Range">
          <option value="all">Any Range</option>
          {filterOptions.ranges.map((range) => <option key={range} value={range}>{range}</option>)}
        </Form.Select>
      </Form.Group>

      <div className="spellbook-filter-group spellbook-rune-toggles" aria-label="Spell traits">
        {[['concentration', 'Concentration'], ['ritual', 'Ritual'], ['cantrip', 'Cantrip'], ['known', 'Known only']].map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={`spellbook-rune-toggle${traitFilters[key] ? ' is-active' : ''}`}
            onClick={() => setTraitFilters((prev) => ({ ...prev, [key]: !prev[key] }))}
            aria-pressed={traitFilters[key]}
          >
            {label}
          </button>
        ))}
      </div>
    </aside>
  );

  const SpellInspector = ({ spell, cls }) => {
    const activeSpell = spell && spellSupportsClass(spell, cls) ? spell : null;
    if (!activeSpell) {
      return <aside className="spellbook-inspector spellbook-inspector--empty">Select a spell to open its illuminated page.</aside>;
    }
    const isSelected = selectedSpellSet.has(activeSpell.name);
    const disableSelection = !isSelected && (pointsLeft[cls] || 0) <= 0;
    return (
      <aside className="spellbook-inspector" aria-label="Selected spell details">
        <div className="spellbook-art"><i className={`fa-solid ${spellIconClass(activeSpell)}`} aria-hidden="true" /></div>
        <div className="spellbook-inspector-heading">
          <span className="spell-level-badge">Level {activeSpell.level}</span>
          <h3>{activeSpell.name}</h3>
          <p>{activeSpell.school || 'Unknown School'}</p>
        </div>
        <div className="spellbook-stat-grid">
          {['castingTime','range','duration','damage'].map((key) => activeSpell[key] ? <div key={key}><span>{key === 'castingTime' ? 'Casting' : key}</span><strong>{activeSpell[key]}</strong></div> : null)}
          {activeSpell.components?.length ? <div><span>Components</span><strong>{activeSpell.components.join(', ')}</strong></div> : null}
        </div>
        <p className="spellbook-description">{activeSpell.description || 'No description recorded.'}</p>
        {activeSpell.higherLevels ? <p className="spellbook-higher"><strong>Higher Levels.</strong> {activeSpell.higherLevels}</p> : null}
        <div className="spellbook-inspector-actions">
          <Button className="spellbook-learn-btn" disabled={disableSelection} onClick={() => toggleSpell(activeSpell.name, cls)}>{isSelected ? 'Remove' : 'Learn'}</Button>
          <Button className="spellbook-preview-btn" disabled={!isSelected} onClick={() => castSpell(activeSpell, isSelected)}><i className="fa-solid fa-wand-sparkles" /> Preview</Button>
        </div>
      </aside>
    );
  };

  const renderSpellCards = (cls) => {
    const spells = spellsForClass(cls);
    if (!spells.length) {
      return <div className="spellbook-empty">No spells match these runes.</div>;
    }

    return (
      <div className="spell-card-grid spellbook-card-grid">
        {spells.map((spell) => {
          const isSelected = selectedSpellSet.has(spell.name);
          const disableSelection = !isSelected && (pointsLeft[cls] || 0) <= 0;
          const duration = String(spell.duration || '');

          return (
            <article key={spell.name} className={`spell-card spellbook-card${isSelected ? ' is-selected' : ''}`} tabIndex={0} onClick={() => setViewSpell(spell)} onKeyDown={(e) => { if (e.key === 'Enter') setViewSpell(spell); }}>
              <div className="spellbook-card-topline">
                <div className="spellbook-icon"><i className={`fa-solid ${spellIconClass(spell)}`} aria-hidden="true" /></div>
                <Badge className="spell-level-badge">{spell.level === 0 ? 'Cantrip' : `Lv ${spell.level}`}</Badge>
              </div>
              <div className="spell-card-header">
                <Form.Check
                  id={`spell-${cls}-${spell.name}`}
                  type="checkbox"
                  label={spell.name}
                  checked={isSelected}
                  disabled={disableSelection}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSpell(spell.name, cls)}
                />
                <div className="spell-card-actions">
                  <Button variant="link" aria-label={`View ${spell.name}`} onClick={(e) => { e.stopPropagation(); setViewSpell(spell); }}><i className="fa-solid fa-eye"></i></Button>
                  <Button variant="link" aria-label={`Preview ${spell.name}`} disabled={!isSelected} className={!isSelected ? 'text-secondary' : ''} onClick={(e) => { e.stopPropagation(); castSpell(spell, isSelected); }}><i className="fa-solid fa-wand-sparkles" /></Button>
                </div>
              </div>
              <div className="spell-card-details">
                <span><strong>School:</strong> {spell.school}</span>
                <span><strong>Casting Time:</strong> {spell.castingTime}</span>
                <span><strong>Range:</strong> {spell.range}</span>
                <span><strong>Duration:</strong> {spell.duration}</span>
              </div>
              <p className="spellbook-card-preview">{summarizeSpell(spell.description)}</p>
              <div className="spellbook-card-traits">
                {duration.toLowerCase().includes('concentration') && <span>Concentration</span>}
                {spell.ritual && <span>Ritual</span>}
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  async function saveSpells(
    spells = selectedSpells,
    casters = spellCasters
  ) {
    try {
      const currentPoints = classesInfo.reduce((sum, { name, effectiveLevel }) => {
        const selectedLevel = Number(selectedLevels[name]);
        const total =
          selectedLevel === 0
            ? CANTRIP_TABLE[effectiveLevel] || 0
            : spellsKnown[name] ?? Infinity;
        const count = spells.reduce((acc, spellName) => {
          const info = Object.values(allSpells).find((s) => s.name === spellName);
          return info &&
            spellSupportsClass(info, name) &&
            (selectedLevel === 0 ? info.level === 0 : info.level > 0)
            ? acc + 1
            : acc;
        }, 0);
        const remaining =
          total === Infinity ? 0 : Math.max(0, total - count);
        return sum + remaining;
      }, 0);

      const selectedSpellObjects = spells.map((name) => {
        const info = Object.values(allSpells).find((s) => s.name === name) || {};
        return {
          name,
          level: info.level || 0,
          damage: info.damage || '',
          castingTime: info.castingTime || '',
          range: info.range || '',
          duration: info.duration || '',
          casterType: casters[name] || info.classes?.[0] || '',
          higherLevels: info.higherLevels,
          scaling: info.scaling,
        };
      });
      const res = await apiFetch(`/characters/${params.id}/spells`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spells: selectedSpellObjects,
          spellPoints: currentPoints,
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to save spells');
      }
      onSpellsChange?.(selectedSpellObjects, currentPoints);
    } catch (err) {
      setError(err.message);
    }
  }

  const dialogClassName = useMemo(() => {
    if (!isDocked) {
      return undefined;
    }

    const classes = ['docked-modal'];
    if (dockedSide) {
      classes.push(`docked-modal--${dockedSide}`);
    }
    classes.push('docked-modal--spells');
    return classes.join(' ');
  }, [isDocked, dockedSide]);

  const modalClassName = useMemo(() => {
    const classes = ['dnd-modal', 'modern-modal'];
    if (isDocked) {
      classes.push('docked-modal-container');
    }
    return classes.join(' ');
  }, [isDocked]);

  return (
    <>
      <Modal
        className={modalClassName}
        show={show}
        onHide={handleModalHide}
        size="lg"
        centered={!isDocked}
        backdrop={isDocked ? false : true}
        enforceFocus={!isDocked}
        restoreFocus={!isDocked}
        dialogClassName={dialogClassName}
      >
        <Card className="modern-card">
          <Card.Header className="modal-header">
            <DockControls
              dockedSide={dockedSide}
              onDockChange={onDockChange}
              isDocked={isDocked}
            />
            <Card.Title className="modal-title">Spells</Card.Title>
          </Card.Header>
          <Card.Body className="spellbook-modal-body">
            {error && <div className="text-danger mb-2">{error}</div>}
            {classesInfo.length === 0 ? (
              <div className="text-light">No spellcasting classes available.</div>
            ) : (
              <div className="spellbook-shell">
                <div className="spellbook-hero">
                  <div>
                    <span className="spellbook-kicker">Arcane Library</span>
                    <h2>Spell Selection</h2>
                    <p>Search, filter, learn, and preview your character's magic without leaving the tome.</p>
                  </div>
                  <div className="spellbook-search-wrap">
                    <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                    <Form.Control
                      type="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search the stacks..."
                      aria-label="Search spells"
                      className="spellbook-search"
                    />
                  </div>
                  <div className={`spellbook-points ${(pointsLeft[activeClass] || 0) <= 1 ? 'is-low' : ''}`}>
                    <span>Spell Points Remaining</span>
                    <strong>{pointsLeft[activeClass] === Infinity ? '∞' : pointsLeft[activeClass] || 0}</strong>
                    <small>{activeClass || 'Class'} • Level {selectedLevels[activeClass] ?? '—'}</small>
                  </div>
                </div>

                <Tabs activeKey={activeClass} onSelect={(k) => setActiveClass(k || '')} className="spellbook-tabs mb-3">
                  {classesInfo.map(({ name }) => (
                    <Tab eventKey={name} title={name} key={name}>
                      <div className="spellbook-layout">
                        <FilterPanel cls={name} />
                        <main className="spellbook-library" aria-label={`${name} spell library`}>
                          <div className="spellbook-library-header">
                            <div>
                              <span className="points-label">Points Left:</span>
                              <span className="points-value">{pointsLeft[name] === Infinity ? '∞' : pointsLeft[name] || 0}</span>
                            </div>
                            <span>{spellsForClass(name).length} spells discovered</span>
                          </div>
                          {renderSpellCards(name)}
                        </main>
                        <SpellInspector spell={viewSpell} cls={name} />
                      </div>
                    </Tab>
                  ))}
                </Tabs>
              </div>
            )}
          </Card.Body>
          <Card.Footer className="modal-footer">
            <Button
              className="action-btn close-btn"
              onClick={handleModalHide}
            >
              Close
            </Button>
          </Card.Footer>
        </Card>
      </Modal>
      <UpcastModal
        show={showUpcast}
        onHide={() => {
          setShowUpcast(false);
          setPendingSpell(null);
        }}
        baseLevel={pendingSpell?.level}
        slots={availableSlots}
        higherLevels={pendingSpell?.higherLevels}
        onSelect={handleUpcastSelect}
      />
    </>
  );
}
