import React, { useState, useEffect } from 'react'; // Import useState and React
import apiFetch from '../../../utils/apiFetch';
import { Button } from 'react-bootstrap'; // Adjust as per your actual UI library
import { useParams } from "react-router-dom";

export default function HealthDefense({
  form,
  totalLevel,
  conMod,
  dexMod,
  wisMod,
  intMod,
  ac = 0,
  hpMaxBonus = 0,
  hpMaxBonusPerLevel = 0,
  initiative = 0,
  speed = 0,
}) {
  const params = useParams();
//-----------------------Health/Defense-------------------------------------------------------------------------------------------------------------------------------------------------
  // Saves Maffs
  let fortSave = 0;
  let reflexSave = 0;
  let willSave = 0;
  let atkBonus = 0;
    
  //Armor AC/MaxDex
     let armorAcBonus= [];
     let armorMaxDexBonus= [];
     form.armor.map((el) => (
       armorAcBonus.push(el[1])
     ))
    let totalArmorAcBonus = armorAcBonus.reduce((partialSum, a) => Number(partialSum) + Number(a), 0) + Number(ac);
     form.armor.map((el) => (
      armorMaxDexBonus.push(el[2])
     ))
     let filteredMaxDexArray = armorMaxDexBonus.filter(e => e !== '0')
     let armorMaxDexMin = Math.min(...filteredMaxDexArray);
    
     let armorMaxDex;
     if (Number(armorMaxDexMin) < Number(dexMod) && Number(armorMaxDexMin > 0)) {
        armorMaxDex = armorMaxDexMin;
     } else {
      armorMaxDex = dexMod;
     }
    
  const occupations = form.occupation;
  
  for (const occupation of occupations) {
    const level = parseInt(occupation.Level, 10);
    const fortValue = parseInt(occupation.Fort, 10);
    const reflexValue = parseInt(occupation.Reflex, 10);
    const willValue = parseInt(occupation.Will, 10);
    const attackBonusValue = parseInt(occupation.atkBonus, 10);
  
    if (!isNaN(level)) {
      if (fortValue === 0) {
        fortSave += Math.floor(level / 3);
      } else if (fortValue === 1) {
        fortSave += Math.floor((level / 2) + 2);
      }
  
      if (reflexValue === 0) {
        reflexSave += Math.floor(level / 3);
      } else if (reflexValue === 1) {
        reflexSave += Math.floor((level / 2) + 2);
      }
  
      if (willValue === 0) {
        willSave += Math.floor(level / 3);
      } else if (willValue === 1) {
        willSave += Math.floor((level / 2) + 2);
      }
  
      if (attackBonusValue === 0) {
        atkBonus += Math.floor(level / 2);
      } else if (attackBonusValue === 1) {
        atkBonus += Math.floor(level * 0.75);
      } else if (attackBonusValue === 2) {
        atkBonus += level;
      }
    }
  }

  // Health
  const maxHealth =
    Number(form.health) +
    Number(conMod * totalLevel) +
    Number(hpMaxBonus) +
    Number(hpMaxBonusPerLevel * totalLevel);
  const [health, setHealth] = useState(); // Initial health value
 // Sends tempHealth data to database for update
 async function tempHealthUpdate(offset){
    await apiFetch(`/characters/update-temphealth/${params.id}`, {
     method: "PUT",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
      tempHealth: health + offset,
     }),
   })
   .catch(error => {
     window.alert(error);
     return;
   });
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

return (
<div
  style={{
    display: "flex",
    flexDirection: "column", // <-- vertical stacking
    alignItems: "center",
    gap: "32px",
    marginBottom: "80px",
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
      <div
        style={{
          width: `${(health / maxHealth) * 100}%`,
          height: "100%",
          background: health > maxHealth * 0.5 ? "#2ecc71" : "#c0392b",
          transition: "width 0.3s ease-in-out",
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

  {/* Stats + Saving Throws Section */}
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
    <div style={{ color: "#FFFFFF", display: "flex", gap: "20px", justifyContent: "center", flexWrap: "nowrap" }}>
      <div><strong>AC:</strong> {Number(totalArmorAcBonus) + 10 + Number(armorMaxDex)}</div>
      <div><strong>Attack Bonus:</strong> {atkBonus}</div>
      <div><strong>Initiative:</strong> {Number(dexMod) + Number(initiative)}</div>
      <div><strong>Speed:</strong> {(form.speed || 0) + Number(speed)}</div>
    </div>

    {/* Saving Throws */}
    <div style={{ color: "#FFFFFF", display: "flex", gap: "20px", justifyContent: "center", flexWrap: "nowrap" }}>
      <div><strong>Fort:</strong> {fortSave}</div>
      <div><strong>Reflex:</strong> {reflexSave}</div>
      <div><strong>Will:</strong> {willSave}</div>
    </div>

  </div>
</div>
)
}