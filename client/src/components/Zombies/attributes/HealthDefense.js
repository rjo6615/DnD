import React, { useState, useEffect } from 'react'; // Import useState and React
import { Button } from 'react-bootstrap'; // Adjust as per your actual UI library
import { useParams } from "react-router";

export default function HealthDefense({form, totalLevel, conMod, dexMod }) {
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
     let totalArmorAcBonus = armorAcBonus.reduce((partialSum, a) => Number(partialSum) + Number(a), 0); 
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
  const [health, setHealth] = useState(); // Initial health value
 // Sends tempHealth data to database for update
 async function tempHealthUpdate(offset){
    await fetch(`/update-temphealth/${params.id}`, {
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

  const maxPossibleHealth = form.health + Number(conMod * totalLevel);  
  
  function getColorForHealth(currentHealth, maxHealth) {
    const healthPercentage = (currentHealth / maxHealth) * 100;
    if (healthPercentage >= 70) {
      return 'green';
    } else if (healthPercentage >= 30) {
      return 'yellow';
    } else {
      return 'red';
    }
  }

  const healthColor = getColorForHealth(health, maxPossibleHealth);
  const healthWidth = (health / maxPossibleHealth) * 100;
  const healthStyle = {
    width: `${healthWidth}%`,
    backgroundColor: healthColor,
    color: "black",
    height: "100%",
    borderRadius: "5px",
    transition: "width 0.3s",
    textAlign: "center",
    fontWeight: "bold",
    lineHeight: "20px",
  };

  const healthBar = {
    width: "100%",
    height: "20px",
    backgroundColor: "#debb9d",
    borderRadius: "5px",
    marginBottom: "10px",
  };

  let offset;
  const increaseHealth = () => {
    if (health === form.health + Number(conMod * totalLevel)){
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
<div>
  <div style={{ marginBottom: "40px", textAlign: "center" }}>
    {/* Stat Bar */}
    <h6 
      style={{
        background: "rgba(222, 187, 157, 0.9)", 
        color: "black", 
        display: "inline-block", 
        borderRadius: "8px", 
        padding: "8px 12px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)"
      }}>
      <strong className="mx-2">AC: {Number(totalArmorAcBonus) + Number(10) + Number(armorMaxDex)}</strong>
      <strong className="mx-2">Attack Bonus: {atkBonus}</strong>
      <strong className="mx-2">Initiative: {dexMod}</strong>
    </h6>

    {/* Health Section with Buttons */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "10px" }}>
      {/* Decrease Health Button */}
      <Button 
        style={{ 
          color: "white", 
          background: "rgba(255, 0, 0, 0.7)", 
          border: "none", 
          boxShadow: "0 2px 6px rgba(255, 0, 0, 0.5)", 
          fontSize: "20px",
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }} 
        className="fa-solid fa-minus" 
        onClick={decreaseHealth}>
      </Button>

      {/* Health Bar */}
      <div 
        className="health-bar" 
        style={{
          width: "250px",
          height: "30px",
          background: "rgba(0, 0, 0, 0.6)", 
          borderRadius: "10px",
          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          color: "white",
          textShadow: "1px 1px 4px rgba(0, 0, 0, 0.8)"
        }}>
        {/* Inner Bar */}
        <div 
          className="health-bar-inner" 
          style={{
            width: `${(health / (form.health + Number(conMod * totalLevel))) * 100}%`, // Dynamic width
            height: "100%",
            background: health > (form.health + Number(conMod * totalLevel)) * 0.5 ? "limegreen" : "crimson", // Color changes at 50%
            position: "absolute",
            left: "0",
            top: "0",
            transition: "width 0.3s ease-in-out"
          }}>
        </div>
        {/* Centered Health Text */}
        <span style={{ position: "absolute", zIndex: "1" }}>
          {health}/{form.health + Number(conMod * totalLevel)}
        </span>
      </div>

      {/* Increase Health Button */}
      <Button 
        style={{ 
          color: "white", 
          background: "rgba(0, 200, 0, 0.7)", 
          border: "none", 
          boxShadow: "0 2px 6px rgba(0, 200, 0, 0.5)", 
          fontSize: "20px",
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }} 
        className="fa-solid fa-plus" 
        onClick={increaseHealth}>
      </Button>  
    </div>

    {/* Saving Throws */}
    <h6 
      style={{
        background: "rgba(222, 187, 157, 0.9)", 
        color: "black", 
        display: "inline-block", 
        borderRadius: "8px", 
        padding: "8px 12px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
        marginTop: "15px"
      }}>
      <strong className="mx-2">Fort: {fortSave}</strong>
      <strong className="mx-2">Reflex: {reflexSave}</strong>
      <strong className="mx-2">Will: {willSave}</strong>
    </h6>    
  </div>
</div>
)
}