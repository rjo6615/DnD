
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import apiFetch from '../../../utils/apiFetch';
import { useParams } from "react-router-dom";
import { Nav, Navbar, Container, Button } from 'react-bootstrap';
import '../../../App.scss';
import loginbg from "../../../images/loginbg.png";
import CharacterInfo from "../attributes/CharacterInfo";
import Stats from "../attributes/Stats";
import Skills from "../attributes/Skills";
import Feats from "../attributes/Feats";
import { calculateFeatPointsLeft } from '../../../utils/featUtils';
import PlayerTurnActions, {
  calculateDamage,
} from "../attributes/PlayerTurnActions";
import Help from "../attributes/Help";
import { SKILLS } from "../skillSchema";
import HealthDefense from "../attributes/HealthDefense";
import SpellSelector from "../attributes/SpellSelector";
import StatusEffectBar from "../attributes/StatusEffectBar";
import BackgroundModal from "../attributes/BackgroundModal";
import Features from "../attributes/Features";
import SpellSlots from "../attributes/SpellSlots";
import { fullCasterSlots, pactMagic } from '../../../utils/spellSlots';
import hasteIcon from "../../../images/spell-haste-icon.png";
import ShopModal from "../attributes/ShopModal";
import InventoryModal from "../attributes/InventoryModal";
import { normalizeItems as normalizeInventoryItems } from "../attributes/inventoryNormalization";

const HEADER_PADDING = 16;
const SPELLCASTING_CLASSES = {
  bard: 'full',
  cleric: 'full',
  druid: 'full',
  sorcerer: 'full',
  wizard: 'full',
  warlock: 'full',
  paladin: 'half',
  ranger: 'half',
};

