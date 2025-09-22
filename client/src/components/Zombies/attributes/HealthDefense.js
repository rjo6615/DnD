import React, { useEffect, useMemo, useState } from 'react'; // Import useState and React
import apiFetch from '../../../utils/apiFetch';
import { Button } from 'react-bootstrap'; // Adjust as per your actual UI library
import { useParams } from "react-router-dom";
import proficiencyBonus from '../../../utils/proficiencyBonus';
import { normalizeEquipmentMap } from './equipmentNormalization';

export default function HealthDefense({
  form,
  conMod,
  dexMod,
  ac = 0,
  hpMaxBonus = 0,
  hpMaxBonusPerLevel = 0,
  initiative = 0,
  speed = 0,
  spellAbilityMod,
}) {
  const params = useParams();
  const isLargeScreen =
    typeof window !== 'undefined' && window.innerWidth >= 768;
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
    
  const occupations = form.occupation;

  const totalLevel = occupations.reduce(
    (total, o) => total + Number(o.Level),
    0
  );
  const profBonus = form.proficiencyBonus ?? proficiencyBonus(totalLevel);
  const spellSaveDC =
    spellAbilityMod != null ? 8 + profBonus + spellAbilityMod : null;

  // Health
  const maxHealth =
    Number(form.health) +
    Number(conMod * totalLevel) +
    Number(hpMaxBonus) +
    Number(hpMaxBonusPerLevel * totalLevel);
  const [health, setHealth] = useState(Number(form.tempHealth) || 0); // Initial health value
  const [error, setError] = useState(null); // Error message state

  // Sends tempHealth data to database for update
  async function tempHealthUpdate(offset) {
    try {
      await apiFetch(`/characters/update-temphealth/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tempHealth: health + offset,
        }),
      });
      setError(null);
    } catch (error) {
      console.error(error);
      setError("Failed to update health.");
    }
  }

  useEffect(() => {
    const parsedValue = parseFloat(form.tempHealth);
    if (!isNaN(parsedValue)) {
      setHealth(parsedValue);
    } else {
    }
  }, [form.tempHealth]);

  let offset;
  const increaseHealth = () => {
    if (health === maxHealth){
    } else {
    setHealth((prevHealth) => prevHealth + 1);
    offset = +1;
    tempHealthUpdate(offset);
    }
  };

  const decreaseHealth = () => {
    if (health === -10){
    } else {
    setHealth((prevHealth) => prevHealth - 1);
    offset = -1;
    tempHealthUpdate(offset);
    }
  };

  const handleBarChange = (e) => {
    const newHealth = Number(e.target.value);
    const offset = newHealth - (health ?? 0);
    setHealth(newHealth);
    if (!Number.isNaN(offset)) {
      tempHealthUpdate(offset);
    }
  };

return (
<div
  style={{
    display: "flex",
    flexDirection: "column", // <-- vertical stacking
    alignItems: "center",
    gap: "32px",
    marginBottom: isLargeScreen ? "80px" : "1rem",
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
        min="-10"
        max={maxHealth}
        value={health ?? 0}
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
          width: `${(health / maxHealth) * 100}%`,
          height: "100%",
          background: health > maxHealth * 0.5 ? "#2ecc71" : "#c0392b",
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
        {health}/{maxHealth}
      </span>
    </div>

    {/* Increase Button */}
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
    <div><strong>AC:</strong> {Number(totalArmorAcBonus) + 10 + Number(armorMaxDex)}</div>
    <div><strong>Initiative:</strong> {Number(dexMod) + Number(initiative)}</div>
    <div><strong>Speed:</strong> {(form.speed || 0) + Number(speed)}</div>
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

