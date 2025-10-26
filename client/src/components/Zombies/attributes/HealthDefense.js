import React, { useEffect, useMemo, useState } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Button } from 'react-bootstrap'; // Adjust as per your actual UI library
import { useParams } from "react-router-dom";
import proficiencyBonus from '../../../utils/proficiencyBonus';
import { normalizeEquipmentMap } from './equipmentNormalization';
import { calculateCharacterHitPoints } from '../utils/characterMetrics';

export default function HealthDefense({
  form,
  conMod,
  dexMod,
  wisMod = 0,
  totalLevel,
  ac = 0,
  hpMaxBonus = 0,
  hpMaxBonusPerLevel = 0,
  initiative = 0,
  speed = 0,
  speedMultiplier = 1,
  spellAbilityMod,
  onTempHealthChange,
}) {
  const params = useParams();
  const isLargeScreen =
    typeof window !== 'undefined' && window.innerWidth >= 768;
  const wrapperGap = isLargeScreen ? '32px' : 'clamp(16px, 4vh, 24px)';
  const wrapperMarginBottom = isLargeScreen ? '64px' : '0.5rem';
//-----------------------Health/Defense------------------------------
  const hasEquipment = typeof form?.equipment === 'object' && form.equipment !== null;
  const normalizedEquipment = useMemo(
    () => normalizeEquipmentMap(form.equipment),
    [form.equipment]
  );
  const armorItems = useMemo(() => {
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
    return Array.isArray(form.armor) ? form.armor.filter(Boolean) : [];
  }, [hasEquipment, normalizedEquipment, form.armor]);

  const armorAcBonus = armorItems.map((item) => {
    if (Array.isArray(item)) {
      const value = Number(item[1] ?? 0);
      return value > 10 ? value - 10 : value;
    }
    return Number(item.acBonus ?? item.armorBonus ?? item.ac ?? 0);
  });
  const armorMaxDexBonus = armorItems.map((item) =>
    Array.isArray(item)
      ? Number(item[2] ?? 0)
      : Number(item.maxDex ?? item.maxDexterity ?? 0)
  );
  let totalArmorAcBonus =
    armorAcBonus.reduce((partialSum, a) => Number(partialSum) + Number(a), 0) +
    Number(ac);
  let filteredMaxDexArray = armorMaxDexBonus.filter((e) => e !== 0);
  let armorMaxDexMin = Math.min(...filteredMaxDexArray);

     let armorMaxDex;
     if (Number(armorMaxDexMin) < Number(dexMod) && Number(armorMaxDexMin > 0)) {
        armorMaxDex = armorMaxDexMin;
     } else {
      armorMaxDex = dexMod;
     }

  const numericWisMod = Number(wisMod);
  const safeWisMod = Number.isFinite(numericWisMod) ? numericWisMod : 0;

  const isShieldItem = (item) => {
    if (!item) return false;
    if (Array.isArray(item)) {
      const [name] = item;
      return typeof name === 'string' && name.toLowerCase().includes('shield');
    }
    const category = String(item.category ?? item.type ?? '').toLowerCase();
    if (category.includes('shield')) {
      return true;
    }
    const name = String(item.name ?? item.title ?? item.displayName ?? item.label ?? '').toLowerCase();
    return name.includes('shield');
  };

  const hasShieldEquipped = useMemo(
    () => armorItems.some((item) => isShieldItem(item)),
    [armorItems]
  );

  const hasArmorEquipped = useMemo(
    () =>
      armorItems.some((item) => {
        if (!item) return false;
        if (isShieldItem(item)) return false;
        if (Array.isArray(item)) return true;
        const source = String(item.__source ?? item.source ?? '').toLowerCase();
        if (source === 'armor') {
          return true;
        }
        return false;
      }),
    [armorItems]
  );

  const hasUnarmoredDefenseFeature = useMemo(() => {
    const searchValue = 'unarmored defense';
    const checkValue = (value) => {
      if (!value) return false;
      if (Array.isArray(value)) {
        return value.some((entry) => checkValue(entry));
      }
      if (typeof value === 'object') {
        return Object.values(value).some((entry) => checkValue(entry));
      }
      return typeof value === 'string' && value.toLowerCase().includes(searchValue);
    };

    return checkValue(form?.features);
  }, [form?.features]);

  const monkLevel = useMemo(() => {
    if (!Array.isArray(form?.occupation)) {
      return 0;
    }
    return form.occupation.reduce((total, occupationEntry) => {
      if (!occupationEntry || typeof occupationEntry !== 'object') {
        return total;
      }
      const name = String(
        occupationEntry.Name ??
          occupationEntry.Occupation ??
          occupationEntry.name ??
          occupationEntry.occupation ??
          ''
      ).toLowerCase();
      if (name !== 'monk') {
        return total;
      }
      const levelValue = Number(
        occupationEntry.Level ??
          occupationEntry.level ??
          occupationEntry.Levels ??
          occupationEntry.levels ??
          0
      );
      if (!Number.isFinite(levelValue) || levelValue <= 0) {
        return total;
      }
      return total + levelValue;
    }, 0);
  }, [form?.occupation]);

  const hasMonkLevels = monkLevel > 0;

  const shouldApplyUnarmoredDefenseWisBonus = useMemo(() => {
    if (hasArmorEquipped || hasShieldEquipped) {
      return false;
    }
    if (!Number.isFinite(numericWisMod)) {
      return false;
    }
    return hasUnarmoredDefenseFeature || hasMonkLevels;
  }, [
    hasArmorEquipped,
    hasShieldEquipped,
    hasMonkLevels,
    hasUnarmoredDefenseFeature,
    numericWisMod,
  ]);

  const wisdomBonusToAc = shouldApplyUnarmoredDefenseWisBonus ? safeWisMod : 0;

  const totalArmorClass = Number(totalArmorAcBonus) + 10 + Number(armorMaxDex) + wisdomBonusToAc;
    
  const derivedTotalLevel = useMemo(() => {
    if (Number.isFinite(totalLevel)) {
      return totalLevel;
    }
    if (!Array.isArray(form?.occupation)) {
      return 0;
    }
    return form.occupation.reduce((total, o) => total + Number(o?.Level || 0), 0);
  }, [form?.occupation, totalLevel]);

  const profBonus = form.proficiencyBonus ?? proficiencyBonus(derivedTotalLevel);
  const spellSaveDC =
    spellAbilityMod != null ? 8 + profBonus + spellAbilityMod : null;

  const { currentHp: computedCurrentHp, maxHp } = useMemo(() => {
    const overrides = {
      conMod,
      totalLevel: derivedTotalLevel,
    };

    const numericHpMaxBonus = Number(hpMaxBonus);
    if (Number.isFinite(numericHpMaxBonus) && numericHpMaxBonus !== 0) {
      overrides.hpMaxBonus = numericHpMaxBonus;
    }

    const numericHpMaxBonusPerLevel = Number(hpMaxBonusPerLevel);
    if (
      Number.isFinite(numericHpMaxBonusPerLevel) &&
      numericHpMaxBonusPerLevel !== 0
    ) {
      overrides.hpMaxBonusPerLevel = numericHpMaxBonusPerLevel;
    }

    return calculateCharacterHitPoints(form, overrides);
  }, [form, conMod, derivedTotalLevel, hpMaxBonus, hpMaxBonusPerLevel]);

  const safeInitialHealth = Number.isFinite(computedCurrentHp) ? computedCurrentHp : 0;
  const [health, setHealth] = useState(safeInitialHealth);
  const [error, setError] = useState(null); // Error message state
  const [deathSaveFailures, setDeathSaveFailures] = useState([false, false, false]);
  const [deathSaveSuccesses, setDeathSaveSuccesses] = useState([false, false, false]);

  useEffect(() => {
    setHealth(Number.isFinite(computedCurrentHp) ? computedCurrentHp : 0);
  }, [computedCurrentHp]);

  // Sends tempHealth data to database for update
  async function tempHealthUpdate(offset) {
    const updatedHealthValue = (Number.isFinite(health) ? health : 0) + offset;
    try {
      await apiFetch(`/characters/update-temphealth/${params.id}`, {
        method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tempHealth: updatedHealthValue,
      }),
    });
      setError(null);
      if (typeof onTempHealthChange === 'function') {
        onTempHealthChange(updatedHealthValue);
      }
    } catch (error) {
      console.error(error);
      setError("Failed to update health.");
    }
  }

  const safeMaxHealth = Number.isFinite(maxHp) ? maxHp : 0;

  const increaseHealth = () => {
    if (maxHp !== null && Number.isFinite(maxHp) && Number.isFinite(health) && health >= maxHp) {
      return;
    }
    const current = Number.isFinite(health) ? health : 0;
    const next = current + 1;
    setHealth(next);
    tempHealthUpdate(1);
  };

  const decreaseHealth = () => {
    if (Number.isFinite(health) && health <= 0) {
      return;
    }
    const current = Number.isFinite(health) ? health : 0;
    const next = current - 1;
    setHealth(next);
    tempHealthUpdate(-1);
  };

  const handleBarChange = (e) => {
    const newHealth = Number(e.target.value);
    if (Number.isNaN(newHealth)) {
      return;
    }
    const offset = newHealth - (Number.isFinite(health) ? health : 0);
    setHealth(newHealth);
    if (!Number.isNaN(offset)) {
      tempHealthUpdate(offset);
    }
  };

  const healthValue = Number.isFinite(health) ? health : 0;
  const sliderMax = safeMaxHealth > 0 ? safeMaxHealth : Math.max(healthValue, 0);
  const healthRatio = sliderMax > 0 ? Math.min(Math.max((healthValue / sliderMax) * 100, 0), 100) : 0;
  const displayCurrent =
    Number.isFinite(health) && (computedCurrentHp !== null || healthValue !== 0)
      ? healthValue
      : '—';
  const displayMax = maxHp !== null ? maxHp : '—';
  const fillThreshold = (safeMaxHealth > 0 ? safeMaxHealth : sliderMax) * 0.5;
  const barColor =
    sliderMax > 0
      ? healthValue > fillThreshold
        ? "#2ecc71"
        : "#c0392b"
      : healthValue >= 0
        ? "#2ecc71"
        : "#c0392b";
  const showDeathSaveTrackers = Number.isFinite(healthValue) && healthValue <= 0;

  useEffect(() => {
    if (!showDeathSaveTrackers) {
      setDeathSaveFailures([false, false, false]);
      setDeathSaveSuccesses([false, false, false]);
    }
  }, [showDeathSaveTrackers]);

  const toggleDeathSaveFailure = (index) => {
    setDeathSaveFailures((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const toggleDeathSaveSuccess = (index) => {
    setDeathSaveSuccesses((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };
  const numericSpeedMultiplier = Number(speedMultiplier);
  const safeSpeedMultiplier =
    Number.isFinite(numericSpeedMultiplier) && numericSpeedMultiplier > 0
      ? numericSpeedMultiplier
      : 1;

  const unarmoredMovementBonus = useMemo(() => {
    if (hasArmorEquipped || hasShieldEquipped) {
      return 0;
    }
    if (monkLevel < 2) {
      return 0;
    }
    if (monkLevel <= 5) {
      return 10;
    }
    if (monkLevel <= 9) {
      return 15;
    }
    if (monkLevel <= 13) {
      return 20;
    }
    if (monkLevel <= 17) {
      return 25;
    }
    return 30;
  }, [hasArmorEquipped, hasShieldEquipped, monkLevel]);

  const baseSpeed =
    Number(form?.speed ?? 0) +
    Number(speed ?? 0) +
    Number(form?.temporarySpeedBonus ?? 0) +
    unarmoredMovementBonus;

  const totalSpeed = baseSpeed * safeSpeedMultiplier;

return (
<div
  style={{
    display: "flex",
    flexDirection: "column", // <-- vertical stacking
    alignItems: "center",
    gap: wrapperGap,
    marginBottom: wrapperMarginBottom,
    padding: "0 16px",
    maxWidth: "100%",
  }}
>
  {/* Health Section */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "16px",
      flexWrap: "nowrap",
      flexShrink: 1,
      minWidth: "320px",
    }}
  >
    {/* Decrease Button */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        flexShrink: 0,
      }}
    >
      <Button
        style={{
          color: "#e74c3c",
          backgroundColor: 'transparent',
          border: "none",
          fontSize: "20px",
          width: "44px",
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          transition: "transform 0.2s ease",
          flexShrink: 0
        }}
        className="fa-solid fa-minus"
        onClick={decreaseHealth}
        onMouseEnter={(e) => (e.target.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
      />
      {showDeathSaveTrackers && (
        <div className="death-save-circles" aria-label="Death save failures">
          {deathSaveFailures.map((active, index) => (
            <button
              key={`death-fail-${index}`}
              type="button"
              className={`death-save-circle ${
                active ? 'death-save-circle--fail-active' : 'death-save-circle--inactive'
              }`}
              onClick={() => toggleDeathSaveFailure(index)}
              aria-pressed={active}
              aria-label={`Mark death save failure ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>

    {/* Health Bar */}
    <div
      style={{
        position: "relative",
        width: "240px",
        height: "24px",
        backgroundColor: "#e0e0e0",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.25)",
        flexShrink: 0
      }}
    >
      <input
        type="range"
        min="0"
        max={sliderMax}
        value={healthValue}
        onChange={handleBarChange}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          cursor: "pointer",
          zIndex: 1,
        }}
      />
      <div
        style={{
          width: `${healthRatio}%`,
          height: "100%",
          background: barColor,
          transition: "width 0.3s ease-in-out",
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          position: "absolute",
          width: "100%",
          top: "0",
          left: "0",
          textAlign: "center",
          fontSize: "14px",
          fontWeight: 600,
          color: "#222",
          lineHeight: "24px",
          pointerEvents: "none",
        }}
      >
        {`${displayCurrent}/${displayMax}`}
      </span>
    </div>

    {/* Increase Button */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        flexShrink: 0,
      }}
    >
      <Button
        style={{
          color: "#27ae60",
          backgroundColor: "transparent",
          border: "none",
          fontSize: "20px",
          width: "44px",
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          transition: "transform 0.2s ease",
          flexShrink: 0
        }}
        className="fa-solid fa-plus"
        onClick={increaseHealth}
        onMouseEnter={(e) => (e.target.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
      />
      {showDeathSaveTrackers && (
        <div className="death-save-circles" aria-label="Death save successes">
          {deathSaveSuccesses.map((active, index) => (
            <button
              key={`death-success-${index}`}
              type="button"
              className={`death-save-circle ${
                active ? 'death-save-circle--success-active' : 'death-save-circle--inactive'
              }`}
              onClick={() => toggleDeathSaveSuccess(index)}
              aria-pressed={active}
              aria-label={`Mark death save success ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  </div>
  {error && (
    <div className="text-danger" style={{ marginTop: "8px" }}>
      {error}
    </div>
  )}

      {/* Stats Section */}
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      gap: "12px",
      fontFamily: "'Inter', sans-serif",
      fontSize: "15px",
      color: "#000",
    }}
  >
    {/* Core Stats */}
<div style={{ color: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
  {/* First row */}
  <div style={{ display: "flex", gap: "20px", justifyContent: "center", flexWrap: "nowrap" }}>
    <div><strong>AC:</strong> {totalArmorClass}</div>
    <div><strong>Initiative:</strong> {Number(dexMod) + Number(initiative)}</div>
    <div><strong>Speed:</strong> {totalSpeed}</div>
  </div>

  {/* Second row */}
  <div style={{ display: "flex", gap: "20px", justifyContent: "center", flexWrap: "nowrap" }}>
    {spellSaveDC != null && (
      <div><strong>Spell Save DC:</strong> {spellSaveDC}</div>
    )}
    <div><strong>Proficiency Bonus:</strong> {profBonus}</div>
  </div>
</div>
      </div>
    </div>
  );
}