export default function ZombiesCharacterSheet() {
  const params = useParams();
  const characterId = params.id; 
  const [form, setForm] = useState(null);
  const [showCharacterInfo, setShowCharacterInfo] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSkill, setShowSkill] = useState(false); // State for skills modal
  const [showFeats, setShowFeats] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [shopTab, setShopTab] = useState('weapons');
  const [showInventory, setShowInventory] = useState(false);
  const [inventoryTab, setInventoryTab] = useState('weapons');
  const [showSpells, setShowSpells] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showBackground, setShowBackground] = useState(false);
  const [spellPointsLeft, setSpellPointsLeft] = useState(0);
  const [longRestCount, setLongRestCount] = useState(0);
  const [shortRestCount, setShortRestCount] = useState(0);
  const [activeEffects, setActiveEffects] = useState([]);
  const baseActionCount = form?.features?.actionCount ?? 1;
  const [actionCount, setActionCount] = useState(baseActionCount);
  const initCircleState = () => ({
    0: 'active',
    1: 'active',
    2: 'active',
    3: 'active',
  });
  const [usedSlots, setUsedSlots] = useState({
    action: initCircleState(),
    bonus: initCircleState(),
  });

  useEffect(() => {
    const handlePass = () => {
      setActiveEffects((prev) =>
        prev
          .map((e) =>
            e.name === 'Haste'
              ? { ...e, remaining: (e.remaining || 0) - 1 }
              : e
          )
          .filter((e) => e.name !== 'Haste' || e.remaining > 0)
      );
    };
    window.addEventListener('pass-turn', handlePass);
    return () => window.removeEventListener('pass-turn', handlePass);
  }, []);

  useEffect(() => {
    // Clear effects on rest
    setActiveEffects([]);
  }, [longRestCount, shortRestCount]);

  useEffect(() => {
    const hasteActive = activeEffects.some((e) => e.name === 'Haste');
    const desired = baseActionCount + (hasteActive ? 1 : 0);
    setActionCount(desired);
    setUsedSlots((used) => {
      const action = { ...used.action };
      for (let i = 0; i < desired; i++) {
        if (!(i in action)) action[i] = 'active';
      }
      Object.keys(action).forEach((key) => {
        if (Number(key) >= desired) delete action[key];
      });
      return { ...used, action };
    });
  }, [baseActionCount, activeEffects]);

  const consumeCircle = useCallback(
    (type, index) => {
      setUsedSlots((prev) => {
        const currentState = prev[type] || initCircleState();
        const nextState = { ...currentState };
        if (typeof index === 'number') {
          const cur = currentState[index] || 'active';
          nextState[index] = cur === 'active' ? 'used' : 'active';
        } else {
          const first = Object.keys(nextState).find((key) => nextState[key] === 'active');
          if (typeof first !== 'undefined') nextState[first] = 'used';
        }
        return { ...prev, [type]: nextState };
      });
    },
    [initCircleState]
  );

  const handleActionSurge = useCallback(() => {
    setActionCount((prev) => {
      const next = prev + 1;
      setUsedSlots((used) => ({
        ...used,
        action: { ...used.action, [next - 1]: 'active' },
      }));
      return next;
    });
  }, []);

  const playerTurnActionsRef = useRef(null);

  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [navHeight, setNavHeight] = useState(0);

  useEffect(() => {
    setUsedSlots({ action: initCircleState(), bonus: initCircleState() });
    setActionCount(baseActionCount);
  }, [longRestCount, baseActionCount]);

  useEffect(() => {
    setUsedSlots((prev) => {
      const updated = { ...prev, action: initCircleState(), bonus: initCircleState() };
      Object.keys(updated).forEach((key) => {
        if (key.startsWith('warlock-')) delete updated[key];
      });
      return updated;
    });
    setActionCount(baseActionCount);
  }, [shortRestCount, baseActionCount]);

  useEffect(() => {
    const handler = () => {
      setUsedSlots((prev) => ({
        ...prev,
        action: initCircleState(),
        bonus: initCircleState(),
      }));
      const hasteActive = activeEffects.some((e) => e.name === 'Haste');
      setActionCount(baseActionCount + (hasteActive ? 1 : 0));
    };
    window.addEventListener('pass-turn', handler);
    return () => window.removeEventListener('pass-turn', handler);
  }, [baseActionCount, activeEffects]);

  useEffect(() => {
    const nav = document.querySelector('.navbar.fixed-top');
    if (nav) {
      setNavHeight(nav.offsetHeight);
    }
  }, []);

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight + navHeight + HEADER_PADDING);
    }
  }, [form, navHeight]);

  useEffect(() => {
    async function fetchCharacterData(id) {
      try {
        const response = await apiFetch(`/characters/${id}`);
        if (!response.ok) {
          throw new Error(`Error fetching character data: ${response.statusText}`);
        }
        const data = await response.json();
        const feats = (data.feat || []).map((feat) => {
          if (!Array.isArray(feat)) return feat;
          const [featName = "", notes = "", ...rest] = feat;
          const skillVals = rest.slice(0, SKILLS.length);
          const abilityVals = rest.slice(SKILLS.length, SKILLS.length + 6);
          const [initiative = 0, ac = 0, speed = 0, hpMaxBonus = 0, hpMaxBonusPerLevel = 0] =
            rest.slice(SKILLS.length + 6);
          const featObj = { featName, notes };
          SKILLS.forEach(({ key }, idx) => {
            featObj[key] = Number(skillVals[idx] || 0);
          });
          ["str", "dex", "con", "int", "wis", "cha"].forEach((stat, idx) => {
            featObj[stat] = Number(abilityVals[idx] || 0);
          });
          Object.assign(featObj, {
            initiative: Number(initiative || 0),
            ac: Number(ac || 0),
            speed: Number(speed || 0),
            hpMaxBonus: Number(hpMaxBonus || 0),
            hpMaxBonusPerLevel: Number(hpMaxBonusPerLevel || 0),
          });
          return featObj;
        });
        setForm({
          ...data,
          feat: feats,
          weapon: data.weapon || [],
          armor: data.armor || [],
          item: data.item || [],
        });
      } catch (error) {
        console.error(error);
      }
    }

    fetchCharacterData(characterId);
  }, [characterId]);

  const handleShowCharacterInfo = () => setShowCharacterInfo(true);
  const handleCloseCharacterInfo = () => setShowCharacterInfo(false);
  const handleShowStats = () => setShowStats(true);
  const handleCloseStats = () => setShowStats(false);
  const handleShowSkill = () => setShowSkill(true); // Handler to show skills modal
  const handleCloseSkill = () => setShowSkill(false); // Handler to close skills modal
  const handleShowFeats = () => setShowFeats(true);
  const handleCloseFeats = () => setShowFeats(false);
  const handleShowFeatures = () => setShowFeatures(true);
  const handleCloseFeatures = () => setShowFeatures(false);
  const handleShowShop = (tab) => {
    setShopTab((prevTab) => tab ?? prevTab ?? 'weapons');
    setShowShop(true);
  };
  const handleCloseShop = () => setShowShop(false);
  const handleShowInventory = (tab) => {
    setInventoryTab((prevTab) => tab ?? prevTab ?? 'weapons');
    setShowInventory(true);
  };
  const handleCloseInventory = () => setShowInventory(false);
  const handleShowSpells = () => setShowSpells(true);
  const handleCloseSpells = () => setShowSpells(false);
  const handleShowHelpModal = () => setShowHelpModal(true);
  const handleCloseHelpModal = () => setShowHelpModal(false);
  const handleShowBackground = () => setShowBackground(true);
  const handleCloseBackground = () => setShowBackground(false);

  const handleRollResult = (result, breakdown) => {
    playerTurnActionsRef.current?.updateDamageValueWithAnimation(
      result,
      breakdown
    );
  };

  const handleLongRest = () => {
    setLongRestCount((c) => c + 1);
  };

  const handleShortRest = () => {
    setShortRestCount((c) => c + 1);
  };

  const handleCastSpell = useCallback(
    (arg, lvl, idx) => {
      if (arg === 'action' || arg === 'bonus') {
        consumeCircle(arg, lvl);
        return;
      }
      const consumeSlot = (level, preferredType) => {
        const occupations = form?.occupation || [];
        let casterLevel = 0;
        let warlockLevel = 0;
        occupations.forEach((occ) => {
          const name = (occ.Name || occ.Occupation || '').toLowerCase();
          const levelNum = Number(occ.Level) || 0;
          if (name === 'warlock') {
            warlockLevel += levelNum;
            return;
          }
          const progression = SPELLCASTING_CLASSES[name];
          if (progression === 'full') {
            casterLevel += levelNum;
          } else if (progression === 'half') {
            casterLevel += levelNum === 1 ? 0 : Math.ceil(levelNum / 2);
          }
        });
        const slotData = fullCasterSlots[casterLevel] || {};
        const warlockData = pactMagic[warlockLevel] || {};
        const tryConsume = (type, data) => {
          const count = data[level];
          if (!count) return false;
          const key = `${type}-${level}`;
          setUsedSlots((prev) => {
            const levelState = { ...(prev[key] || {}) };
            for (let i = 0; i < count; i += 1) {
              if (!levelState[i]) {
                levelState[i] = true;
                return { ...prev, [key]: levelState };
              }
            }
            return prev;
          });
          return true;
        };
        if (preferredType === 'warlock') {
          if (tryConsume('warlock', warlockData)) return;
          tryConsume('regular', slotData);
          return;
        }
        if (preferredType === 'regular') {
          if (tryConsume('regular', slotData)) return;
          tryConsume('warlock', warlockData);
          return;
        }
        if (tryConsume('regular', slotData)) return;
        tryConsume('warlock', warlockData);
      };

      if (typeof arg === 'object') {
        const {
          level,
          damage,
          extraDice,
          levelsAbove,
          slotLevel,
          slotType,
          castingTime,
          name,
          spellName: altName,
        } = arg;
        const castLevel = typeof slotLevel === 'number' ? slotLevel : level;
        consumeSlot(castLevel, slotType);
        if (castingTime?.includes('1 action')) consumeCircle('action');
        else if (castingTime?.includes('1 bonus action')) consumeCircle('bonus');
        let result;
        if (typeof damage === 'number') {
          result = { total: damage };
        } else if (damage) {
          const calc = calculateDamage(
            damage,
            0,
            false,
            undefined,
            extraDice,
            levelsAbove
          );
          result =
            calc && typeof calc === 'object'
              ? calc
              : { total: calc };
        } else {
          const spellLabel = name || altName;
          result = { total: spellLabel || 'Spell Cast' };
        }
        playerTurnActionsRef.current?.updateDamageValueWithAnimation(
          result?.total,
          result?.breakdown
        );
        if (name === 'Haste') {
          setActiveEffects((prev) => [
            ...prev,
            { name: 'Haste', icon: hasteIcon, remaining: 10 },
          ]);
        }
        return;
      }
      if (typeof lvl === 'undefined') {
        consumeSlot(arg);
        return;
      }
      if (typeof idx === 'undefined') {
        consumeSlot(lvl, arg);
        return;
      }
      const type = arg;
      const key = `${type}-${lvl}`;
      setUsedSlots((prev) => {
        const levelState = { ...(prev[key] || {}) };
        levelState[idx] = !levelState[idx];
        return { ...prev, [key]: levelState };
      });
    },
    [form, consumeCircle]
  );

  const availableSlots = useMemo(() => {
    if (!form) return {};
    const occupations = form.occupation || [];
    let casterLevel = 0;
    let warlockLevel = 0;
    occupations.forEach((occ) => {
      const name = (occ.Name || occ.Occupation || '').toLowerCase();
      const level = Number(occ.Level) || 0;
      if (name === 'warlock') {
        warlockLevel += level;
        return;
      }
      const progression = SPELLCASTING_CLASSES[name];
      if (progression === 'full') {
        casterLevel += level;
      } else if (progression === 'half') {
        casterLevel += level === 1 ? 0 : Math.ceil(level / 2);
      }
    });
    const slotData = fullCasterSlots[casterLevel] || {};
    const warlockData = pactMagic[warlockLevel] || {};

    const regular = {};
    Object.entries(slotData).forEach(([lvl, count]) => {
      const used = Object.values(usedSlots[`regular-${lvl}`] || {}).filter(Boolean)
        .length;
      const left = count - used;
      if (left > 0) regular[lvl] = left;
    });

    const warlock = {};
    Object.entries(warlockData).forEach(([lvl, count]) => {
      const used = Object.values(usedSlots[`warlock-${lvl}`] || {}).filter(Boolean)
        .length;
      const left = count - used;
      if (left > 0) warlock[lvl] = left;
    });

    return { regular, warlock };
  }, [form, usedSlots]);

  const handleWeaponsChange = useCallback(
    async (weapons) => {
      setForm((prev) => ({ ...prev, weapon: weapons }));
      try {
        await apiFetch(`/equipment/update-weapon/${characterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weapon: weapons }),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    },
    [characterId]
  );

  const handleArmorChange = useCallback(
    async (armor) => {
      setForm((prev) => ({ ...prev, armor }));
      try {
        await apiFetch(`/equipment/update-armor/${characterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ armor }),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    },
    [characterId]
  );

  const handleItemsChange = useCallback(
    async (items) => {
      setForm((prev) => ({ ...prev, item: items }));
      try {
        await apiFetch(`/equipment/update-item/${characterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: items }),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    },
    [characterId]
  );

  const handleEquipmentChange = useCallback((equipment = {}) => {
    setForm((prev) => ({ ...prev, equipment }));
  }, []);

  const handleShopPurchase = useCallback(
    async (cart = [], totalCostCp = 0) => {
      if (!form) return;

      const normalizedCost = Number.isFinite(totalCostCp)
        ? Math.round(totalCostCp)
        : 0;

      let updatedCurrency;
      try {
        const response = await apiFetch(`/characters/${characterId}/currency`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cp: -normalizedCost }),
        });
        if (!response.ok) {
          throw new Error(`Failed to update currency: ${response.statusText}`);
        }
        updatedCurrency = await response.json();
        setForm((prev) => ({
          ...prev,
          cp: updatedCurrency.cp ?? prev?.cp ?? 0,
          sp: updatedCurrency.sp ?? prev?.sp ?? 0,
          gp: updatedCurrency.gp ?? prev?.gp ?? 0,
          pp: updatedCurrency.pp ?? prev?.pp ?? 0,
        }));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        return;
      }

      const purchaseItems = Array.isArray(cart) ? cart : [];

      const newWeapons = [];
      const newArmor = [];
      const newItems = [];

      purchaseItems.forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        if (entry.type === 'weapon') {
          const { type: _ignored, weaponType, ...rest } = entry;
          const sanitized = {
            ...rest,
            ...(weaponType !== undefined ? { type: weaponType } : {}),
            owned: true,
          };
          newWeapons.push(sanitized);
          return;
        }
        if (entry.type === 'armor') {
          const { type: _ignored, armorType, ...rest } = entry;
          const sanitized = {
            ...rest,
            ...(armorType !== undefined ? { type: armorType } : {}),
            owned: true,
          };
          newArmor.push(sanitized);
          return;
        }
        if (entry.type === 'item') {
          const { type: _ignored, itemType, ...rest } = entry;
          const sanitized = {
            ...rest,
            ...(itemType !== undefined ? { type: itemType } : {}),
            owned: true,
          };
          newItems.push(sanitized);
        }
      });

      if (newWeapons.length) {
        const updatedWeapons = [
          ...(Array.isArray(form.weapon) ? form.weapon : []),
          ...newWeapons,
        ];
        await handleWeaponsChange(updatedWeapons);
      }

      if (newArmor.length) {
        const updatedArmor = [
          ...(Array.isArray(form.armor) ? form.armor : []),
          ...newArmor,
        ];
        await handleArmorChange(updatedArmor);
      }

      if (newItems.length) {
        const normalizedExistingItems = normalizeInventoryItems(
          Array.isArray(form.item) ? form.item : [],
          { includeUnowned: true }
        );
        const updatedItems = [...normalizedExistingItems, ...newItems];
        await handleItemsChange(updatedItems);
      }
    },
    [
      characterId,
      form,
      handleArmorChange,
      handleItemsChange,
      handleWeaponsChange,
      setForm,
    ]
  );

  const itemBonus = (form?.item || []).reduce(
    (acc, el) => ({
      str: acc.str + Number(el.statBonuses?.str || 0),
      dex: acc.dex + Number(el.statBonuses?.dex || 0),
      con: acc.con + Number(el.statBonuses?.con || 0),
      int: acc.int + Number(el.statBonuses?.int || 0),
      wis: acc.wis + Number(el.statBonuses?.wis || 0),
      cha: acc.cha + Number(el.statBonuses?.cha || 0),
    }),
    { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
  );

  const featBonus = (form?.feat || []).reduce(
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

  const computedStats = {
    str: (form?.str || 0) + itemBonus.str + featBonus.str + (form?.race?.abilities?.str || 0),
    dex: (form?.dex || 0) + itemBonus.dex + featBonus.dex + (form?.race?.abilities?.dex || 0),
    con: (form?.con || 0) + itemBonus.con + featBonus.con + (form?.race?.abilities?.con || 0),
    int: (form?.int || 0) + itemBonus.int + featBonus.int + (form?.race?.abilities?.int || 0),
    wis: (form?.wis || 0) + itemBonus.wis + featBonus.wis + (form?.race?.abilities?.wis || 0),
    cha: (form?.cha || 0) + itemBonus.cha + featBonus.cha + (form?.race?.abilities?.cha || 0),
  };

  const statMods = {
    str: Math.floor((computedStats.str - 10) / 2),
    dex: Math.floor((computedStats.dex - 10) / 2),
    con: Math.floor((computedStats.con - 10) / 2),
    int: Math.floor((computedStats.int - 10) / 2),
    wis: Math.floor((computedStats.wis - 10) / 2),
    cha: Math.floor((computedStats.cha - 10) / 2),
  };

  const SPELLCASTING_ABILITIES = {
    cleric: 'wis',
    druid: 'wis',
    wizard: 'int',
  };
  const spellcastingClass = (form?.occupation || [])
    .map((cls) => (cls.Name || cls.Occupation || '').toLowerCase())
    .find((name) => SPELLCASTING_CLASSES[name]);
  const spellAbilityKey =
    spellcastingClass && (SPELLCASTING_ABILITIES[spellcastingClass] || 'cha');
  const hasSpellcasting = (form?.occupation || []).some((cls) => {
    const name = (cls.Name || cls.Occupation || '').toLowerCase();
    const progression = SPELLCASTING_CLASSES[name];
    const level = Number(cls.Level) || 0;
    if (!progression) return false;
    if (progression === 'full') return level >= 1;
    if (progression === 'half') return level >= 2;
    return false;
  });

  const spellAbilityMod = hasSpellcasting ? statMods[spellAbilityKey] : null;

  useEffect(() => {
    async function calculateSpellPoints() {
      if (!form) return;
      if (typeof form.spellPoints === 'number') {
        setSpellPointsLeft(form.spellPoints);
        return;
      }
      if (!hasSpellcasting) {
        setSpellPointsLeft(0);
        return;
      }
      try {
        const counts = await Promise.all(
          (form.occupation || []).map(async (cls) => {
            const name = (cls.Name || cls.Occupation || '').toLowerCase();
            const level = Number(cls.Level) || 0;
            const progression = SPELLCASTING_CLASSES[name];
            if (!progression) return 0;
            if (progression === 'half' && level < 2) return 0;
            const abilityMod = ['cleric', 'druid'].includes(name)
              ? statMods.wis
              : statMods.cha;
            const res = await apiFetch(
              `/classes/${name}/features/${level}?abilityMod=${abilityMod}`
            );
            if (!res.ok) return 0;
            const data = await res.json();
            return typeof data.spellsKnown === 'number' ? data.spellsKnown : 0;
          })
        );
        const totalAllowed = counts.reduce((sum, n) => sum + n, 0);
        const learnedCount = (form.spells || []).length;
        setSpellPointsLeft(Math.max(0, totalAllowed - learnedCount));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        setSpellPointsLeft(0);
      }
    }
    calculateSpellPoints();
  }, [form, hasSpellcasting, statMods.cha, statMods.wis]);

  if (!form) {
    return <div style={{ fontFamily: 'Raleway, sans-serif', backgroundImage: `url(${loginbg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", minHeight: "100vh"}}>Loading...</div>;
  }

  const statNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const totalLevel = form.occupation.reduce((total, el) => total + Number(el.Level), 0);
  const statTotal = statNames.reduce((sum, stat) => sum + form[stat], 0);
  // Characters no longer receive stat points from leveling
  const statPointsLeft = form.startStatTotal - statTotal;

  const skillPointsLeft =
    (form.proficiencyPoints || 0) -
    Object.entries(form.skills || {}).filter(
      ([key, s]) => s.proficient && !form.race?.skills?.[key]?.proficient
    ).length;
  const expertisePointsLeft =
    (form.expertisePoints || 0) -
    Object.entries(form.skills || {}).filter(
      ([key, s]) =>
        s.expertise &&
        !form.race?.skills?.[key]?.expertise &&
        !form.background?.skills?.[key]?.expertise
    ).length;
  const skillsGold =
    skillPointsLeft > 0 || expertisePointsLeft > 0 ? 'gold' : '#6C757D';

// ---------------------------------------Feats and bonuses----------------------------------------------
const featBonuses = (form.feat || []).reduce(
  (acc, feat) => {
    acc.initiative += Number(feat.initiative || 0);
    acc.speed += Number(feat.speed || 0);
    acc.ac += Number(feat.ac || 0);
    acc.hpMaxBonus += Number(feat.hpMaxBonus || 0);
    acc.hpMaxBonusPerLevel += Number(feat.hpMaxBonusPerLevel || 0);
    return acc;
  },
  {
    initiative: 0,
    speed: 0,
    ac: 0,
    hpMaxBonus: 0,
    hpMaxBonusPerLevel: 0,
  }
);

const featPointsLeft = calculateFeatPointsLeft(form.occupation, form.feat);
const featsGold = featPointsLeft > 0 ? "gold" : "#6C757D";
const spellsGold =
  hasSpellcasting && spellPointsLeft > 0 ? 'gold' : '#6C757D';
return (
  <div
    className="text-center"
    style={{
      fontFamily: 'Raleway, sans-serif',
      backgroundImage: `url(${loginbg})`,
      height: "100vh",
      overflow: "hidden",
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat",
      paddingTop: navHeight + HEADER_PADDING,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <div ref={headerRef}>
      <h1
        style={{
          fontSize: "28px",
          fontWeight: 600,
          color: "#FFFFFF",
          padding: "8px 0",
          textAlign: "center",
          letterSpacing: "1px",
          textShadow: "1px 1px 2px rgba(0, 0, 0, 0.4)",
          fontFamily: "'Merriweather', serif",
          textTransform: "capitalize",
          borderBottom: "2px solid #555", // Subtle underline for structure
          display: "inline-block",
        }}
        className="mx-auto"
      >
        {form.characterName}
      </h1>

      <HealthDefense
        form={form}
        totalLevel={totalLevel}
        dexMod={statMods.dex}
        conMod={statMods.con}
        initiative={featBonuses.initiative}
        speed={featBonuses.speed}
        ac={featBonuses.ac}
        hpMaxBonus={featBonuses.hpMaxBonus}
        hpMaxBonusPerLevel={featBonuses.hpMaxBonusPerLevel}
        {...(spellAbilityMod !== null && { spellAbilityMod })}
      />
    </div>
    <div
      style={{
        height: `calc(100vh - ${headerHeight}px)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <StatusEffectBar effects={activeEffects} />
      </div>
      <PlayerTurnActions
        form={form}
        dexMod={statMods.dex}
        strMod={statMods.str}
        ref={playerTurnActionsRef}
        onCastSpell={handleCastSpell}
        availableSlots={availableSlots}
        longRestCount={longRestCount}
        shortRestCount={shortRestCount}
        onPassTurn={() => window.dispatchEvent(new Event('pass-turn'))}
      />
    </div>
    {form && (
      <SpellSlots
        form={form}
        used={usedSlots}
        onToggleSlot={handleCastSpell}
        actionCount={actionCount}
        longRestCount={longRestCount}
        shortRestCount={shortRestCount}
        onActionSurge={handleActionSurge}
      />
    )}
    <Navbar
      fixed="bottom"
      data-bs-theme="dark"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <Container style={{ backgroundColor: 'transparent' }}>
        <Nav
          className="me-auto mx-auto"
          style={{ backgroundColor: 'transparent' }}
        >
          <Button
            onClick={handleShowCharacterInfo}
            style={{ color: "black" }}
            className="footer-btn"
            variant="secondary"
          >
            <i className="fas fa-image-portrait" aria-hidden="true"></i>
          </Button>
          <Button
            onClick={handleShowStats}
            style={{
              color: "black",
              backgroundColor: statPointsLeft > 0 ? "gold" : "#6C757D",
            }}
            className="footer-btn"
            variant="secondary"
          >
            <i className="fas fa-scroll" aria-hidden="true"></i>
          </Button>
          <Button
            onClick={handleShowSkill}
            style={{
              color: "black",
              backgroundColor: skillsGold,
            }}
            className={`footer-btn ${
              skillPointsLeft > 0 || expertisePointsLeft > 0 ? 'points-glow' : ''
            }`}
            variant="secondary"
          >
            <i className="fas fa-book-open" aria-hidden="true"></i>
          </Button>
          <Button
            onClick={handleShowFeats}
            style={{
              color: "black",
              backgroundColor: featsGold,
            }}
            className={`footer-btn ${featPointsLeft > 0 ? 'points-glow' : ''}`}
            variant="secondary"
          >
            <i className="fas fa-hand-fist" aria-hidden="true"></i>
          </Button>
          <Button
            onClick={handleShowFeatures}
            style={{
              color: "black",
              backgroundColor: "#6C757D",
            }}
            className="footer-btn"
            variant="secondary"
          >
            <i className="fas fa-star" aria-hidden="true"></i>
          </Button>
          {hasSpellcasting && (
            <Button
              onClick={handleShowSpells}
              style={{
                color: 'black',
                backgroundColor: spellsGold,
              }}
              className={`footer-btn ${spellPointsLeft > 0 ? 'points-glow' : ''}`}
              variant="secondary"
            >
              <i className="fas fa-hat-wizard" aria-hidden="true"></i>
            </Button>
          )}
          <Button
            onClick={() => handleShowInventory()}
            style={{
              color: "black",
              backgroundColor: "#6C757D",
            }}
            className="footer-btn"
            variant="secondary"
          >
            <i className="fas fa-box-open" aria-hidden="true"></i>
          </Button>
          <Button
            onClick={() => handleShowShop()}
            style={{
              color: "black",
              backgroundColor: "#6C757D",
            }}
            className="footer-btn"
            variant="secondary"
          >
            <i className="fas fa-store" aria-hidden="true"></i>
          </Button>
          <Button
            onClick={handleShowHelpModal}
            style={{ color: "white" }}
            className="footer-btn"
            variant="primary"
          >
            <i className="fas fa-info" aria-hidden="true"></i>
          </Button>
        </Nav>
      </Container>
    </Navbar>
    <CharacterInfo
      form={form}
      show={showCharacterInfo}
      handleClose={handleCloseCharacterInfo}
      onShowBackground={handleShowBackground}
      onLongRest={handleLongRest}
      onShortRest={handleShortRest}
    />
    <Skills
      form={form}
      showSkill={showSkill}
      handleCloseSkill={handleCloseSkill}
      totalLevel={totalLevel}
      strMod={statMods.str}
      dexMod={statMods.dex}
      conMod={statMods.con}
      intMod={statMods.int}
      chaMod={statMods.cha}
      wisMod={statMods.wis}
      onSkillsChange={(skills) => setForm((prev) => ({ ...prev, skills }))}
      onRollResult={handleRollResult}
    />
    <Stats form={form} showStats={showStats} handleCloseStats={handleCloseStats} />
    <BackgroundModal
      show={showBackground}
      onHide={handleCloseBackground}
      background={form.background}
    />
    <Feats form={form} showFeats={showFeats} handleCloseFeats={handleCloseFeats} />
    <Features
      form={form}
      showFeatures={showFeatures}
      handleCloseFeatures={handleCloseFeatures}
      onActionSurge={handleActionSurge}
      longRestCount={longRestCount}
      shortRestCount={shortRestCount}
      actionCount={actionCount}
    />
    <InventoryModal
      show={showInventory}
      activeTab={inventoryTab}
      onHide={handleCloseInventory}
      onTabChange={setInventoryTab}
      form={form}
      characterId={characterId}
      onEquipmentChange={handleEquipmentChange}
    />
    <ShopModal
      show={showShop}
      activeTab={shopTab}
      onHide={handleCloseShop}
      onTabChange={setShopTab}
      form={form}
      characterId={characterId}
      strength={computedStats.str}
      onWeaponsChange={handleWeaponsChange}
      onArmorChange={handleArmorChange}
      onItemsChange={handleItemsChange}
      currency={{
        cp: form?.cp ?? 0,
        sp: form?.sp ?? 0,
        gp: form?.gp ?? 0,
        pp: form?.pp ?? 0,
      }}
      onPurchase={handleShopPurchase}
    />
    {hasSpellcasting && (
      <SpellSelector
        form={form}
        show={showSpells}
        handleClose={handleCloseSpells}
        onSpellsChange={(spells, spellPoints) =>
          setForm((prev) => ({ ...prev, spells, spellPoints }))
        }
        onCastSpell={handleCastSpell}
        availableSlots={availableSlots}
      />
    )}
    <Help
      form={form}
      showHelpModal={showHelpModal}
      handleCloseHelpModal={handleCloseHelpModal}
    />
  </div>
);
}