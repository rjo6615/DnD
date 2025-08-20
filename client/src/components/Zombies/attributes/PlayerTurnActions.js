import React, { useState, useEffect } from 'react';
import { Button, Modal, Card, Table } from "react-bootstrap";
import wornpaper from "../../../images/wornpaper.jpg";
import sword from "../../../images/sword.png";

export default function PlayerTurnActions ({ form, strMod, atkBonus, dexMod }) { 
  // -----------------------------------------------------------Modal for attacks------------------------------------------------------------------------
  const [showAttack, setShowAttack] = useState(false);
  const handleCloseAttack = () => setShowAttack(false);
  const handleShowAttack = () => setShowAttack(true);

//--------------------------------------------Crit button toggle------------------------------------------------
const [isGold, setIsGold] = useState(false);

// Function to handle toggle
const handleToggle = () => {
  setIsGold(prevState => !prevState);
};

const handleToggleAfterDamage = () => {
  setIsGold(false);
};
// --------------------------------Breaks down weapon damage into useable numbers--------------------------------
let critMatch;
let critValue;
const handleWeaponsButtonCrit = (el) => {
if (el[3].match(/\d{2}-\d{2}x\d+/)) {
  critMatch = el[3].match(/(\d{2})-(\d{2})x(\d+)/);    
  if (critMatch) {
    const [, , , critTimes] = critMatch;  
    const critTimesValue = parseInt(critTimes, 10);      
    critValue = critTimesValue;
  } else {
    console.error("Invalid input string");
  }
} else if (el[3].match(/x\d+/)) {
  critMatch = el[3].match(/x(\d+)/);   
  if (critMatch) {
    const [, critTimes] = critMatch;
    const critTimesValue = parseInt(critTimes, 10);
    critValue = critTimesValue;
  } else {
    console.error("Invalid input string");
  }
} 
}
 let damageString;
 let match;
const handleWeaponsButtonClick = (el) => {
  if (el[4] === "0") {
    damageString = el[2] + "+" + (Number(el[1]) + Number(strMod));
    match = damageString.match(/(\d+)d(\d+)\+(\d+)/);
  } else if (el[4] === "1") {
    damageString = el[2] + "+" + (Number(el[1]) + Math.floor( Number((strMod * 1.5))));
    match = damageString.match(/(\d+)d(\d+)\+(\d+)/);
  } else if (el[4] === "2") {
    damageString = el[2] + "+" + (Number(el[1]) + Number(0))
    match = damageString.match(/(\d+)d(\d+)\+(\d+)/);  }
  
  if (match) {
    const [, numberOfDice, sidesOfDice, constantValue] = match;
    const numberOfDiceValue = parseInt(numberOfDice, 10);
    const sidesOfDiceValue = parseInt(sidesOfDice, 10);
    const constantValueValue = parseInt(constantValue, 10);
    const diceRolls = rollDice(numberOfDiceValue, sidesOfDiceValue);
    const damageSum = diceRolls.reduce((partialSum, a) => partialSum + a, 0);  
    if (isGold) {
      let damageValue = (damageSum * critValue) + constantValueValue;
      updateDamageValueWithAnimation(damageValue);
    } else {
      let damageValue = damageSum + constantValueValue;
      updateDamageValueWithAnimation(damageValue);
    }
  } else {
    console.error("Invalid input string");
  }
};

// -----------------------------------------Dice roller for damage-------------------------------------------------------------------
const opacity = 0.85;
// Calculate RGBA color with opacity
const rgbaColor = `rgba(${parseInt(form.diceColor.slice(1, 3), 16)}, ${parseInt(form.diceColor.slice(3, 5), 16)}, ${parseInt(form.diceColor.slice(5, 7), 16)}, ${opacity})`;

// Apply the calculated RGBA color to the element
document.documentElement.style.setProperty('--dice-face-color', rgbaColor);
function rollDice(numberOfDiceValue, sidesOfDiceValue) {
  if (numberOfDiceValue <= 0 || sidesOfDiceValue <= 0) {
    return "Both the number of dice and sides must be greater than zero.";
  }

  let results = [];
  for (let i = 0; i < numberOfDiceValue; i++) {
    // Generate a random number between 1 and sidesOfDiceValue (inclusive)
    let result = Math.floor(Math.random() * sidesOfDiceValue) + 1;
    results.push(result);
  }

  return results;
}

const [loading, setLoading] = useState(false);
const [damageValue, setDamageValue] = useState(0);

useEffect(() => {
  if (loading) {
    const timer = setTimeout(() => {
      setLoading(false);
      handleToggleAfterDamage();
    }, 1000); // 1 second delay
    return () => clearTimeout(timer);
  }
}, [loading]);

const updateDamageValueWithAnimation = (newValue) => {
  setLoading(true);
  setDamageValue(newValue);
};

const [pulse, setPulse] = useState(false);

useEffect(() => {
  if (!loading) {
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 2000); // Remove the pulse class after the animation
    return () => clearTimeout(timer); // Cleanup the timer on unmount or when loading changes
  }
}, [loading]);
//-------------------------------------------D20 Dice Roller--------------------------------------------------------------------------
const [sides] = useState(20);
const [initialSide] = useState(1);
const [timeoutId, setTimeoutId] = useState(null);
const [animationDuration] = useState('3000ms');
const [activeFace, setActiveFace] = useState(null);
const [rolling, setRolling] = useState(false);
const face = Math.floor(Math.random() * sides) + initialSide;

const randomFace = () => {
  return face === activeFace ? randomFace() : face;
};

