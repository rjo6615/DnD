import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button, Col, Container, Form, Row } from "react-bootstrap";
import { useNavigate } from "react-router";
import Modal from 'react-bootstrap/Modal';
import { Link } from "react-router-dom";

export default function ZombiesHome() {
  const token = JSON.parse(localStorage.getItem('token'));
  const navigate = useNavigate();
// --------------------------Random Character Creator Section------------------------------------
 const [form, setForm] = useState({ 
  token: token.token,
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

// Height Randomizer
let randomHeight = Math.round(Math.random() * (76 - 60)) + 60;
let feet = Math.floor(randomHeight / 12);
let inches = randomHeight %= 12;
let newHeight = ( feet + "ft " + inches + 'in');
updateForm({ height: newHeight }); 

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
  navigate(`/zombies-character-select/${form.campaign}`);
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

//--------------------------------------------Campaign Section------------------------------

const [form1, setForm1] = useState({ 
  campaignName: "", 
  gameMode: "zombies",
  dm: token.token,
  players: [""],
});
const [campaignSearch, setCampaignSearch] = useState({ 
  campaign: "", 
});

const [campaignDMSearch, setCampaignDMSearch] = useState({ 
  campaign: "", 
});


const [campaign, setCampaign] = useState({ 
  campaign: [], 
});

const [campaignDM, setCampaignDM] = useState({ 
  campaign: [], 
});

const [show1, setShow1] = useState(false);
const handleClose1 = () => setShow1(false);
const handleShow1 = () => setShow1(true);

// Fetch Campaigns
useEffect(() => {
  async function fetchData1() {
    const response = await fetch(`/campaigns`);    

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
    setCampaign({campaign: record});
  }
  fetchData1();   
  return;
  
}, [navigate]);

// Fetch CampaignsDM
useEffect(() => {
  async function fetchCampaignsDM() {
    const response = await fetch(`/campaignsDM/${token.token}`);    

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
    setCampaignDM({campaign: record});
  }
  fetchCampaignsDM();   
  return;
  
}, [ navigate, token.token ]);


function updateForm1(value) {
  return setForm1((prev) => {
    return { ...prev, ...value };
  });
}
function updateCampaignSearch(value) {
  return setCampaignSearch((prev) => {
    return { ...prev, ...value };
  });
}
function updateCampaignDMSearch(value) {
  return setCampaignDMSearch((prev) => {
    return { ...prev, ...value };
  });
}

async function onSubmit1(e) {
  e.preventDefault();   
   sendToDb1();
}
 async function sendToDb1(){
    const newCampaign = { ...form1 };
      await fetch("/campaign/add", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
       },
       body: JSON.stringify(newCampaign),
     })
     .catch(error => {
       window.alert(error);
       return;
     });

     setForm1({
      campaignName: "", 
      gameMode: "zombies",
    });
     navigate(0);
   }

// -----------------------------------Display-----------------------------------------------------------------------------
 return (
<center className="pt-2" style={{ backgroundImage: 'url(./images/zombie.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "100vh"}}>
      <h1 className="text-light">Zombies</h1>    
      <Container className="mt-3">
      <Row>
        <Col>
          <Form>
          <Form.Group className="mb-3 mx-5">
        <Form.Label className="text-light">Select Campaign</Form.Label>
        <Form.Select onChange={(e) => updateCampaignSearch({ campaign: e.target.value })} type="text">
          <option></option>
          {campaign.campaign.map((el) => (  
          <option key={el.campaignName}>{el.campaignName}</option>
          ))};
        </Form.Select>
      </Form.Group>
      <Link className="btn btn-link" to={`/zombies-character-select/${campaignSearch.campaign}`}>
        <Button className="rounded-pill" variant="outline-light" type="submit">Search</Button>
      </Link>
          </Form>
          <Form>
          <Form.Group className="mb-3 mx-5">
        <Form.Label className="text-light">Host Campaign</Form.Label>
        <Form.Select onChange={(e) => updateCampaignDMSearch({ campaign: e.target.value })} type="text">
          <option></option>
          {campaignDM.campaign.map((el) => (  
          <option key={el.campaignName}>{el.campaignName}</option>
          ))};
        </Form.Select>
      </Form.Group>
      <Link className="btn btn-link" to={`/zombies-dm/${campaignDMSearch.campaign}`}>
        <Button className="rounded-pill" variant="outline-light" type="submit">Search</Button>
      </Link>
          </Form>
        </Col>
      </Row>
    </Container>
    <br></br>    
    <Col xs={10} md={10} lg={10} xl={10}>
    <Button onClick={() => { handleShow1();}} className="p-1 m-1" size="sm"  style={{backgroundImage: 'url(./images/zombie-campaign.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat", color: "silver", maxWidth: 85, minHeight: 85, border: "3px solid silver"}} variant="secondary">Create Campaign</Button>
    <Button onClick={() => {bigMaff(); handleShow();}} className="p-1 m-1" size="sm"  style={{backgroundImage: 'url(./images/zombie-campaign.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat", color: "silver", maxWidth: 85, minHeight: 85, border: "3px solid silver"}} variant="secondary">Create Character (Random)</Button>
    <Button onClick={() => { handleShow5();}} className="p-1 m-1" size="sm"  style={{backgroundImage: 'url(./images/zombie-campaign.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat", color: "silver", maxWidth: 85, minHeight: 85, border: "3px solid silver"}} variant="secondary">Create Character (Manual)</Button>
    </Col>   
    {/* ---------------------------Create Character (Random)------------------------------------------------------- */}
    <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Create Random</Modal.Title>
        </Modal.Header>
        <Modal.Body>   
        <center>
      <Form onSubmit={onSubmit} className="px-5">
      <Form.Group className="mb-3 pt-3">
       <Form.Label className="text-dark">Character Name</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ characterName: e.target.value })}
        type="text" placeholder="Enter character name" />        
        <Form.Label className="text-dark">Select Campaign</Form.Label>
        <Form.Select onChange={(e) => updateForm({ campaign: e.target.value })} type="text">
          <option></option>
          {campaign.campaign.map((el) => (  
          <option key={el.campaignName}>{el.campaignName}</option>
          ))};
        </Form.Select>       
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
     </Modal.Body>        
      </Modal>
       {/* ---------------------------Create Character (Manual)------------------------------------------------------- */}
    <Modal show={show5} onHide={handleClose5}>
        <Modal.Header closeButton>
          <Modal.Title>Create Manual</Modal.Title>
        </Modal.Header>
        <Modal.Body>   
        <center>
      <Form 
      onSubmit={onSubmitManual} 
      className="px-5">
      <Form.Group className="mb-3 pt-3">
       <Form.Label className="text-dark">Character Name</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ characterName: e.target.value })}
        type="text" placeholder="Enter character name max 12 characters" pattern="^([^0-9]{0,12})$"/>        
        <Form.Label className="text-dark">Select Campaign</Form.Label>
        <Form.Select onChange={(e) => updateForm({ campaign: e.target.value })} type="text">
          <option></option>
          {campaign.campaign.map((el) => (  
          <option key={el.campaignName}>{el.campaignName}</option>
          ))};
        </Form.Select>   
        <Form.Label className="text-dark">Occupation</Form.Label>
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
         <Form.Label className="text-dark">Age</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ age: e.target.value })}
        type="number" placeholder="Enter age" pattern="[0-9]*" />
         <Form.Label className="text-dark">Sex</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ sex: e.target.value })}
        type="text"  placeholder="Enter sex" pattern="[^0-9]+" />
        <Form.Label className="text-dark">Height</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ height: e.target.value })}
        type="number" placeholder="Enter height in inches" pattern="[0-9]*" />
        <Form.Label className="text-dark">Weight</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ weight: e.target.value })}
        type="number" placeholder="Enter weight" pattern="[0-9]*" />
        <Form.Label className="text-dark">Strength</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ str: e.target.value })}
        type="number" placeholder="Enter strength" pattern="[0-9]*" />
        <Form.Label className="text-dark">Dexterity</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ dex: e.target.value })}
        type="number" placeholder="Enter dexterity" pattern="[0-9]*" />
        <Form.Label className="text-dark">Constitution</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ con: e.target.value })}
        type="number" placeholder="Enter constitution" pattern="[0-9]*" />
        <Form.Label className="text-dark">Intellect</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ int: e.target.value })}
        type="number" placeholder="Enter intellect" pattern="[0-9]*" />
        <Form.Label className="text-dark">Wisdom</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ wis: e.target.value })}
        type="number" placeholder="Enter wisdom" pattern="[0-9]*" />
        <Form.Label className="text-dark">Charisma</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ cha: e.target.value })}
        type="number" placeholder="Enter charisma" pattern="[0-9]*" />
        <Form.Label className="text-dark">Health</Form.Label>
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
     </Modal.Body>        
      </Modal>
      {/* -----------------------------------Create Campaign--------------------------------------------- */}
      <Modal show={show1} onHide={handleClose1}>
        <Modal.Header closeButton>
          <Modal.Title>Create Campaign</Modal.Title>
        </Modal.Header>
        <Modal.Body>   
        <center>
      <Form onSubmit={onSubmit1} className="px-5">
      <Form.Group className="mb-3 pt-3">
       <Form.Label className="text-dark">Campaign Name</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm1({ campaignName: e.target.value })}
        type="text" placeholder="Enter campaign name" />         
     </Form.Group>
     <center>
     <Button variant="primary" onClick={handleClose1} type="submit">
            Create
          </Button>
          <Button className="ms-4" variant="secondary" onClick={handleClose1}>
            Close
          </Button>
          </center>
     </Form>
     </center>
     </Modal.Body>        
      </Modal>
    </center>
 )
}