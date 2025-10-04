import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Modal, Card, Button, Spinner } from 'react-bootstrap';
import apiFetch from '../../../utils/apiFetch';
import FeatureModal from './FeatureModal';
import UpcastModal from './UpcastModal';
import actionSurgeIcon from '../../../images/action-surge-icon.png';
import largeFormIcon from '../../../images/large-form-icon.png';
import dragonWingsIcon from '../../../images/dragon-wings-icon.png';
import adrenalineRushIcon from '../../../images/adrenaline-rush.png';
import speakWithAnimalIcon from '../../../images/speak-with-animal.png';
import proficiencyBonus from '../../../utils/proficiencyBonus';

const LINEAGE_SPELLS = {
  'elf-drow-dancing-lights': {
    spellName: 'Dancing Lights',
    baseLevel: 0,
    castingTime: '1 action',
  },
  'elf-drow-faerie-fire': {
    spellName: 'Faerie Fire',
    maxUses: 1,
    baseLevel: 1,
    castingTime: '1 action',
  },
  'elf-drow-darkness': {
    spellName: 'Darkness',
    maxUses: 1,
    baseLevel: 2,
    castingTime: '1 action',
  },
  'elf-high-prestidigitation': {
    spellName: 'Prestidigitation',
    baseLevel: 0,
    castingTime: '1 action',
  },
  'elf-high-detect-magic': {
    spellName: 'Detect Magic',
    maxUses: 1,
    baseLevel: 1,
    castingTime: '1 action',
  },
  'elf-high-misty-step': {
    spellName: 'Misty Step',
    maxUses: 1,
    baseLevel: 2,
    castingTime: '1 bonus action',
  },
  'elf-wood-druidcraft': {
    spellName: 'Druidcraft',
    baseLevel: 0,
    castingTime: '1 action',
  },
  'elf-wood-longstrider': {
    spellName: 'Longstrider',
    maxUses: 1,
    baseLevel: 1,
    castingTime: '1 action',
  },
  'elf-wood-pass-without-trace': {
    spellName: 'Pass without Trace',
    maxUses: 1,
    baseLevel: 2,
    castingTime: '1 action',
  },
  'tiefling-abyssal-ray-of-sickness': {
    spellName: 'Ray of Sickness',
    maxUses: 1,
    baseLevel: 1,
    castingTime: '1 action',
  },
  'tiefling-abyssal-hold-person': {
    spellName: 'Hold Person',
    maxUses: 1,
    baseLevel: 2,
    castingTime: '1 action',
  },
  'tiefling-chthonic-darkness': {
    spellName: 'Darkness',
    maxUses: 1,
    baseLevel: 2,
    castingTime: '1 action',
  },
  'tiefling-chthonic-bestow-curse': {
    spellName: 'Bestow Curse',
    maxUses: 1,
    baseLevel: 3,
    castingTime: '1 action',
  },
  'tiefling-infernal-hellish-rebuke': {
    spellName: 'Hellish Rebuke',
    maxUses: 1,
    baseLevel: 1,
    castingTime: 'Reaction',
  },
  'tiefling-infernal-fireball': {
    spellName: 'Fireball',
    maxUses: 1,
    baseLevel: 3,
    castingTime: '1 action',
  },
};

const LIMITED_USE_LINEAGE_SPELL_IDS = Object.entries(LINEAGE_SPELLS)
  .filter(([, config]) => Number.isFinite(config?.maxUses) && config.maxUses > 0)
  .map(([spellId]) => spellId);

const LIMITED_USE_LINEAGE_SPELL_IDS_SET = new Set(
  LIMITED_USE_LINEAGE_SPELL_IDS
);