const rollTo = (face) => {
  clearTimeout(timeoutId);
  setActiveFace(face);
  setRolling(false);

  if (face === 20 || face === 1) {
    showSparklesEffect({ x: 100 / 2, y: 100 / 2 });
    setTimeout(() => {
      showSparklesEffect();
    }, 5000);
  }
};

const handleRandomizeClick = (e) => {
  e.preventDefault(); // Prevent page refresh
  setRolling(true);
  clearTimeout(timeoutId);

  const newTimeoutId = setTimeout(() => {
    setRolling(false);
    rollTo(randomFace());
  }, parseInt(animationDuration, 10));

  setTimeoutId(newTimeoutId);
};

useEffect(() => {
  // Cleanup effect
  return () => clearTimeout(timeoutId);
}, [timeoutId]);

const faceElements = [];
for (let i = 1; i <= 20; i++) {
  faceElements.push(
    <figure className={`face face-${i}`} key={i}></figure>
  );
}
const [showSparkles, setShowSparkles] = useState(false);
const [showSparkles1, setShowSparkles1] = useState(false);

// Create a function to display sparkles
const showSparklesEffect = () => {
  if (face === 20) {
    setShowSparkles(true);
    setTimeout(() => {
      setShowSparkles(false);
    }, 2000);
  } else if (face === 1) {
    setShowSparkles1(true);
    setTimeout(() => {
      setShowSparkles1(false);
    }, 2000);
  }
};
//-------------------------------------------------------------Display-----------------------------------------------------------------------------------------
  return (
    <div style={{ marginTop: "-40px"}}>
    <div className={`mt-3 ${loading ? 'loading' : ''} ${pulse ? 'pulse' : ''}`} id="damageAmount">
      <span id="damageValue" className={loading ? 'hidden' : ''}>
        {damageValue}
      </span>
      <div id="loadingSpinner" className={`spinner ${loading ? '' : 'hidden'}`}></div>
    </div>
<div style={{ 
  display: "flex", 
  justifyContent: "center", 
  alignItems: "center", 
  height: "100%", 
  marginTop: "20px"
}}>
  <div style={{ 
    display: "flex", 
    flexDirection: "column", 
    alignItems: "center", 
    gap: "12px" 
  }}>
    {/* Critical Hit Toggle (Above) */}
    <button
      onClick={handleToggle}
      style={{
        width: "48px",
        height: "48px",
        borderRadius: "50%",
        border: isGold ? "2px solid #FFD700" : "2px solid #B0B0B0",
        backgroundColor: "#1e1e1e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: isGold ? "0 0 10px #FFD700" : "none",
      }}
      title={isGold ? "Critical Hit Enabled" : "Toggle Critical Hit"}
    >
      <i
        className={`fa-solid ${isGold ? "fa-bolt" : "fa-bolt-lightning"}`}
        style={{
          color: isGold ? "#FFD700" : "#B0B0B0",
          fontSize: "22px",
          transition: "color 0.3s ease",
        }}
      ></i>
    </button>

    {/* Attack Button (Below) */}
    <button
      onClick={handleShowAttack}
      style={{
        width: "64px",
        height: "64px",
        backgroundImage: `url(${sword})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        border: "none",
        borderRadius: "12px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.4)",
        transition: "transform 0.2s ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
      title="Attack"
    />
  </div>
</div>
{/* Attack Modal */}
      <Modal centered show={showAttack} onHide={handleCloseAttack}>
      <div className="text-center">
        <Card className="zombiesWeapons" style={{ width: 'auto', backgroundImage: `url(${wornpaper})`, backgroundSize: "cover"}}>      
        <Card.Title>Weapons</Card.Title>
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th>Weapon Name</th>
              <th>Attack Bonus</th>
              <th>Damage</th>
              <th>Critical</th>
              <th>Range</th>
              <th>Attack</th>
            </tr>
          </thead>
          <tbody>
            {form.weapon.map((el) => (  
            <tr key={el[0]}>
              <td>{el[0]}</td>             
              <td>
               {(() => {
              if (el[4] === "0") {
                return(Number(atkBonus) + Number(strMod) + Number(el[1]));
              } else if (el[4] === "1") {
                return(Number(atkBonus) + Number(strMod) + Number(el[1]));
              } else if (el[4] === "2") {
                return(Number(atkBonus) + Number(dexMod) + Number(el[1]));
              }
              })()}</td>
              <td>{el[2]}
              {(() => {
              if (el[4] === "0") {
                return("+" + (Number(el[1]) + Number(strMod)));
              } else if (el[4] === "1") {
                return("+" + (Number(el[1]) + Math.floor( Number((strMod * 1.5)))));
              } else if (el[4] === "2") {
                return("+" + (Number(el[1]) + Number(0)));
              }
              })()}</td>
              <td>{el[3]}</td>
              <td>{el[5]}</td>
              <td><Button onClick={() => {handleWeaponsButtonCrit(el); handleWeaponsButtonClick(el); handleCloseAttack();}} size="sm" className="fa-solid fa-plus" variant="primary"></Button></td>
            </tr>
             ))}
          </tbody>
        </Table>      
      </Card> 
</div>
      </Modal>
      {/* --------------------------------------------------Dice Roller--------------------------------------------------------------- */}
      <div className="content">
    {showSparkles && (
      <div className="sparkle"></div>
    )}
    {showSparkles1 && (
      <div className="sparkle1"></div>
    )}
    <div onClick={handleRandomizeClick} 
    className={`die ${rolling ? 'rolling' : ''}`} data-face={activeFace}>
      {faceElements}
    </div>
</div>
    </div>    
  );
};