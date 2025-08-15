import React, { useEffect, useState, useRef, useCallback } from "react";
import Button from 'react-bootstrap/Button';
import { Table, Form, Modal, Card } from 'react-bootstrap';
import { useParams, useNavigate } from "react-router-dom";
import '../../../App.scss';
import zombiesbg from "../../../images/zombiesbg.jpg";

export default function RecordList() {
  const params = useParams();
  const [records, setRecords] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function getRecords() {
      const response = await fetch(`/campaign/${params.campaign}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const records = await response.json();
      setRecords(records);
    }

    getRecords();

    return;
  }, [params.campaign]);

  const navigateToCharacter = (id) => {
    navigate(`/zombies-character-sheet/${id}`);
  }
// --------------------------Random Character Creator Section------------------------------------
 const [form, setForm] = useState({
  characterName: "",
  campaign: params.campaign.toString(),
  occupation: [""], 
  feat: [["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]],
  weapon: [["","","","","",""]],
  armor: [["","","",""]],
  item: [["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]],
  age: "",
  sex: "",
  height: "",
  weight: "",
  str: "",
  dex: "",
  con: "",
  int: "",
  wis: "",
  cha: "",
  startStatTotal: "",
  health: "",
  tempHealth: "",
  appraise: 0,
  balance: 0,
  bluff: 0,
  climb: 0,
  concentration: 0,
  decipherScript: 0,
  diplomacy: 0,
  disableDevice: 0,
  disguise: 0,
  escapeArtist: 0,
  forgery: 0,
  gatherInfo: 0,
  handleAnimal: 0,
  heal: 0,
  hide: 0,
  intimidate: 0,
  jump: 0,
  listen: 0,
  moveSilently: 0,
  openLock: 0,
  ride: 0,
  search: 0,
  senseMotive: 0,
  sleightOfHand: 0,
  spot: 0,
  survival: 0,
  swim: 0,
  tumble: 0,
  useTech: 0,
  useRope: 0,
  newSkill: [["",0]],
  diceColor: "#000000",
});

const [occupation, setOccupation] = useState({ 
  occupation: [], 
});

const [show, setShow] = useState(false);
const handleClose = () => setShow(false);
const handleShow = () => setShow(true);

// Fetch Occupations
useEffect(() => {
  async function fetchData() {
    const response = await fetch(`/occupations`);    

    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      window.alert(message);
      return;
    }

    const record = await response.json();
    if (!record) {
      window.alert(`Record not found`);
      navigate("/");
      return;
    }

    setOccupation(record);
    setGetOccupation(record);
  }
  fetchData();   
  return;
  
}, [navigate]);

// Update the state properties.
function updateForm(value) {
  return setForm((prev) => {
    const updatedForm = { ...prev };

    // Convert numeric values to numbers
    Object.keys(value).forEach((key) => {
      if (!isNaN(value[key])) {
        updatedForm[key] = parseFloat(value[key]);
      } else {
        updatedForm[key] = value[key];
      }
    });

    return updatedForm;
  });
}

 // Function to handle submission.
 async function onSubmit(e) {
  e.preventDefault(); 
  setIsSubmitting(false);   
   sendToDb();
}

// Dice Randomizer
const [sumArray, setSumArray] = useState([]);
useEffect(() => {
  rollDiceSixTimes();
}, []);
const rollDiceSixTimes = () => {
  const newSumArray = [];
  for (let i = 0; i < 6; i++) {
    const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
    rolls.sort((a, b) => a - b);
    rolls.shift(); // Remove the lowest value
    const totalSum = rolls.reduce((acc, value) => acc + value, 0);
    newSumArray.push(totalSum);
  }
  setSumArray(newSumArray);
};

function bigMaff() {
// Occupation Randomizer
let occupationLength = occupation.length;
let randomOccupation = Math.round(Math.random() * (occupationLength - 1));
let newOccupation = occupation[randomOccupation];
updateForm({ occupation: [newOccupation] }); 

// Age Randomizer
let newAge = Math.round(Math.random() * (50 - 19)) + 19;
updateForm({ age: newAge }); 

// Sex Randomizer
let sexArr = ["Male", "Female"];
let randomSex = Math.round(Math.random() * 1);
let newSex = sexArr[randomSex];
updateForm({ sex: newSex }); 

// Height Randomizer - store height as total inches to satisfy numeric validation
let randomHeight = Math.round(Math.random() * (76 - 60)) + 60;
updateForm({ height: randomHeight });

// Weight Randomizer
let randomWeight = Math.round(Math.random() * (220 - 120)) + 120;
let newWeight= randomWeight;
updateForm({ weight: newWeight });

// Stat Randomizer
let randomStr = sumArray[0] + Number(newOccupation.str); 
updateForm({ str: randomStr });
let randomDex = sumArray[1] + Number(newOccupation.dex); 
updateForm({ dex: randomDex }); 
let randomCon = sumArray[2] + Number(newOccupation.con); 
updateForm({ con: randomCon }); 
let randomInt = sumArray[3] + Number(newOccupation.int); 
updateForm({ int: randomInt });
let randomWis = sumArray[4] + Number(newOccupation.wis); 
updateForm({ wis: randomWis });
let randomCha = sumArray[5] + Number(newOccupation.cha);
updateForm({ cha: randomCha });

let startStatTotal = sumArray[0] + Number(newOccupation.str) + sumArray[1] + Number(newOccupation.dex) + sumArray[2] + Number(newOccupation.con)
 + sumArray[3] + Number(newOccupation.int) + sumArray[4] + Number(newOccupation.wis) + sumArray[5] + Number(newOccupation.cha);
updateForm({ startStatTotal: startStatTotal });
}

// Health Randomizer
let conMod = Math.floor((form.con - 10) / 2); 
const [healthArray, setHealthArray] = useState([]);
let newHealth =  healthArray[0] + Number(form.occupation[0].Health);
let tempHealth = newHealth + Number(conMod) * Number(form.occupation[0].Level);
useEffect(() => {    
  updateForm({ health: newHealth});
  updateForm({ tempHealth: tempHealth});
}, [ newHealth, tempHealth]);

  useEffect(() => {  
  const lvl = (form.occupation[0].Level - 1);
  const diceValue = form.occupation[0].Health;
  const rollHealthDice = () => {
    const newHealthArray = [];
    for (let i = 0; i < 1; i++) { //array amount
      const rolls = Array.from({ length: lvl }, () => Math.floor(Math.random() * diceValue) + 1);
      const totalSum = rolls.reduce((acc, value) => acc + value, 0);
      newHealthArray.push(totalSum);
    }
    setHealthArray(newHealthArray);  
  };
  rollHealthDice();
  return;
}, [ form.occupation ]);

 // Sends form data to database
   const sendToDb = useCallback(async () => {
    const newCharacter = { ...form };
    try {
      await fetch("/character/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newCharacter),
      });
    } catch (error) {
      window.alert(error);
      return;
    };
   setIsSubmitting(false);
   setForm({
    characterName: "",
    campaign: "", 
    occupation: [""],
    feat: [["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]],
    weapon: [["","","","","",""]],
    armor: [["","","",""]],
    item: [["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]],
    age: "",
    sex: "",
    height: "",
    weight: "",
    str: "",
    dex: "",
    con: "",
    int: "",
    wis: "",
    cha: "",
    startStatTotal: "",
    health: "",
    tempHealth: "",
    appraise: 0,
    balance: 0,
    bluff: 0,
    climb: 0,
    concentration: 0,
    decipherScript: 0,
    diplomacy: 0,
    disableDevice: 0,
    disguise: 0,
    escapeArtist: 0,
    forgery: 0,
    gatherInfo: 0,
    handleAnimal: 0,
    heal: 0,
    hide: 0,
    intimidate: 0,
    jump: 0,
    listen: 0,
    moveSilently: 0,
    openLock: 0,
    ride: 0,
    search: 0,
    senseMotive: 0,
    sleightOfHand: 0,
    spot: 0,
    survival: 0,
    swim: 0,
    tumble: 0,
    useTech: 0,
    useRope: 0,
    newSkill: [["",0]],
    diceColor: "#000000",
  });
  navigate(0);
}, [form, setForm, navigate]); 

//--------------------------------------------Create Character (Manual)---------------------
const [show5, setShow5] = useState(false);
const handleClose5 = () => setShow5(false);
const handleShow5 = () => setShow5(true);

const [selectedOccupation, setSelectedOccupation] = useState(null);
const selectedAddOccupationRef = useRef();

const [getOccupation, setGetOccupation] = useState([]);

const handleOccupationChange = (event) => {
  const selectedIndex = event.target.selectedIndex;
  setSelectedOccupation(getOccupation[selectedIndex - 1]); // Subtract 1 because the first option is empty
};

const [isSubmitting, setIsSubmitting] = useState(false);
const [isOccupationConfirmed, setIsOccupationConfirmed] = useState(false);

const handleConfirmOccupation = () => {
  if (selectedOccupation  && !isOccupationConfirmed) {
    const selectedAddOccupation = selectedAddOccupationRef.current.value;
    const occupationExists = form.occupation.some(
      (occupation) => occupation.Occupation === selectedOccupation.Occupation
    );
    const selectedAddOccupationObject = getOccupation.find(
      (occupation) => occupation.Occupation === selectedAddOccupation
    );

    if (!occupationExists) {

    const addOccupationStr = Number(selectedAddOccupationObject.str) + Number(form.str);
    const addOccupationDex = Number(selectedAddOccupationObject.dex) + Number(form.dex);
    const addOccupationCon = Number(selectedAddOccupationObject.con) + Number(form.con);
    const addOccupationInt = Number(selectedAddOccupationObject.int) + Number(form.int);
    const addOccupationWis = Number(selectedAddOccupationObject.wis) + Number(form.wis);
    const addOccupationCha = Number(selectedAddOccupationObject.cha) + Number(form.cha);

    const totalNewStats =
      addOccupationStr +
      addOccupationDex +
      addOccupationCon +
      addOccupationInt +
      addOccupationWis +
      addOccupationCha;

    // Push the selected occupation into form.occupation
    form.occupation.push(selectedOccupation);
    form.occupation.shift();

    // Update the form state
    updateForm({ startStatTotal: totalNewStats });
    updateForm({ str: addOccupationStr });
    updateForm({ dex: addOccupationDex });
    updateForm({ con: addOccupationCon });
    updateForm({ int: addOccupationInt });
    updateForm({ wis: addOccupationWis });
    updateForm({ cha: addOccupationCha });

    // Set a flag to indicate that the occupation has been confirmed
    setIsOccupationConfirmed(true);
  }
}
};

const sendManualToDb = useCallback(async() => {
  const newCharacter = { ...form };
  try {
    // Call the API endpoint for manual character creation
    // Adjust the endpoint URL as needed
    await fetch("/character/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newCharacter),
    });
  } catch (error) {
    window.alert(error);
    return;
  }
  setIsSubmitting(false);
  // Reset the form or perform any other necessary actions
  navigate(`/zombies-character-select/${form.campaign}`);
}, [form, setIsSubmitting, navigate]);

// Function to handle submission for manual character creation.
const onSubmitManual = (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  handleConfirmOccupation(); // Call handleConfirmOccupation when submitting the manual form
};

useEffect(() => {
  if (isSubmitting) {
    // Add any additional conditions here if needed
    setIsSubmitting(false);
    sendManualToDb();
  }
}, [isSubmitting, sendManualToDb]);

  return (
    <center className="pt-2" style={{ fontFamily: 'Raleway, sans-serif', backgroundImage: `url(${zombiesbg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "100vh"}}>
      <div style={{paddingTop: '80px'}}>
      <h1 
  style={{ 
    fontSize: 28, 
    width: "300px", 
    height: "95px", 
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    color: "white", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    borderRadius: "10px", // Rounded corners
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)" // Light shadow for depth
  }} 
  className="text-light"
>
  {params.campaign.toString()}
</h1>
<div style={{ maxHeight: '300px', overflowY: 'auto', position: 'relative', zIndex: '4' }}>
        <Table style={{ width: 'auto', position: "relative", zIndex: "4" }} striped bordered condensed="true" className="zombieCharacterSelectTable dnd-background">
          <thead>
            <tr>
              <th>Character</th>
              <th>Level</th>
              <th>Occupation</th>
              <th>View</th>
            </tr>
          </thead>
          <tbody>
          {records.map((Characters) => (
              <tr key={Characters._id}>
                <td>{Characters.characterName}</td>
                <td>{Characters.occupation.reduce((total, el) => total + Number(el.Level), 0)}</td>
                <td>
                  {Characters.occupation.map((el, i) => (
                    <span key={i}>{el.Level + " " + el.Occupation}<br></br></span>
                  ))}
                </td>
                <td>
                  <Button
                    className="fantasy-button"
                    size="sm"
                    style={{ width: 'auto', border: "none" }}
                    variant="primary"
                    onClick={() => navigateToCharacter(Characters._id)}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        </div>
        <br />
<link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css" />

<nav className="menu">
  <input type="checkbox" href="#" className="menu-open" name="menu-open" id="menu-open"/>
  <label className="menu-open-button" htmlFor="menu-open">
    <span className="hamburger hamburger-1"></span>
    <span className="hamburger hamburger-2"></span>
    <span className="hamburger hamburger-3"></span>
  </label>
  
  <a onClick={(e) => { e.preventDefault(); handleShow5();}} href="/" className="menu-item"> 
    <i className="fa-solid fa-plus"></i> 
</a>
  <a onClick={(e) => { e.preventDefault(); bigMaff(); handleShow(); }} href="#/" className="menu-item">
  <i className="fa-solid fa-dice"></i>
</a>
</nav>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1">
    <defs>
      <filter id="shadowed-goo">          
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
          <feGaussianBlur in="goo" stdDeviation="3" result="shadow" />
          <feColorMatrix in="shadow" mode="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 -0.2" result="shadow" />
          <feOffset in="shadow" dx="1" dy="1" result="shadow" />
          <feBlend in2="shadow" in="goo" result="goo" />
          <feBlend in2="goo" in="SourceGraphic" result="mix" />
      </filter>
      <filter id="goo">
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
          <feBlend in2="goo" in="SourceGraphic" result="mix" />
      </filter>
    </defs>
</svg>
    {/* ---------------------------Create Character (Random)------------------------------------------------------- */}
    <Modal className="dnd-modal" centered show={show} onHide={handleClose}>
       <center>
        <Card className="dnd-background">
          <Card.Title>Create Random</Card.Title>
        <Card.Body>   
        <center>
      <Form onSubmit={onSubmit} className="px-5">
      <Form.Group className="mb-3 pt-3">
       <Form.Label className="text-light">Character Name</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ characterName: e.target.value })}
        type="text" placeholder="Enter character name" />        
     </Form.Group>
     <center>
     <Button variant="primary" onClick={handleClose} type="submit">
            Create
          </Button>
          <Button className="ms-4" variant="secondary" onClick={handleClose}>
            Close
          </Button>
          </center>
     </Form>
     </center>
     </Card.Body> 
     </Card>  
     </center>      
      </Modal>
       {/* ---------------------------Create Character (Manual)------------------------------------------------------- */}
    <Modal className="dnd-modal" centered show={show5} onHide={handleClose5}>
       <center>
        <Card className="dnd-background">
          <Card.Title>Create Manual</Card.Title>
        <Card.Body>   
        <center>
      <Form 
      onSubmit={onSubmitManual} 
      className="px-5">
      <Form.Group className="mb-3 pt-3">
       <Form.Label className="text-light">Character Name</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ characterName: e.target.value })}
        type="text" placeholder="Enter character name max 12 characters" pattern="^([^0-9]{0,12})$"/>        
        <Form.Label className="text-light">Occupation</Form.Label>
        <Form.Select
              ref={selectedAddOccupationRef}
              onChange={handleOccupationChange}
              defaultValue=""
            >
              <option value="" disabled>Select your occupation</option>
              {getOccupation.map((occupation, i) => (
                <option key={i}>{occupation.Occupation}</option>
              ))}
            </Form.Select>  
         <Form.Label className="text-light">Age</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ age: e.target.value })}
        type="number" placeholder="Enter age" pattern="[0-9]*" />
         <Form.Label className="text-light">Sex</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ sex: e.target.value })}
        type="text"  placeholder="Enter sex" pattern="[^0-9]+" />
        <Form.Label className="text-light">Height</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ height: e.target.value })}
        type="number" placeholder="Enter height in inches" pattern="[0-9]*" />
        <Form.Label className="text-light">Weight</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ weight: e.target.value })}
        type="number" placeholder="Enter weight" pattern="[0-9]*" />
        <Form.Label className="text-light">Strength</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ str: e.target.value })}
        type="number" placeholder="Enter strength" pattern="[0-9]*" />
        <Form.Label className="text-light">Dexterity</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ dex: e.target.value })}
        type="number" placeholder="Enter dexterity" pattern="[0-9]*" />
        <Form.Label className="text-light">Constitution</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ con: e.target.value })}
        type="number" placeholder="Enter constitution" pattern="[0-9]*" />
        <Form.Label className="text-light">Intellect</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ int: e.target.value })}
        type="number" placeholder="Enter intellect" pattern="[0-9]*" />
        <Form.Label className="text-light">Wisdom</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ wis: e.target.value })}
        type="number" placeholder="Enter wisdom" pattern="[0-9]*" />
        <Form.Label className="text-light">Charisma</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ cha: e.target.value })}
        type="number" placeholder="Enter charisma" pattern="[0-9]*" />
        <Form.Label className="text-light">Health</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ health: e.target.value, tempHealth: e.target.value })}
        type="number" placeholder="Enter health" pattern="[0-9]*" />
     </Form.Group>
     <center>
     <Button variant="primary" onClick={handleClose5} type="submit">
            Create
          </Button>
          <Button className="ms-4" variant="secondary" onClick={handleClose5}>
            Close
          </Button>
          </center>
     </Form>
     </center>
     </Card.Body> 
     </Card>   
     </center>    
      </Modal>
      </div>
    </center>
    
  );
}
