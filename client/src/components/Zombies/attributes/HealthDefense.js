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
<div style={{marginTop: "-40px", marginBottom: "40px"}}>
      <h6 style={{backgroundColor: "#debb9d", color: "black", display: "inline-block", borderRadius: "5px"}}>
      <strong className="mx-2">AC: {Number(totalArmorAcBonus) + Number(10) + Number(armorMaxDex)}</strong>
      <strong className="mx-2">Attack Bonus: {atkBonus}</strong>
      <strong className="mx-2">Initiative: {dexMod}</strong>
      </h6>
{/*------------------------------------------------------------ Health Bar -----------------------------------------------------------------------------*/}
      <div className="health-bar" style={healthBar}>
        <div className="health-bar-inner" style={healthStyle}>{health}/{form.health + Number(conMod * totalLevel)}</div>
      </div>
      <Button style={{marginTop: "-35px", color: "black", border: "none"}} className="float-start bg-transparent fa-solid fa-minus" onClick={decreaseHealth}></Button>
      <Button style={{marginTop: "-35px", color: "black", border: "none"}} className="float-end bg-transparent fa-solid fa-plus" onClick={increaseHealth}></Button>  
      <h6 style={{backgroundColor: "#debb9d", color: "black", display: "inline-block", borderRadius: "5px"}}>
      <strong className="mx-2">Fort: {fortSave}</strong>
      <strong className="mx-2">Reflex: {reflexSave}</strong>
      <strong className="mx-2">Will: {willSave}</strong>
      </h6>    
      </div>
</div>
)
}