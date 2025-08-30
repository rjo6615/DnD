import React, { useEffect, useState, useRef, useCallback } from "react";
import apiFetch from '../../../utils/apiFetch';
import Button from 'react-bootstrap/Button';
import { Table, Form, Modal, Card } from 'react-bootstrap';
import { useParams, useNavigate } from "react-router-dom";
import '../../../App.scss';
import zombiesbg from "../../../images/zombiesbg.jpg";
import useUser from '../../../hooks/useUser';
import { SKILLS } from "../skillSchema";
import { STATS } from "../statSchema";

export default function RecordList() {
  const params = useParams();
  const [records, setRecords] = useState([]);
  const navigate = useNavigate();
  const user = useUser();

  useEffect(() => {
    if (!user) {
      return;
    }
    async function getRecords() {
    const response = await apiFetch(`/campaigns/${params.campaign}/${user.username}`);

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
  }, [params.campaign, user]);

  const navigateToCharacter = (id) => {
    navigate(`/zombies-character-sheet/${id}`);
  }

// --------------------------Random Character Creator Section------------------------------------
  const createEmptyArray = (length) => Array(length).fill("");

const createDefaultForm = useCallback((campaign) => {
  const skillDefaults = Object.fromEntries(SKILLS.map(({ key }) => [key, 0]));
  const statDefaults = Object.fromEntries(STATS.map(({ key }) => [key, ""]));
  return {
    token: "",
    characterName: "",
    campaign: campaign.toString(),
    occupation: [""],
    feat: [createEmptyArray(SKILLS.length + 2)],
    weapon: [createEmptyArray(6)],
    armor: [createEmptyArray(4)],
    item: [createEmptyArray(SKILLS.length + 8)],
    age: "",
    sex: "",
    height: "",
    weight: "",
    startStatTotal: "",
    health: "",
    tempHealth: "",
    ...statDefaults,
    ...skillDefaults,
    newSkill: [["", 0]],
    diceColor: "#000000",
  };
}, []);

  const [form, setForm] = useState(createDefaultForm(params.campaign));

useEffect(() => {
  // Update form state once the token is decoded
  if (user) {
    setForm(prevForm => ({ ...prevForm, token: user.username }));
  }
}, [user]);

const [occupation, setOccupation] = useState({ 
  occupation: [], 
});

const [show, setShow] = useState(false);
const handleClose = () => setShow(false);
const handleShow = () => setShow(true);

// Fetch Occupations
useEffect(() => {
  if (!user) return;
  async function fetchData() {
    const response = await apiFetch(`/characters/occupations`);

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

}, [navigate, user]);

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
      await apiFetch("/characters/add", {
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
   setForm(createDefaultForm(params.campaign));
  navigate(0);
}, [form, setForm, navigate, createDefaultForm, params.campaign]);

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

const [isOccupationConfirmed, setIsOccupationConfirmed] = useState(false);

const handleConfirmOccupation = useCallback(() => {
  if (selectedOccupation && !isOccupationConfirmed) {
    const selectedAddOccupation = selectedAddOccupationRef.current.value;
    const occupationExists = form.occupation.some(
      (occupation) => occupation.Occupation === selectedOccupation.Occupation
    );
    const selectedAddOccupationObject = getOccupation.find(
      (occupation) => occupation.Occupation === selectedAddOccupation
    );

    if (!occupationExists && selectedAddOccupationObject) {
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

      const updatedForm = {
        ...form,
        occupation: [selectedOccupation],
        startStatTotal: totalNewStats,
        str: addOccupationStr,
        dex: addOccupationDex,
        con: addOccupationCon,
        int: addOccupationInt,
        wis: addOccupationWis,
        cha: addOccupationCha,
      };

      setForm(updatedForm);
      setIsOccupationConfirmed(true);
      return updatedForm;
    }
  }
  return form;
}, [selectedOccupation, isOccupationConfirmed, form, getOccupation, selectedAddOccupationRef, setForm]);

const sendManualToDb = useCallback(async (characterData) => {
  const newCharacter = characterData ?? form;
  if (!newCharacter.occupation?.[0]?.Level) {
    window.alert("Occupation level is required.");
    return;
  }
  try {
    await apiFetch("/characters/add", {
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
  navigate(`/zombies-character-select/${newCharacter.campaign}`);
}, [form, navigate]);

// Function to handle submission for manual character creation.
const onSubmitManual = async (e) => {
  e.preventDefault();
  const updatedForm = await handleConfirmOccupation();
  await sendManualToDb(updatedForm);
};

  return (
    <div className="pt-2 text-center" style={{ fontFamily: 'Raleway, sans-serif', backgroundImage: `url(${zombiesbg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "100vh"}}>
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
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", // Light shadow for depth
    margin: "0 auto"
  }} 
  className="text-light"
>
  {params.campaign.toString()}
</h1>
<div style={{ maxHeight: '300px', overflowY: 'auto', position: 'relative', zIndex: '4'}}>
        <Table style={{ width: 'auto', position: "relative", zIndex: "4", margin: "0 auto" }} striped bordered condensed="true" className="zombieCharacterSelectTable dnd-background">
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
       <div className="text-center">
        <Card className="dnd-background">
          <Card.Title>Create Random</Card.Title>
        <Card.Body>   
        <div className="text-center">
      <Form onSubmit={onSubmit} className="px-5">
      <Form.Group className="mb-3 pt-3">
       <Form.Label className="text-light">Character Name</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ characterName: e.target.value })}
        type="text" placeholder="Enter character name" />        
     </Form.Group>
     <div className="text-center">
     <Button variant="primary" onClick={handleClose} type="submit">
            Create
          </Button>
          <Button className="ms-4" variant="secondary" onClick={handleClose}>
            Close
          </Button>
          </div>
     </Form>
     </div>
     </Card.Body> 
     </Card>  
     </div>      
      </Modal>
       {/* ---------------------------Create Character (Manual)------------------------------------------------------- */}
    <Modal className="dnd-modal" centered show={show5} onHide={handleClose5}>
       <div className="text-center">
        <Card className="dnd-background">
          <Card.Title>Create Manual</Card.Title>
        <Card.Body>   
        <div className="text-center">
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
        {STATS.map(({ key, label }) => (
          <React.Fragment key={key}>
            <Form.Label className="text-light">{label}</Form.Label>
            <Form.Control
              className="mb-2"
              onChange={(e) => updateForm({ [key]: e.target.value })}
              type="number"
              placeholder={`Enter ${label.toLowerCase()}`}
              pattern="[0-9]*"
            />
          </React.Fragment>
        ))}
        <Form.Label className="text-light">Health</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ health: e.target.value, tempHealth: e.target.value })}
        type="number" placeholder="Enter health" pattern="[0-9]*" />
     </Form.Group>
     <div className="text-center">
     <Button variant="primary" onClick={handleClose5} type="submit">
            Create
          </Button>
          <Button className="ms-4" variant="secondary" onClick={handleClose5}>
            Close
          </Button>
          </div>
     </Form>
     </div>
     </Card.Body> 
     </Card>   
     </div>    
      </Modal>
      </div>
    </div>
    
  );
}
