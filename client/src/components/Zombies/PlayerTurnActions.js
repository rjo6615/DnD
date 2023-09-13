import React, { useState, useEffect } from 'react';
import { Button, Modal, Card, Table } from "react-bootstrap";

export default function PlayerTurnActions ({ props, actions, bonusActions, onSelectAction, onSelectBonusAction, weapons, strMod, atkBonus, dexMod }) { 
  // State to track the selected action
  const [selectedAction, setSelectedAction] = useState(null);

  // State to track the selected bonus action
  const [selectedBonusAction, setSelectedBonusAction] = useState(null);

  // State to track the timer ID
  const [timerId, setTimerId] = useState(null);

  // Function to open the modal and set the selected action with a timer delay
  const handleActionMouseDown = (action) => {
    const id = setTimeout(() => {
      setSelectedAction(action);
    }, 250); // quarter-second delay
    setTimerId(id);
  };

  // Function to open the modal and set the selected bonus action with a timer delay
  const handleBonusActionMouseDown = (bonusAction) => {
    const id = setTimeout(() => {
      setSelectedBonusAction(bonusAction);
    }, 250); // quarter-second delay
    setTimerId(id);
  };

    // // Function to open the modal and set the selected action with a timer delay
    // const handleActionMouseOver = (action) => {
    //   const id = setTimeout(() => {
    //     setSelectedAction(action);
    //   }, 700); // quarter-second delay
    //   setTimerId(id);
    // };
  
    // // Function to open the modal and set the selected bonus action with a timer delay
    // const handleBonusActionMouseOver = (bonusAction) => {
    //   const id = setTimeout(() => {
    //     setSelectedBonusAction(bonusAction);
    //   }, 700); // quarter-second delay
    //   setTimerId(id);
    // };

  // Function to clear the timer
  const clearTimer = () => {
    if (timerId) {
      clearTimeout(timerId);
      setTimerId(null);
    }
  };

  // Function to close the modal
  const handleCloseModal = () => {
    setSelectedAction(null);
    setSelectedBonusAction(null);
  };

  // Function to select the action
  const handleActionClick = (action) => {
    clearTimer(); // Clear the timer if an action is selected
    onSelectAction(action);
  };

  // Function to select the bonus action
  const handleBonusActionClick = (bonusAction) => {
    clearTimer(); // Clear the timer if a bonus action is selected
    onSelectBonusAction(bonusAction);
  };
  // -----------------------------------------------------------Modal for attacks------------------------------------------------------------------------
  const [showAttack, setShowAttack] = useState(false);

  const handleCloseAttack = () => setShowAttack(false);
  const handleShowAttack = () => setShowAttack(true);

  const _click = (action) => {
    if (action.name === 'Attack') {
    handleShowAttack();
    } else {
    handleActionClick(action);
    }
 }


//--------------------------------------------Crit button toggle------------------------------------------------
const [isGold, setIsGold] = useState(false);

// Function to handle toggle
const handleToggle = () => {
  setIsGold(prevState => !prevState);
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
    }, 1000); // 1 second delay
    return () => clearTimeout(timer);
  }
}, [loading]);

const updateDamageValueWithAnimation = (newValue) => {
  setLoading(true);
  setDamageValue(newValue);
};
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
 <div style={{backgroundImage: 'url(/images/damage.jpg)'}} className={`mt-3 ${loading ? 'loading' : ''}`} id="damageAmount">
  <span id="damageValue" className={loading ? 'hidden' : ''}>
    {damageValue}
  </span>
  <div id="loadingSpinner" className={`spinner ${loading ? '' : 'hidden'}`}></div>
</div>
<div>
  <Button onClick={handleToggle} style={{color: isGold ? "gold" : "gray", fontSize: "25px", borderColor: "transparent"}} className="fa-solid fa-star bg-transparent"></Button>
</div>
      <Card style={{backgroundColor: "rgba(0, 0, 0, 0)", border: "none"}}>
      <Table>  
        <thead>
          <tr>
          <th></th>
          <th></th>
          </tr>
          <tr>
          <td>{actions.map((action) => (
          <Button
            className="bg-secondary mx-1 mt-1"
            key={action.id}
            // onMouseOver={() => handleActionMouseOver(action)}
            // onMouseOut={() => clearTimer()} // Cancels timer
            onTouchStart={() => handleActionMouseDown(action)} // Open the modal with a 2-second delay
            onTouchEnd={() => clearTimer()} // Cancels timer
            onClick={() => _click(action)} // Select the action
            style={{
              borderColor: "gray",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundImage: action.background,
              height: "40px",
              width: "40px"
            }}
          >
            {/* {action.name} */}
          </Button>
        ))}
        </td>
          <td style={{paddingLeft: "40px"}}>{bonusActions.map((bonusAction) => (
          <Button
            className="bg-secondary mx-1 mt-1"
            key={bonusAction.id}
            // onMouseOver={() => handleBonusActionMouseOver(bonusAction)}
            // onMouseOut={() => clearTimer()} // Cancels timer
            onTouchStart={() => handleBonusActionMouseDown(bonusAction)} // Open the modal with a 2-second delay
            onTouchEnd={() => clearTimer()} // Cancels timer
            onClick={() => handleBonusActionClick(bonusAction)} // Select the bonus action
            style={{
              borderColor: "gray",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundImage: bonusAction.background,
              height: "40px",
              width: "40px"
            }}
          >
            {/* {action.name} */}
          </Button>
        ))}</td>
          </tr>
        </thead> 
        </Table>
        </Card> 
      {/* Modal to display name and description */}
      <Modal {...props}
      centered 
      show={selectedAction !== null || selectedBonusAction !== null} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">Action Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAction && (
            <div>
              <h3>{selectedAction.name}</h3>
              <p>{selectedAction.description}</p>
            </div>
          )}
          {selectedBonusAction && (
            <div>
              <h3>{selectedBonusAction.name}</h3>
              <p>{selectedBonusAction.description}</p>
            </div>
          )}
        </Modal.Body>
      </Modal>
      {/* Attack Modal */}
      <Modal centered show={showAttack} onHide={handleCloseAttack}>
      <center>
        <Card className="zombiesWeapons" style={{ width: 'auto', backgroundImage: 'url(../images/wornpaper.jpg)', backgroundSize: "cover"}}>      
        <Card.Title>Weapons</Card.Title>
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th>Weapon Name</th>
              <th>Attack Bonus</th>
              <th>Damage</th>
              <th>Critical</th>
              <th>Range</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {weapons.map((el) => (  
            <tr>
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
              <td><Button onClick={() => {handleWeaponsButtonCrit(el); handleWeaponsButtonClick(el); handleActionClick(); handleCloseAttack();}} size="sm" className="fa-solid fa-plus" variant="primary"></Button></td>
            </tr>
             ))}
          </tbody>
        </Table>      
      </Card> 
</center>
      </Modal>
      {/* --------------------------------------------------Dice Roller--------------------------------------------------------------- */}
      <div className="content">
    {showSparkles && (
      <div className="sparkle"></div>
    )}
    {showSparkles1 && (
      <div className="sparkle1"></div>
    )}

    <div onClick={handleRandomizeClick} className={`die ${rolling ? 'rolling' : ''}`} data-face={activeFace}>
      {faceElements}
    </div>
</div>

    </div>    
  );
};