export default function Features({
  form,
  showFeatures,
  handleCloseFeatures,
  onActionSurge,
  onAdrenalineRush,
  onLargeForm,
  onDraconicFlight,
  onCastSpell,
  longRestCount,
  shortRestCount,
  availableSlots = { regular: {}, warlock: {} },
  isDocked = false,
  dockedSide = null,
  onDockClose,
  characterId,
}) {
  const [features, setFeatures] = useState([]);
  const [modalFeature, setModalFeature] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [surgeUsed, setSurgeUsed] = useState(false);
  const [largeFormUsed, setLargeFormUsed] = useState(false);
  const [draconicFlightUsed, setDraconicFlightUsed] = useState(false);
  const [adrenalineRushUses, setAdrenalineRushUses] = useState(0);
  const [speakWithAnimalsUses, setSpeakWithAnimalsUses] = useState(0);
  const [lineageSpellUses, setLineageSpellUses] = useState(() => {
    return LIMITED_USE_LINEAGE_SPELL_IDS.reduce((acc, spellId) => {
      acc[spellId] = 0;
      return acc;
    }, {});
  });
  const [showUpcast, setShowUpcast] = useState(false);
  const [pendingSpell, setPendingSpell] = useState(null);
  const hasInitializedRestRef = useRef(false);
  const speakWithAnimalsUsesRef = useRef(speakWithAnimalsUses);
  const lineageSpellUsesRef = useRef(lineageSpellUses);

  const totalCharacterLevel = useMemo(() => {
    if (!Array.isArray(form?.occupation)) return 0;
    return form.occupation.reduce((sum, occ) => {
      if (typeof occ !== 'object' || occ === null) return sum;
      const levelValue =
        Number(occ.Level ?? occ.level ?? occ.Levels ?? occ.levels ?? 0) || 0;
      return sum + levelValue;
    }, 0);
  }, [form?.occupation]);

  const profBonus = useMemo(() => {
    const provided = Number(form?.proficiencyBonus);
    if (Number.isFinite(provided) && provided > 0) {
      return provided;
    }
    return proficiencyBonus(totalCharacterLevel);
  }, [form?.proficiencyBonus, totalCharacterLevel]);

  const adrenalineRushMaxUses = useMemo(() => {
    return Number.isFinite(profBonus) && profBonus > 0
      ? Math.floor(profBonus)
      : 0;
  }, [profBonus]);

  const { gnomeLineage, gnomeLineageKey, gnomeLineageAbility } = useMemo(() => {
    const race = form?.race || {};
    const lineageFromForm =
      typeof form?.gnomeLineage === 'object' ? form.gnomeLineage : null;
    const lineageKeyFromForm =
      typeof form?.gnomeLineageKey === 'string' ? form.gnomeLineageKey : '';
    const abilityFromForm =
      typeof form?.gnomeLineageAbility === 'string'
        ? form.gnomeLineageAbility
        : '';

    let lineage = lineageFromForm;
    let lineageKey = lineageKeyFromForm;
    if (!lineage) {
      if (lineageKey && race?.gnomeLineages?.[lineageKey]) {
        lineage = race.gnomeLineages[lineageKey];
      } else if (race?.selectedAncestry) {
        lineage = race.selectedAncestry;
        lineageKey =
          typeof race?.selectedAncestryKey === 'string'
            ? race.selectedAncestryKey
            : '';
      } else if (
        typeof race?.selectedAncestryKey === 'string' &&
        race?.gnomeLineages?.[race.selectedAncestryKey]
      ) {
        lineage = race.gnomeLineages[race.selectedAncestryKey];
        lineageKey = race.selectedAncestryKey;
      }
    }

    let ability = abilityFromForm;
    if (!ability) {
      ability =
        typeof race?.selectedLineageAbility === 'string'
          ? race.selectedLineageAbility
          : '';
    }
    if (!ability && lineage?.spellcastingAbilities?.length) {
      ability = lineage.spellcastingAbilities[0];
    }

    return { gnomeLineage: lineage, gnomeLineageKey: lineageKey, gnomeLineageAbility: ability };
  }, [form?.gnomeLineage, form?.gnomeLineageAbility, form?.gnomeLineageKey, form?.race]);

  const gnomeSpellAbilityLabel = useMemo(() => {
    if (typeof gnomeLineageAbility !== 'string') return '';
    return gnomeLineageAbility.trim();
  }, [gnomeLineageAbility]);

  const { tieflingLegacy, tieflingLegacyKey, tieflingLegacyAbility } = useMemo(() => {
    const race = form?.race || {};
    const legacyFromForm =
      typeof form?.tieflingLegacy === 'object' ? form.tieflingLegacy : null;
    const legacyKeyFromForm =
      typeof form?.tieflingLegacyKey === 'string' ? form.tieflingLegacyKey : '';
    const abilityFromForm =
      typeof form?.tieflingLegacyAbility === 'string'
        ? form.tieflingLegacyAbility
        : '';

    let legacy = legacyFromForm;
    let legacyKey = legacyKeyFromForm;
    if (!legacy) {
      if (legacyKey && race?.fiendishLegacies?.[legacyKey]) {
        legacy = race.fiendishLegacies[legacyKey];
      } else if (race?.selectedAncestry && race?.fiendishLegacies) {
        legacy = race.selectedAncestry;
        legacyKey =
          typeof race?.selectedAncestryKey === 'string'
            ? race.selectedAncestryKey
            : '';
      } else if (
        typeof race?.selectedAncestryKey === 'string' &&
        race?.fiendishLegacies?.[race.selectedAncestryKey]
      ) {
        legacy = race.fiendishLegacies[race.selectedAncestryKey];
        legacyKey = race.selectedAncestryKey;
      }
    }

    let ability = abilityFromForm;
    if (!ability) {
      ability =
        typeof race?.selectedLineageAbility === 'string'
          ? race.selectedLineageAbility
          : '';
    }
    if (!ability && legacy?.spellcastingAbilities?.length) {
      ability = legacy.spellcastingAbilities[0];
    }

    return {
      tieflingLegacy: legacy,
      tieflingLegacyKey: legacyKey,
      tieflingLegacyAbility: ability,
    };
  }, [
    form?.race,
    form?.tieflingLegacy,
    form?.tieflingLegacyAbility,
    form?.tieflingLegacyKey,
  ]);

  const tieflingSpellAbilityLabel = useMemo(() => {
    if (typeof tieflingLegacyAbility !== 'string') return '';
    return tieflingLegacyAbility.trim();
  }, [tieflingLegacyAbility]);

  const tieflingResistanceLabel = useMemo(() => {
    const resistance = tieflingLegacy?.resistance;
    if (typeof resistance !== 'string') {
      return '';
    }
    return resistance.trim();
  }, [tieflingLegacy]);

  const { elvenLineage, elvenLineageKey, elvenLineageAbility } = useMemo(() => {
    const race = form?.race || {};
    const lineageFromForm =
      typeof form?.elvenLineage === 'object' ? form.elvenLineage : null;
    const lineageKeyFromForm =
      typeof form?.elvenLineageKey === 'string' ? form.elvenLineageKey : '';
    const abilityFromForm =
      typeof form?.elvenLineageAbility === 'string' ? form.elvenLineageAbility : '';

    let lineage = lineageFromForm;
    let lineageKey = lineageKeyFromForm;
    if (!lineage) {
      if (lineageKey && race?.elvenLineages?.[lineageKey]) {
        lineage = race.elvenLineages[lineageKey];
      } else if (race?.selectedAncestry && race?.elvenLineages) {
        lineage = race.selectedAncestry;
        lineageKey =
          typeof race?.selectedAncestryKey === 'string'
            ? race.selectedAncestryKey
            : '';
      } else if (
        typeof race?.selectedAncestryKey === 'string' &&
        race?.elvenLineages?.[race.selectedAncestryKey]
      ) {
        lineage = race.elvenLineages[race.selectedAncestryKey];
        lineageKey = race.selectedAncestryKey;
      }
    }

    let ability = abilityFromForm;
    if (!ability) {
      ability =
        typeof race?.selectedLineageAbility === 'string'
          ? race.selectedLineageAbility
          : '';
    }
    if (!ability && lineage?.spellcastingAbilities?.length) {
      ability = lineage.spellcastingAbilities[0];
    }

    return { elvenLineage: lineage, elvenLineageKey: lineageKey, elvenLineageAbility: ability };
  }, [form?.elvenLineage, form?.elvenLineageAbility, form?.elvenLineageKey, form?.race]);

  const elvenSpellAbilityLabel = useMemo(() => {
    if (typeof elvenLineageAbility !== 'string') return '';
    return elvenLineageAbility.trim();
  }, [elvenLineageAbility]);

  const isDrowElvenLineage = useMemo(() => {
    if (!elvenLineageKey) return false;
    return elvenLineageKey.toLowerCase() === 'drow';
  }, [elvenLineageKey]);

  const isHighElvenLineage = useMemo(() => {
    if (!elvenLineageKey) return false;
    return elvenLineageKey.toLowerCase() === 'high';
  }, [elvenLineageKey]);

  const isWoodElvenLineage = useMemo(() => {
    if (!elvenLineageKey) return false;
    return elvenLineageKey.toLowerCase() === 'wood';
  }, [elvenLineageKey]);

  const isForestGnomeLineage = useMemo(() => {
    if (!gnomeLineageKey) return false;
    return gnomeLineageKey.toLowerCase() === 'forest';
  }, [gnomeLineageKey]);

  const isRockGnomeLineage = useMemo(() => {
    if (!gnomeLineageKey) return false;
    return gnomeLineageKey.toLowerCase() === 'rock';
  }, [gnomeLineageKey]);

  const normalizedTieflingLegacyKey = useMemo(() => {
    if (!tieflingLegacyKey) return '';
    return tieflingLegacyKey.toLowerCase();
  }, [tieflingLegacyKey]);

  const isAbyssalTieflingLegacy = useMemo(() => {
    return normalizedTieflingLegacyKey === 'abyssal';
  }, [normalizedTieflingLegacyKey]);

  const isChthonicTieflingLegacy = useMemo(() => {
    return normalizedTieflingLegacyKey === 'chthonic';
  }, [normalizedTieflingLegacyKey]);

  const isInfernalTieflingLegacy = useMemo(() => {
    return normalizedTieflingLegacyKey === 'infernal';
  }, [normalizedTieflingLegacyKey]);

  const canUseSpeakWithAnimals = useMemo(() => {
    return isForestGnomeLineage;
  }, [isForestGnomeLineage]);

  const speakWithAnimalsMaxUses = useMemo(() => {
    if (!canUseSpeakWithAnimals) return 0;
    return Number.isFinite(profBonus) && profBonus > 0
      ? Math.floor(profBonus)
      : 0;
  }, [canUseSpeakWithAnimals, profBonus]);

  const hasAvailableSlotOfLevel = useMemo(() => {
    const normalizedRegular = availableSlots?.regular || {};
    const normalizedWarlock = availableSlots?.warlock || {};

    return (minimumLevel = 1) => {
      const hasRegularSlot = Object.entries(normalizedRegular).some(
        ([level, count]) =>
          Number(level) >= minimumLevel && Number(count) > 0
      );

      if (hasRegularSlot) {
        return true;
      }

      return Object.entries(normalizedWarlock).some(
        ([level, count]) =>
          Number(level) >= minimumLevel && Number(count) > 0
      );
    };
  }, [availableSlots]);

  const speakWithAnimalsHasSlot = useMemo(
    () => hasAvailableSlotOfLevel(1),
    [hasAvailableSlotOfLevel]
  );

  useEffect(() => {
    setAdrenalineRushUses(adrenalineRushMaxUses);
  }, [adrenalineRushMaxUses]);

  const normalizedCharacterId = useMemo(() => {
    if (typeof characterId !== 'string') {
      return '';
    }

    const trimmed = characterId.trim();
    return trimmed;
  }, [characterId]);

  const speakWithAnimalsStorageKey = useMemo(() => {
    if (!normalizedCharacterId) {
      return null;
    }

    return `zombiesSpeakWithAnimalsUses:${normalizedCharacterId}`;
  }, [normalizedCharacterId]);

  const lineageSpellStorageKeys = useMemo(() => {
    if (!normalizedCharacterId) {
      return null;
    }

    return LIMITED_USE_LINEAGE_SPELL_IDS.reduce(
      (acc, spellId) => {
        acc[spellId] = `zombiesLineageSpellUses:${spellId}:${normalizedCharacterId}`;
        return acc;
      },
      {}
    );
  }, [normalizedCharacterId]);

  const lineageSpellEligibility = useMemo(() => {
    return {
      'elf-drow-faerie-fire': isDrowElvenLineage && totalCharacterLevel >= 3,
      'elf-drow-darkness': isDrowElvenLineage && totalCharacterLevel >= 5,
      'elf-high-detect-magic': isHighElvenLineage && totalCharacterLevel >= 3,
      'elf-high-misty-step': isHighElvenLineage && totalCharacterLevel >= 5,
      'elf-wood-longstrider': isWoodElvenLineage && totalCharacterLevel >= 3,
      'elf-wood-pass-without-trace':
        isWoodElvenLineage && totalCharacterLevel >= 5,
      'tiefling-abyssal-ray-of-sickness':
        isAbyssalTieflingLegacy && totalCharacterLevel >= 3,
      'tiefling-abyssal-hold-person':
        isAbyssalTieflingLegacy && totalCharacterLevel >= 5,
      'tiefling-chthonic-darkness':
        isChthonicTieflingLegacy && totalCharacterLevel >= 3,
      'tiefling-chthonic-bestow-curse':
        isChthonicTieflingLegacy && totalCharacterLevel >= 5,
      'tiefling-infernal-hellish-rebuke':
        isInfernalTieflingLegacy && totalCharacterLevel >= 3,
      'tiefling-infernal-fireball':
        isInfernalTieflingLegacy && totalCharacterLevel >= 5,
    };
  }, [
    isDrowElvenLineage,
    isHighElvenLineage,
    isWoodElvenLineage,
    isAbyssalTieflingLegacy,
    isChthonicTieflingLegacy,
    isInfernalTieflingLegacy,
    totalCharacterLevel,
  ]);

  useEffect(() => {
    const fallbackUses = speakWithAnimalsMaxUses;

    if (!canUseSpeakWithAnimals) {
      setSpeakWithAnimalsUses((prev) => (prev === 0 ? prev : 0));
      return;
    }

    if (typeof window === 'undefined' || !speakWithAnimalsStorageKey) {
      setSpeakWithAnimalsUses((prev) =>
        prev === fallbackUses ? prev : fallbackUses
      );
      return;
    }

    const storedValueRaw = window.localStorage.getItem(
      speakWithAnimalsStorageKey
    );

    const parsed = Number(storedValueRaw);
    const normalized = Number.isFinite(parsed)
      ? Math.max(0, Math.floor(parsed))
      : fallbackUses;
    const nextValue = storedValueRaw === null ? fallbackUses : normalized;
    const clamped = Math.min(nextValue, fallbackUses);

    setSpeakWithAnimalsUses((prev) => (prev === clamped ? prev : clamped));
  }, [
    canUseSpeakWithAnimals,
    speakWithAnimalsMaxUses,
    speakWithAnimalsStorageKey,
  ]);

  useEffect(() => {
    speakWithAnimalsUsesRef.current = speakWithAnimalsUses;
  }, [speakWithAnimalsUses]);

  useEffect(() => {
    lineageSpellUsesRef.current = lineageSpellUses;
  }, [lineageSpellUses]);

  useEffect(() => {
    const allSpellIds = LIMITED_USE_LINEAGE_SPELL_IDS;
    const nextUses = {};

    allSpellIds.forEach((spellId) => {
      const baseSpellConfig = LINEAGE_SPELLS[spellId];
      const maxUsesRaw = Number(baseSpellConfig?.maxUses);
      const maxUses = Number.isFinite(maxUsesRaw) ? Math.max(0, maxUsesRaw) : 0;
      const isEligible = lineageSpellEligibility[spellId];
      if (!isEligible) {
        nextUses[spellId] = 0;
        if (
          typeof window !== 'undefined' &&
          lineageSpellStorageKeys?.[spellId]
        ) {
          window.localStorage.removeItem(lineageSpellStorageKeys[spellId]);
        }
        return;
      }

      const storageKey = lineageSpellStorageKeys?.[spellId];
      if (typeof window === 'undefined' || !storageKey) {
        nextUses[spellId] = maxUses;
        return;
      }

      const storedValueRaw = window.localStorage.getItem(storageKey);
      if (storedValueRaw === null) {
        nextUses[spellId] = maxUses;
        return;
      }

      const parsed = Number(storedValueRaw);
      nextUses[spellId] = Number.isFinite(parsed)
        ? Math.max(0, Math.min(maxUses, Math.floor(parsed)))
        : maxUses;
    });

    setLineageSpellUses((prev) => {
      let hasChanged = false;
      const updated = { ...prev };
      allSpellIds.forEach((spellId) => {
        const nextValue = nextUses[spellId] ?? 0;
        if (updated[spellId] !== nextValue) {
          updated[spellId] = nextValue;
          hasChanged = true;
        }
      });
      return hasChanged ? updated : prev;
    });
  }, [lineageSpellEligibility, lineageSpellStorageKeys, normalizedCharacterId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !lineageSpellStorageKeys) {
      return;
    }

    LIMITED_USE_LINEAGE_SPELL_IDS.forEach((spellId) => {
      if (!lineageSpellEligibility[spellId]) {
        return;
      }

      const storageKey = lineageSpellStorageKeys[spellId];
      if (!storageKey) {
        return;
      }

      const uses = lineageSpellUses[spellId] ?? 0;
      window.localStorage.setItem(storageKey, String(uses));
    });
  }, [
    lineageSpellEligibility,
    lineageSpellStorageKeys,
    lineageSpellUses,
  ]);

  const ancestryFeatures = useMemo(() => {
    const race = form?.race;
    if (!race) return [];

    const raceName =
      typeof race?.name === 'string' ? race.name.toLowerCase() : '';
    const raceDisplayName =
      typeof race?.name === 'string' && race.name.trim()
        ? race.name.trim()
        : raceName
        ? raceName.charAt(0).toUpperCase() + raceName.slice(1)
        : 'Race';

    const darkvisionRange =
      Number.isFinite(race?.darkvisionRange) && race.darkvisionRange > 0
        ? race.darkvisionRange
        : raceName === 'dwarf'
        ? 60
        : null;

    const raceFeatures = [];

    if (raceName === 'dwarf') {
      const darkvisionDescription =
        `Accustomed to life underground, you can see in dim light within ${darkvisionRange ?? 60} ` +
        'feet of you as if it were bright light, and in darkness as if it were dim light. You cannot discern color in darkness, only shades of gray.';

      const resilienceDescription =
        'You have resistance to poison damage, and you have advantage on saving throws you make to avoid or end the Poisoned condition.';

      const toughnessDescription =
        'Your hit point maximum increases by 1, and it increases by 1 again whenever you gain a level.';

      const stonecunningUsage = 'Bonus action • Proficiency bonus per long rest';
      const stonecunningDescription =
        'As a bonus action, you gain tremorsense with a range of 60 feet for 10 minutes. You can use this bonus action a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.';
      const stonecunningFullDescription = `${stonecunningDescription} ${stonecunningUsage}`;

      raceFeatures.push(
        {
          id: 'dwarf-darkvision',
          name: 'Darkvision',
          meta: `${raceDisplayName} ${darkvisionRange ?? 60} ft`,
          description: darkvisionDescription,
          desc: darkvisionDescription,
          hideUseButton: true,
        },
        {
          id: 'dwarf-resilience',
          name: 'Dwarven Resilience',
          meta: 'Dwarf',
          description: resilienceDescription,
          desc: resilienceDescription,
          hideUseButton: true,
        },
        {
          id: 'dwarf-toughness',
          name: 'Dwarven Toughness',
          meta: 'Dwarf',
          description: toughnessDescription,
          desc: toughnessDescription,
          hideUseButton: true,
        },
        {
          id: 'dwarf-stonecunning',
          name: 'Stonecunning',
          meta: 'Dwarf',
          description: stonecunningFullDescription,
          desc: stonecunningFullDescription,
          hideUseButton: true,
        }
      );
    } else if (raceName === 'orc') {
      const orcDarkvisionRange =
        Number.isFinite(race?.darkvisionRange) && race.darkvisionRange > 0
          ? race.darkvisionRange
          : 120;
      const darkvisionDescription =
        `Thanks to your orc heritage, you can see in dim light within ${orcDarkvisionRange} feet of you as if it were bright light, and in darkness as if it were dim light. You cannot discern color in darkness, only shades of gray.`;
      const adrenalineRushDescription =
        'As a bonus action, you can take the Dash action and gain temporary hit points equal to your proficiency bonus. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.';
      const relentlessEnduranceDescription =
        "When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. Once you use this trait, you can't use it again until you finish a long rest.";

      raceFeatures.push(
        {
          id: 'orc-adrenaline-rush',
          name: 'Adrenaline Rush',
          meta: 'Orc',
          description: adrenalineRushDescription,
          desc: adrenalineRushDescription,
        },
        {
          id: 'orc-darkvision',
          name: 'Darkvision',
          meta: `${raceDisplayName} ${orcDarkvisionRange} ft`,
          description: darkvisionDescription,
          desc: darkvisionDescription,
          hideUseButton: true,
        },
        {
          id: 'orc-relentless-endurance',
          name: 'Relentless Endurance',
          meta: 'Orc',
          description: relentlessEnduranceDescription,
          desc: relentlessEnduranceDescription,
          hideUseButton: true,
        }
      );
    } else if (raceName === 'elf') {
      const feyAncestryDescription =
        'You have advantage on saving throws against being charmed, and magic cannot put you to sleep.';
      const tranceDescription =
        'Elves do not need to sleep. Instead, you meditate deeply for 4 hours a day, remaining semiconscious. After resting in this way, you gain the same benefit that a human does from 8 hours of sleep.';
      const keenSensesDescription =
        'Your keen senses grant you proficiency in the Perception skill, and you choose one additional proficiency from Insight, Perception, or Survival.';

      raceFeatures.push(
        {
          id: 'elf-fey-ancestry',
          name: 'Fey Ancestry',
          meta: 'Elf',
          description: feyAncestryDescription,
          desc: feyAncestryDescription,
          hideUseButton: true,
        },
        {
          id: 'elf-trance',
          name: 'Trance',
          meta: 'Elf',
          description: tranceDescription,
          desc: tranceDescription,
          hideUseButton: true,
        },
        {
          id: 'elf-keen-senses',
          name: 'Keen Senses',
          meta: 'Elf',
          description: keenSensesDescription,
          desc: keenSensesDescription,
          hideUseButton: true,
        }
      );

      if (elvenLineage) {
        const lineageLabel =
          typeof elvenLineage?.label === 'string'
            ? elvenLineage.label
            : 'Elven Lineage';
        const lineageMeta = `${lineageLabel}${
          elvenSpellAbilityLabel
            ? ` • Spellcasting Ability: ${elvenSpellAbilityLabel}`
            : ''
        }`;
        const abilityText = elvenSpellAbilityLabel
          ? ` This lineage uses ${elvenSpellAbilityLabel} for its spells.`
          : '';

        if (isDrowElvenLineage) {
          const dancingLightsDescription =
            'You know the Dancing Lights cantrip and can cast it without expending a spell slot.' +
            abilityText;
          const faerieFireDescription =
            'Starting at 3rd level, you can cast Faerie Fire with this trait once per long rest.' +
            abilityText;
          const darknessDescription =
            'Starting at 5th level, you can cast Darkness with this trait once per long rest.' +
            abilityText;

          raceFeatures.push({
            id: 'elf-drow-dancing-lights',
            name: 'Dancing Lights',
            meta: lineageMeta,
            description: dancingLightsDescription,
            desc: dancingLightsDescription,
            hideUseButton: true,
          });

          if (totalCharacterLevel >= 3) {
            raceFeatures.push({
              id: 'elf-drow-faerie-fire',
              name: 'Faerie Fire (Level 3)',
              meta: lineageMeta,
              description: faerieFireDescription,
              desc: faerieFireDescription,
              oncePerLongRestLineageSpell: true,
              lineageSpellName: LINEAGE_SPELLS['elf-drow-faerie-fire']?.spellName,
            });
          }

          if (totalCharacterLevel >= 5) {
            raceFeatures.push({
              id: 'elf-drow-darkness',
              name: 'Darkness (Level 5)',
              meta: lineageMeta,
              description: darknessDescription,
              desc: darknessDescription,
              oncePerLongRestLineageSpell: true,
              lineageSpellName: LINEAGE_SPELLS['elf-drow-darkness']?.spellName,
            });
          }
        } else if (isHighElvenLineage) {
          const prestidigitationDescription =
            'You know the Prestidigitation cantrip and can cast it without expending a spell slot.' +
            abilityText;
          const detectMagicDescription =
            'Starting at 3rd level, you can cast Detect Magic with this trait once per long rest.' +
            abilityText;
          const mistyStepDescription =
            'Starting at 5th level, you can cast Misty Step with this trait once per long rest.' +
            abilityText;

          raceFeatures.push({
            id: 'elf-high-prestidigitation',
            name: 'Prestidigitation',
            meta: lineageMeta,
            description: prestidigitationDescription,
            desc: prestidigitationDescription,
            hideUseButton: true,
          });

          if (totalCharacterLevel >= 3) {
            raceFeatures.push({
              id: 'elf-high-detect-magic',
              name: 'Detect Magic (Level 3)',
              meta: lineageMeta,
              description: detectMagicDescription,
              desc: detectMagicDescription,
              oncePerLongRestLineageSpell: true,
              lineageSpellName: LINEAGE_SPELLS['elf-high-detect-magic']?.spellName,
            });
          }

          if (totalCharacterLevel >= 5) {
            raceFeatures.push({
              id: 'elf-high-misty-step',
              name: 'Misty Step (Level 5)',
              meta: lineageMeta,
              description: mistyStepDescription,
              desc: mistyStepDescription,
              oncePerLongRestLineageSpell: true,
              lineageSpellName: LINEAGE_SPELLS['elf-high-misty-step']?.spellName,
            });
          }
        } else if (isWoodElvenLineage) {
          const druidcraftDescription =
            'You know the Druidcraft cantrip and can cast it without expending a spell slot.' +
            abilityText +
            ' Your walking speed increases to 35 feet.';
          const longstriderDescription =
            'Starting at 3rd level, you can cast Longstrider with this trait once per long rest.' +
            abilityText;
          const passWithoutTraceDescription =
            'Starting at 5th level, you can cast Pass without Trace with this trait once per long rest.' +
            abilityText;

          raceFeatures.push({
            id: 'elf-wood-druidcraft',
            name: 'Druidcraft',
            meta: lineageMeta,
            description: druidcraftDescription,
            desc: druidcraftDescription,
            hideUseButton: true,
          });

          if (totalCharacterLevel >= 3) {
            raceFeatures.push({
              id: 'elf-wood-longstrider',
              name: 'Longstrider (Level 3)',
              meta: lineageMeta,
              description: longstriderDescription,
              desc: longstriderDescription,
              oncePerLongRestLineageSpell: true,
              lineageSpellName: LINEAGE_SPELLS['elf-wood-longstrider']?.spellName,
            });
          }

          if (totalCharacterLevel >= 5) {
            raceFeatures.push({
              id: 'elf-wood-pass-without-trace',
              name: 'Pass without Trace (Level 5)',
              meta: lineageMeta,
              description: passWithoutTraceDescription,
              desc: passWithoutTraceDescription,
              oncePerLongRestLineageSpell: true,
              lineageSpellName:
                LINEAGE_SPELLS['elf-wood-pass-without-trace']?.spellName,
            });
          }
        }
      }
    } else if (raceName === 'gnome') {
      const gnomishCunningDescription =
        'You have advantage on Intelligence, Wisdom, and Charisma saving throws against magic.';

      raceFeatures.push({
        id: 'gnome-gnomish-cunning',
        name: 'Gnomish Cunning',
        meta: 'Gnome',
        description: gnomishCunningDescription,
        desc: gnomishCunningDescription,
        hideUseButton: true,
      });

      const lineageLabel =
        typeof gnomeLineage?.label === 'string'
          ? gnomeLineage.label
          : 'Gnome Lineage';
      const abilityText = gnomeSpellAbilityLabel
        ? ` This lineage uses ${gnomeSpellAbilityLabel} for its spells.`
        : '';

      if (gnomeLineage && isForestGnomeLineage) {
        const minorIllusionDescription =
          'You know the Minor Illusion cantrip. It creates a sound or an image of an object within range that lasts for the duration.' +
          abilityText;

        raceFeatures.push({
          id: 'gnome-forest-minor-illusion',
          name: 'Minor Illusion',
          meta: `${lineageLabel}${
            gnomeSpellAbilityLabel ? ` • Spellcasting Ability: ${gnomeSpellAbilityLabel}` : ''
          }`,
          description: minorIllusionDescription,
          desc: minorIllusionDescription,
          hideUseButton: true,
        });

        const speakWithAnimalsDescription =
          'Starting at 3rd level, you can cast Speak with Animals without expending a spell slot a number of times equal to your proficiency bonus. You regain all expended uses when you finish a long rest.' +
          abilityText;

        raceFeatures.push({
          id: 'gnome-forest-speak-with-animals',
          name: 'Speak with Animals',
          meta: `${lineageLabel}${
            gnomeSpellAbilityLabel ? ` • Spellcasting Ability: ${gnomeSpellAbilityLabel}` : ''
          }`,
          description: speakWithAnimalsDescription,
          desc: speakWithAnimalsDescription,
        });
      } else if (gnomeLineage && isRockGnomeLineage) {
        const mendingDescription =
          'You know the Mending cantrip, allowing you to repair small breaks or tears in objects.' +
          abilityText;

        raceFeatures.push({
          id: 'gnome-rock-mending',
          name: 'Mending',
          meta: `${lineageLabel}${
            gnomeSpellAbilityLabel ? ` • Spellcasting Ability: ${gnomeSpellAbilityLabel}` : ''
          }`,
          description: mendingDescription,
          desc: mendingDescription,
          hideUseButton: true,
        });

        const prestidigitationDescription =
          'You know the Prestidigitation cantrip, letting you create minor magical effects.' +
          abilityText +
          ' Additionally, whenever you finish a long rest, you can spend 10 minutes to create a Tiny clockwork device (AC 5, 1 hp). The device ceases to function after 24 hours (unless you spend 1 minute repairing it), when you use this trait again, or when you take an action to dismantle it; at that time, you can reclaim the materials used to create it.';

        raceFeatures.push({
          id: 'gnome-rock-prestidigitation',
          name: 'Prestidigitation',
          meta: `${lineageLabel}${
            gnomeSpellAbilityLabel ? ` • Spellcasting Ability: ${gnomeSpellAbilityLabel}` : ''
          }`,
          description: prestidigitationDescription,
          desc: prestidigitationDescription,
          hideUseButton: true,
        });
      }
    } else if (raceName === 'tiefling') {
      const legacyLabel =
        typeof tieflingLegacy?.label === 'string'
          ? tieflingLegacy.label
          : typeof tieflingLegacy?.name === 'string'
          ? tieflingLegacy.name
          : 'Fiendish Legacy';
      const legacyMetaParts = [legacyLabel];
      if (tieflingResistanceLabel) {
        legacyMetaParts.push(`Resistance: ${tieflingResistanceLabel}`);
      }
      if (tieflingSpellAbilityLabel) {
        legacyMetaParts.push(`Spellcasting Ability: ${tieflingSpellAbilityLabel}`);
      }
      const legacyMeta = legacyMetaParts.join(' • ');
      const abilityText = tieflingSpellAbilityLabel
        ? ` This legacy uses ${tieflingSpellAbilityLabel} for its spells.`
        : '';

      const baseTieflingMeta = [
        'Tiefling',
        tieflingSpellAbilityLabel ? `Spellcasting Ability: ${tieflingSpellAbilityLabel}` : null,
      ]
        .filter(Boolean)
        .join(' • ');

      const otherworldlyDescription =
        'You know the Thaumaturgy cantrip and can cast it without expending a spell slot.' +
        abilityText;

      raceFeatures.push({
        id: 'tiefling-otherworldly-presence',
        name: 'Otherworldly Presence (Thaumaturgy)',
        meta: baseTieflingMeta,
        description: otherworldlyDescription,
        desc: otherworldlyDescription,
        hideUseButton: true,
      });

      if (tieflingResistanceLabel) {
        const resistanceDescription =
          `You have resistance to ${tieflingResistanceLabel.toLowerCase()} damage.`;
        raceFeatures.push({
          id: `tiefling-${normalizedTieflingLegacyKey || 'legacy'}-resistance`,
          name: `${tieflingResistanceLabel} Resistance`,
          meta: legacyMeta,
          description: resistanceDescription,
          desc: resistanceDescription,
          hideUseButton: true,
        });
      }

      const spells = Array.isArray(tieflingLegacy?.spells)
        ? tieflingLegacy.spells
        : [];

      const legacyKeyForId = normalizedTieflingLegacyKey || 'legacy';

      spells.forEach((spell, index) => {
        const requiredLevelRaw = Number(spell?.unlockedAtLevel);
        const requiredLevel = Number.isFinite(requiredLevelRaw)
          ? requiredLevelRaw
          : 1;
        if (totalCharacterLevel < Math.max(1, requiredLevel)) {
          return;
        }

        const spellName = typeof spell?.name === 'string' ? spell.name : 'Legacy Spell';
        const normalizedSpellName = spellName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || `spell-${index}`;
        const spellId = `tiefling-${legacyKeyForId}-${normalizedSpellName}`;
        const baseSpellConfig = LINEAGE_SPELLS[spellId];
        const hasLimitedUses =
          Number.isFinite(baseSpellConfig?.maxUses) && baseSpellConfig.maxUses > 0;

        const descriptionParts = [];
        if (typeof spell?.description === 'string' && spell.description.trim()) {
          descriptionParts.push(spell.description.trim());
        }
        if (abilityText) {
          descriptionParts.push(abilityText.trim());
        }
        if (typeof spell?.usage === 'string' && spell.usage.trim()) {
          descriptionParts.push(`Uses: ${spell.usage.trim()}`);
        }
        const description = descriptionParts.join(' ');
        const levelNote = requiredLevel > 1 ? ` (Level ${requiredLevel})` : '';

        raceFeatures.push({
          id: spellId,
          name: `${spellName}${levelNote}`,
          meta: legacyMeta,
          description,
          desc: description,
          hideUseButton: !hasLimitedUses,
          oncePerLongRestLineageSpell: hasLimitedUses,
          lineageSpellName: baseSpellConfig?.spellName || spellName,
          lineageSpellBaseLevel: baseSpellConfig?.baseLevel,
          lineageSpellCastingTime: baseSpellConfig?.castingTime,
        });
      });
    }

    if (darkvisionRange && raceName !== 'dwarf' && raceName !== 'orc') {
      const darkvisionDescription =
        `You can see in dim light within ${darkvisionRange} ` +
        'feet of you as if it were bright light, and in darkness as if it were dim light. You cannot discern color in darkness, only shades of gray.';

      raceFeatures.push({
        id: raceName ? `${raceName}-darkvision` : 'darkvision',
        name: 'Darkvision',
        meta: `${raceDisplayName} ${darkvisionRange ?? 60} ft`,
        description: darkvisionDescription,
        desc: darkvisionDescription,
        hideUseButton: true,
      });
    }

    if (raceName === 'dragonborn') {
      const ancestry =
        race.selectedAncestry ||
        (race.selectedAncestryKey && race.dragonAncestries
          ? race.dragonAncestries[race.selectedAncestryKey]
          : null) ||
        form?.dragonAncestry ||
        (form?.dragonAncestryKey && race.dragonAncestries
          ? race.dragonAncestries[form.dragonAncestryKey]
          : null);

      if (ancestry) {
        const ancestryLabel = ancestry.label || ancestry.name || 'Dragonborn';
        const damageType = ancestry.damageType || '';
        const damageTypeLower = damageType.toLowerCase();
        const resistanceDescription = damageTypeLower
          ? `You have resistance to ${damageTypeLower} damage.`
          : 'You have resistance to the damage type associated with your draconic ancestry.';

        raceFeatures.push({
          id: 'dragonborn-damage-resistance',
          name: 'Damage Resistance',
          meta: `Dragon Subrace (${ancestryLabel})`,
          description: resistanceDescription,
          desc: resistanceDescription,
          hideUseButton: true,
        });

        if (totalCharacterLevel >= 5) {
          const draconicFlightDescription =
            'When you reach character level 5, you can use a bonus action to manifest spectral wings on your back. The wings last for 1 minute or until you dismiss them as a bonus action. During this time, you gain a flying speed equal to your walking speed.';
          raceFeatures.push({
            id: 'dragonborn-draconic-flight',
            name: 'Draconic Flight',
            meta: `Dragon Subrace (${ancestryLabel})`,
            description: draconicFlightDescription,
            desc: draconicFlightDescription,
            hideUseButton: true,
          });
        }
      }
    }

    if (raceName === 'goliath') {
      const ancestry =
        race.selectedAncestry ||
        (race.selectedAncestryKey && race.giantAncestries
          ? race.giantAncestries[race.selectedAncestryKey]
          : null) ||
        form?.giantAncestry ||
        (form?.giantAncestryKey && race.giantAncestries
          ? race.giantAncestries[form.giantAncestryKey]
          : null);

      if (ancestry) {
        const ancestryLabel = ancestry.label || ancestry.name || 'Giant Boon';
        const ancestryDescription = ancestry.description || '';
        const usageText = ancestry.usage ? ` ${ancestry.usage}` : '';
        const combinedDescription = `${ancestryDescription}${usageText}`.trim();

        raceFeatures.push(
          {
            id: `goliath-ancestry-${
              race.selectedAncestryKey || form?.giantAncestryKey || 'boon'
            }`,
            name: ancestryLabel,
            meta: 'Giant Ancestry',
            description: combinedDescription || ancestryDescription,
            desc: combinedDescription || ancestryDescription,
            hideUseButton: true,
          },
          {
            id: 'goliath-powerful-build',
            name: 'Powerful Build',
            meta: 'Goliath',
            description:
              'You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.',
            desc:
              'You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.',
            hideUseButton: true,
          }
        );

        if (totalCharacterLevel >= 5) {
          const largeFormDescription =
            "Starting at 5th level, you can use a bonus action to magically grow to Large size for 10 minutes. While Large, your speed increases by 10 feet, and you have advantage on Strength checks. Once you use this trait, you can't use it again until you finish a long rest.";
          raceFeatures.push({
            id: 'goliath-large-form',
            name: 'Large Form',
            meta: 'Goliath (Level 5)',
            description: largeFormDescription,
            desc: largeFormDescription,
            hideUseButton: true,
          });
        }
      }
    } else if (raceName === 'halfling') {
      raceFeatures.push(
        {
          id: 'halfling-brave',
          name: 'Brave',
          meta: 'Halfling',
          description:
            'You have advantage on saving throws you make to avoid or end the Frightened condition.',
          desc:
            'You have advantage on saving throws you make to avoid or end the Frightened condition.',
          hideUseButton: true,
        },
        {
          id: 'halfling-nimbleness',
          name: 'Halfling Nimbleness',
          meta: 'Halfling',
          description:
            'You can move through the space of any creature that is of a size larger than yours.',
          desc:
            'You can move through the space of any creature that is of a size larger than yours.',
          hideUseButton: true,
        },
        {
          id: 'halfling-luck',
          name: 'Luck',
          meta: 'Halfling',
          description:
            'When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.',
          desc:
            'When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.',
          hideUseButton: true,
        },
        {
          id: 'halfling-naturally-stealthy',
          name: 'Naturally Stealthy',
          meta: 'Halfling',
          description:
            'You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you.',
          desc:
            'You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you.',
          hideUseButton: true,
        }
      );
    }

    return raceFeatures;
  }, [
    form?.race,
    form?.dragonAncestry,
    form?.dragonAncestryKey,
    form?.giantAncestry,
    form?.giantAncestryKey,
    totalCharacterLevel,
    gnomeLineage,
    gnomeSpellAbilityLabel,
    isForestGnomeLineage,
    isRockGnomeLineage,
    elvenLineage,
    elvenLineageKey,
    elvenSpellAbilityLabel,
    isDrowElvenLineage,
    isHighElvenLineage,
    isWoodElvenLineage,
    tieflingLegacy,
    tieflingLegacyKey,
    tieflingSpellAbilityLabel,
    tieflingResistanceLabel,
    normalizedTieflingLegacyKey,
  ]);

  const displayFeatures = useMemo(() => {
    if (ancestryFeatures.length === 0) return features;
    return [...ancestryFeatures, ...features];
  }, [ancestryFeatures, features]);

  const pendingFreeCastConfig = pendingSpell?.freeCast || null;
  const pendingFreeCastRemaining = pendingFreeCastConfig
    ? typeof pendingFreeCastConfig.getRemaining === 'function'
      ? pendingFreeCastConfig.getRemaining()
      : Number.isFinite(pendingFreeCastConfig.remaining)
      ? Math.max(0, Math.floor(pendingFreeCastConfig.remaining))
      : 0
    : 0;

  useEffect(() => {
    if (!showFeatures) return;
    async function fetchFeatures() {
      setLoading(true);
      setError(null);
      const allFeatures = [];
      try {
        for (const occ of Array.isArray(form.occupation) ? form.occupation : []) {
          if (typeof occ !== 'object' || occ === null) continue;
          const displayName = occ.Name || occ.Occupation || occ.name || '';
          const className = displayName.toLowerCase();
          if (!className) continue;
          for (let lvl = 1; lvl <= (occ.Level || 1); lvl++) {
            const res = await apiFetch(`/classes/${className}/features/${lvl}`);
            if (!res.ok) continue;
            const data = await res.json();
            (data.features || []).forEach((f) =>
              allFeatures.push({ ...f, class: displayName, level: lvl })
            );
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        setError('Unable to load class features');
      } finally {
        allFeatures.sort(
          (a, b) =>
            (a.class || '').localeCompare(b.class || '') ||
            (a.level || 0) - (b.level || 0)
        );
        setFeatures(allFeatures);
        setLoading(false);
      }
    }
    fetchFeatures();
  }, [form.occupation, showFeatures]);

  useEffect(() => {
    setSurgeUsed(false);
    setLargeFormUsed(false);
    setDraconicFlightUsed(false);
    setAdrenalineRushUses(adrenalineRushMaxUses);
    if (hasInitializedRestRef.current) {
      setSpeakWithAnimalsUses(speakWithAnimalsMaxUses);
      setLineageSpellUses((prev) => {
        let hasChanges = false;
        const updated = { ...prev };
        LIMITED_USE_LINEAGE_SPELL_IDS.forEach((spellId) => {
          const baseSpellConfig = LINEAGE_SPELLS[spellId];
          const maxUsesRaw = Number(baseSpellConfig?.maxUses);
          const maxUses = Number.isFinite(maxUsesRaw) ? Math.max(0, maxUsesRaw) : 0;
          const resetValue = lineageSpellEligibility[spellId] ? maxUses : 0;
          if (updated[spellId] !== resetValue) {
            updated[spellId] = resetValue;
            hasChanges = true;
          }
        });
        return hasChanges ? updated : prev;
      });
    }
    hasInitializedRestRef.current = true;
  }, [
    adrenalineRushMaxUses,
    longRestCount,
    shortRestCount,
    speakWithAnimalsMaxUses,
    lineageSpellEligibility,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined' || !speakWithAnimalsStorageKey) {
      return;
    }

    if (!canUseSpeakWithAnimals) {
      window.localStorage.removeItem(speakWithAnimalsStorageKey);
      return;
    }

    window.localStorage.setItem(
      speakWithAnimalsStorageKey,
      String(speakWithAnimalsUses)
    );
  }, [
    canUseSpeakWithAnimals,
    speakWithAnimalsStorageKey,
    speakWithAnimalsUses,
  ]);

  const closePendingSpellModal = useCallback(() => {
    setShowUpcast(false);
    setPendingSpell(null);
  }, []);

  const handlePendingSpellFreeCast = useCallback(() => {
    const freeCastConfig = pendingSpell?.freeCast;
    if (!freeCastConfig) {
      return;
    }

    const remaining =
      typeof freeCastConfig.getRemaining === 'function'
        ? freeCastConfig.getRemaining()
        : Number.isFinite(freeCastConfig.remaining)
        ? freeCastConfig.remaining
        : 0;

    if (remaining <= 0 && !freeCastConfig.allowNegative) {
      return;
    }

    freeCastConfig.onUse?.();
    closePendingSpellModal();
  }, [closePendingSpellModal, pendingSpell]);

  const handlePendingSpellSlotCast = useCallback(
    (level, slotType) => {
      if (!pendingSpell) {
        closePendingSpellModal();
        return;
      }

      if (typeof pendingSpell.onSlotCast === 'function') {
        pendingSpell.onSlotCast(level, slotType);
        closePendingSpellModal();
        return;
      }

      const baseLevelRaw = Number(pendingSpell?.baseLevel ?? pendingSpell?.level);
      const baseLevel = Number.isFinite(baseLevelRaw)
        ? Math.max(0, Math.floor(baseLevelRaw))
        : 1;

      onCastSpell?.({
        level: baseLevel,
        slotLevel: level,
        slotType,
        castingTime: pendingSpell?.castingTime || '1 action',
        name: pendingSpell?.name,
      });
      closePendingSpellModal();
    },
    [closePendingSpellModal, onCastSpell, pendingSpell]
  );

  const speakWithAnimalsAbilityMeta =
    gnomeSpellAbilityLabel || 'Spellcasting ability not set';

  const dialogClassName = useMemo(() => {
    if (!isDocked) {
      return undefined;
    }

    const classes = ['docked-modal'];
    if (dockedSide) {
      classes.push(`docked-modal--${dockedSide}`);
    }
    classes.push('docked-modal--features');
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

    handleCloseFeatures?.();
  }, [handleCloseFeatures, isDocked, onDockClose]);

  return (
    <>
      <Modal
        className={modalClassName}
        show={showFeatures}
        onHide={handleModalHide}
        size="lg"
        centered={!isDocked}
        backdrop={isDocked ? false : true}
        enforceFocus={!isDocked}
        restoreFocus={!isDocked}
        dialogClassName={dialogClassName}
      >
        <div className="text-center">
          <Card className="modern-card">
            <Card.Header className="modal-header">
              <Card.Title className="modal-title">Features</Card.Title>
            </Card.Header>
            <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
              {error && (
                <div className="text-danger mb-2">{error}</div>
              )}
              {loading ? (
                <div className="d-flex justify-content-center py-4">
                  <Spinner animation="border" role="status" />
                </div>
              ) : displayFeatures.length > 0 ? (
                <div className="feature-card-grid">
                  {displayFeatures.map((feat, idx) => {
                    const featKey = feat.id || `${feat.name}-${idx}`;
                    const isActionSurge = feat.name?.includes('Action Surge');
                    const isLargeForm = feat.id === 'goliath-large-form';
                    const isDraconicFlight =
                      feat.id === 'dragonborn-draconic-flight';
                    const isAdrenalineRush = feat.id === 'orc-adrenaline-rush';
                    const isSpeakWithAnimals =
                      feat.id === 'gnome-forest-speak-with-animals';
                    const lineageSpellConfig =
                      LINEAGE_SPELLS[feat.id] || null;
                    const lineageSpellHasLimitedUses =
                      LIMITED_USE_LINEAGE_SPELL_IDS_SET.has(feat.id);
                    const isLineageSpell = Boolean(lineageSpellConfig);
                    const lineageSpellRemainingUses = lineageSpellHasLimitedUses
                      ? lineageSpellUses[feat.id] ?? 0
                      : null;
                    const lineageSpellBaseLevelRaw = Number(
                      feat.lineageSpellBaseLevel ?? lineageSpellConfig?.baseLevel
                    );
                    const lineageSpellBaseLevel = Number.isFinite(
                      lineageSpellBaseLevelRaw
                    )
                      ? Math.max(1, Math.floor(lineageSpellBaseLevelRaw))
                      : 1;
                    const lineageSpellCastingTime =
                      feat.lineageSpellCastingTime ||
                      lineageSpellConfig?.castingTime ||
                      '1 action';
                    const lineageSpellDisplayName =
                      lineageSpellConfig?.spellName ||
                      feat.lineageSpellName ||
                      feat.name;
                    const hasSlotsForLineageSpell = hasAvailableSlotOfLevel(
                      lineageSpellBaseLevel
                    );
                    const isTieflingLineageSpell =
                      isLineageSpell && feat.id?.startsWith('tiefling-');
                    return (
                      <div className="feature-card" key={featKey}>
                        <div className="feature-card-header">
                          <div>
                            <div className="feature-card-name">{feat.name}</div>
                            <div className="feature-card-meta">
                              {feat.meta ? (
                                <span>{feat.meta}</span>
                              ) : (
                                <>
                                  {feat.class && <span>{feat.class}</span>}
                                  {feat.level != null && (
                                    <span>Level {feat.level}</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="feature-card-actions">
                            {isActionSurge ? (
                              <Button
                                aria-label="use feature"
                                variant="link"
                                className={`p-0 border-0 ${surgeUsed ? 'opacity-50' : ''}`}
                                onClick={() => {
                                  if (!surgeUsed) {
                                    onActionSurge?.();
                                    setSurgeUsed(true);
                                  }
                                }}
                                disabled={surgeUsed}
                              >
                                <img
                                  src={actionSurgeIcon}
                                  alt="Action Surge"
                                  width={36}
                                  height={36}
                                />
                              </Button>
                            ) : isAdrenalineRush ? (
                              <Button
                                aria-label="use feature"
                                variant="link"
                                className={`p-0 border-0 ${
                                  adrenalineRushUses <= 0 ? 'opacity-50' : ''
                                }`}
                                onClick={() => {
                                  if (adrenalineRushUses > 0) {
                                    onAdrenalineRush?.();
                                    setAdrenalineRushUses((prev) =>
                                      Math.max(0, prev - 1)
                                    );
                                  }
                                }}
                                disabled={adrenalineRushUses <= 0}
                              >
                                <img
                                  src={adrenalineRushIcon}
                                  alt="Adrenaline Rush"
                                  width={36}
                                  height={36}
                                />
                              </Button>
                            ) : isLargeForm ? (
                              <Button
                                aria-label="use feature"
                                variant="link"
                                className={`p-0 border-0 ${largeFormUsed ? 'opacity-50' : ''}`}
                                onClick={() => {
                                  if (!largeFormUsed) {
                                    onLargeForm?.();
                                    setLargeFormUsed(true);
                                  }
                                }}
                                disabled={largeFormUsed}
                              >
                                <img
                                  src={largeFormIcon}
                                  alt="Large Form"
                                  width={36}
                                  height={36}
                                />
                              </Button>
                            ) : isDraconicFlight ? (
                              <Button
                                aria-label="use feature"
                                variant="link"
                                className={`p-0 border-0 ${
                                  draconicFlightUsed ? 'opacity-50' : ''
                                }`}
                                onClick={() => {
                                  if (!draconicFlightUsed) {
                                    onDraconicFlight?.();
                                    setDraconicFlightUsed(true);
                                  }
                                }}
                                disabled={draconicFlightUsed}
                              >
                                <img
                                  src={dragonWingsIcon}
                                  alt="Draconic Flight"
                                  width={36}
                                  height={36}
                                />
                              </Button>
                            ) : isLineageSpell ? (
                              <Button
                                aria-label={`cast ${
                                  lineageSpellConfig?.spellName || 'lineage spell'
                                } from lineage`}
                                variant="link"
                                className={`p-0 border-0 ${
                                  lineageSpellHasLimitedUses &&
                                  lineageSpellRemainingUses <= 0
                                    ? 'opacity-50'
                                    : ''
                                }`}
                                onClick={() => {
                                  if (!lineageSpellConfig?.spellName) {
                                    return;
                                  }
                                  if (
                                    isTieflingLineageSpell &&
                                    lineageSpellHasLimitedUses
                                  ) {
                                    if (
                                      lineageSpellRemainingUses <= 0 &&
                                      !hasSlotsForLineageSpell
                                    ) {
                                      return;
                                    }

                                    setPendingSpell({
                                      id: feat.id,
                                      name: lineageSpellDisplayName,
                                      baseLevel: lineageSpellBaseLevel,
                                      castingTime: lineageSpellCastingTime,
                                      freeCast: {
                                        label: 'C',
                                        ariaLabel: `Cast ${lineageSpellDisplayName} without expending a spell slot`,
                                        remainingLabel: 'Uses remaining',
                                        icon: (
                                          <span className="d-flex align-items-center gap-1">
                                            <i
                                              className="fa-solid fa-wand-sparkle"
                                              aria-hidden="true"
                                            />
                                            <span>C</span>
                                          </span>
                                        ),
                                        getRemaining: () =>
                                          Math.max(
                                            0,
                                            lineageSpellUsesRef.current?.[feat.id] ?? 0
                                          ),
                                        onUse: () => {
                                          setLineageSpellUses((prev) => {
                                            const current = prev[feat.id] ?? 0;
                                            if (current <= 0) {
                                              return prev;
                                            }
                                            return {
                                              ...prev,
                                              [feat.id]: Math.max(0, current - 1),
                                            };
                                          });
                                          onCastSpell?.({
                                            castingTime: lineageSpellCastingTime,
                                            name: lineageSpellDisplayName,
                                            pendingEffectOnly: true,
                                          });
                                          onCastSpell?.('action');
                                        },
                                      },
                                      onSlotCast: (slotLevel, slotType) => {
                                        onCastSpell?.({
                                          level: lineageSpellBaseLevel,
                                          slotLevel,
                                          slotType,
                                          castingTime: lineageSpellCastingTime,
                                          name: lineageSpellDisplayName,
                                        });
                                      },
                                    });
                                    setShowUpcast(true);
                                    return;
                                  }
                                  if (lineageSpellHasLimitedUses) {
                                    setLineageSpellUses((prev) => {
                                      const current = prev[feat.id] ?? 0;
                                      if (current <= 0) {
                                        return prev;
                                      }
                                      return {
                                        ...prev,
                                        [feat.id]: Math.max(0, current - 1),
                                      };
                                    });
                                    if (lineageSpellRemainingUses <= 0) {
                                      return;
                                    }
                                  }
                                  onCastSpell?.({
                                    castingTime: lineageSpellCastingTime,
                                    name: lineageSpellDisplayName,
                                    pendingEffectOnly: true,
                                  });
                                  onCastSpell?.('action');
                                }}
                                disabled={
                                  lineageSpellHasLimitedUses &&
                                  lineageSpellRemainingUses <= 0 &&
                                  (!isTieflingLineageSpell || !hasSlotsForLineageSpell)
                                }
                              >
                                <i className="fa-solid fa-wand-sparkle" />
                              </Button>
                            ) : isSpeakWithAnimals ? (
                              <div className="d-flex align-items-center gap-1">
                                <Button
                                  aria-label="cast Speak with Animals using a spell slot"
                                  variant="link"
                                  className="p-0 border-0"
                                  onClick={() => {
                                    if (
                                      !canUseSpeakWithAnimals ||
                                      (speakWithAnimalsUses <= 0 &&
                                        !speakWithAnimalsHasSlot)
                                    ) {
                                      return;
                                    }
                                    setPendingSpell({
                                      id: feat.id,
                                      name: 'Speak with Animals',
                                      baseLevel: 1,
                                      castingTime: '1 action',
                                      freeCast: {
                                        label: 'P',
                                        ariaLabel:
                                          'Cast Speak with Animals using proficiency',
                                        remainingLabel: 'Uses remaining',
                                        getRemaining: () =>
                                          Math.max(0, speakWithAnimalsUsesRef.current ?? 0),
                                        onUse: () => {
                                          setSpeakWithAnimalsUses((prev) =>
                                            Math.max(0, prev - 1)
                                          );
                                          onCastSpell?.({
                                            castingTime: '1 action',
                                            name: 'Speak with Animals',
                                            pendingEffectOnly: true,
                                          });
                                          onCastSpell?.('action');
                                        },
                                      },
                                      onSlotCast: (slotLevel, slotType) => {
                                        onCastSpell?.({
                                          level: 1,
                                          slotLevel,
                                          slotType,
                                          castingTime: '1 action',
                                          name: 'Speak with Animals',
                                        });
                                      },
                                    });
                                    setShowUpcast(true);
                                  }}
                                  disabled={
                                    !canUseSpeakWithAnimals ||
                                    (speakWithAnimalsUses <= 0 &&
                                      !speakWithAnimalsHasSlot)
                                  }
                                >
                                  <img
                                    src={speakWithAnimalIcon}
                                    alt="Speak with Animals"
                                    width={36}
                                    height={36}
                                  />
                                </Button>
                              </div>
                            ) : !feat.hideUseButton ? (
                              <Button aria-label="use feature" variant="outline-light" size="sm">
                                Use
                              </Button>
                            ) : null}
                            <Button
                              aria-label="view feature"
                              variant="link"
                              size="sm"
                              className="view-link-btn"
                              onClick={() => {
                                setModalFeature(feat);
                                setShowModal(true);
                              }}
                            >
                              <i className="fa-solid fa-eye"></i>
                            </Button>
                          </div>
                        </div>
                        {isAdrenalineRush && (
                          <div className="feature-card-uses text-muted small mt-2">
                            Uses remaining: {adrenalineRushUses}
                          </div>
                        )}
                        {isSpeakWithAnimals && (
                          <div className="feature-card-uses text-muted small mt-2">
                            Uses remaining: {speakWithAnimalsUses}
                          </div>
                        )}
                        {lineageSpellHasLimitedUses && (
                          <div className="feature-card-uses text-muted small mt-2">
                            Uses remaining: {lineageSpellRemainingUses}
                          </div>
                        )}
                        {isSpeakWithAnimals && (
                          <div className="feature-card-uses text-muted small">
                            Spellcasting ability: {speakWithAnimalsAbilityMeta}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : !error ? (
                <div className="text-center text-muted">No features found</div>
              ) : null}
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
        </div>
      </Modal>
      <FeatureModal
        show={showModal}
        onHide={() => setShowModal(false)}
        feature={modalFeature}
      />
      <UpcastModal
        show={showUpcast}
        onHide={closePendingSpellModal}
        baseLevel={
          Number.isFinite(Number(pendingSpell?.baseLevel))
            ? Math.max(1, Math.floor(Number(pendingSpell?.baseLevel)))
            : Number.isFinite(Number(pendingSpell?.level))
            ? Math.max(1, Math.floor(Number(pendingSpell?.level)))
            : 1
        }
        slots={availableSlots}
        onSelect={handlePendingSpellSlotCast}
        proficiencyAction={
          pendingFreeCastConfig
            ? {
                label: pendingFreeCastConfig.label || 'P',
                icon: pendingFreeCastConfig.icon,
                ariaLabel:
                  pendingFreeCastConfig.ariaLabel ||
                  'cast using proficiency feature',
                remainingText: pendingFreeCastConfig.remainingLabel
                  ? `${pendingFreeCastConfig.remainingLabel}: ${pendingFreeCastRemaining}`
                  : `Uses remaining: ${pendingFreeCastRemaining}`,
                disabled:
                  !!pendingFreeCastConfig.disabled ||
                  pendingFreeCastRemaining <= 0,
                onClick: handlePendingSpellFreeCast,
              }
            : undefined
        }
      />
    </>
  );
}
