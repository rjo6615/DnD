import React, { useState, useEffect } from "react";
import { Button, Col, Container, Form, Row } from "react-bootstrap";
import { useNavigate } from "react-router";
import Modal from 'react-bootstrap/Modal';
import { Link } from "react-router-dom";

export default function ZombiesHome() {
  // --------------------Global Variables Section------------------------
 const navigate = useNavigate();
 const [form, setForm] = useState({ 
  characterName: "", 
  campaign: "",
  level: "",
  occupation: "", 
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
  health: "",
});
const [form1, setForm1] = useState({ 
    campaignName: "", 
    gameMode: "zombies",
  });

const [campaignSearch, setCampaignSearch] = useState({ 
    campaign: "", 
  });

const [occupation, setOccupation] = useState({ 
  occupation: [], 
});

const [campaign, setCampaign] = useState({ 
    campaign: [], 
  });

const [show, setShow] = useState(false);
const handleClose = () => setShow(false);
const handleShow = () => setShow(true);
const [show1, setShow1] = useState(false);
const handleClose1 = () => setShow1(false);
const handleShow1 = () => setShow1(true);

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
  }
  fetchData();   
  return;
  
}, [navigate]);

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

//  Update the state properties.
  function updateForm(value) {
    return setForm((prev) => {
      return { ...prev, ...value };
    });
  }
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

 // Function to handle submission.
 async function onSubmit(e) {
  e.preventDefault();   
   sendToDb();
}
async function onSubmit1(e) {
    e.preventDefault();   
     sendToDb1();
  }
// -------------------Big Maffs Section-------------------

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
updateForm({ occupation: newOccupation }); 

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
let randomStr = sumArray[0]; 
updateForm({ str: randomStr });
let randomDex = sumArray[1]; 
updateForm({ dex: randomDex }); 
let randomCon = sumArray[2]; 
updateForm({ con: randomCon }); 
let randomInt = sumArray[3]; 
updateForm({ int: randomInt });
let randomWis = sumArray[4]; 
updateForm({ wis: randomWis });
let randomCha = sumArray[5];
updateForm({ cha: randomCha });
}

// Health Randomizer
const [healthArray, setHealthArray] = useState([]);
let newHealth;
const parsedCon = parseFloat(form.con);
let conMod;
let lvl = form.level;
conMod = Math.floor((parsedCon - 10) / 2);
newHealth =  healthArray[0] + (lvl * conMod);

useEffect(() => {    
  updateForm({ health: newHealth});
}, [ newHealth ]);

  useEffect(() => {  
  const lvl = form.level;
  const diceValue = form.occupation.Health;
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
}, [ form.occupation.Health, form.level ]);

 // ----------------------Sends form data to database--------------------------------------
 async function sendToDb(){
  const newCharacter = { ...form };
    await fetch("/character/add", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify(newCharacter),
   })
   .catch(error => {
     window.alert(error);
     return;
   });
 
   setForm({
    characterName: "",
    campaign: "", 
    level: "",
    occupation: "",
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
    health: "",
  });
   navigate(`/zombies-character-select`);
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
   
     setForm({
      campaignName: "", 
      gameMode: "zombies",
    });
     navigate(`/`);
   }

 return (
<center style={{ backgroundImage: 'url(./images/zombie.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat"}}>
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
          <option>{el.campaignName}</option>
          ))};
        </Form.Select>
      </Form.Group>
      <Link className="btn btn-link" to={`/zombies-character-select/${campaignSearch.campaign}`}>
        <Button className="rounded-pill" variant="outline-primary" type="submit">Search</Button>
      </Link>
          </Form>
        </Col>
      </Row>
    </Container>
    <br></br>
    <Button onClick={() => { handleShow1();}} className="p-1 m-1" size="lg"  style={{minWidth: 300}} variant="secondary">Create Campaign</Button>
    <Button onClick={() => {bigMaff(); handleShow();}} className="p-1 m-1" size="lg"  style={{minWidth: 300}} variant="secondary">Create Character (Random)</Button>
    <Button href="/Zombie-Manual-Creation" className="p-1 m-1" size="lg"  style={{minWidth: 300}} variant="secondary">Create Character (Manual)</Button>
    <br></br>
    <br></br>
    {/* ---------------------------Modals------------------------------------------------------- */}
    <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Create Random</Modal.Title>
        </Modal.Header>
        <Modal.Body>   
        <center>
      <Form onSubmit={onSubmit} className="px-5">
      <Form.Group className="mb-3 pt-3" controlId="formExerciseName">
       <Form.Label className="text-dark">Character Name</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ characterName: e.target.value })}
        type="text" placeholder="Enter character name" />       
       <Form.Label className="text-dark">Starting Level</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ level: e.target.value })}
        type="text" placeholder="Enter starting level" />   
        <Form.Label className="text-dark">Select Campaign</Form.Label>
        <Form.Select onChange={(e) => updateForm({ campaign: e.target.value })} type="text">
          <option></option>
          {campaign.campaign.map((el) => (  
          <option>{el.campaignName}</option>
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
      {/* Create Campaign */}
      <Modal show={show1} onHide={handleClose1}>
        <Modal.Header closeButton>
          <Modal.Title>Create Campaign</Modal.Title>
        </Modal.Header>
        <Modal.Body>   
        <center>
      <Form onSubmit={onSubmit1} className="px-5">
      <Form.Group className="mb-3 pt-3" controlId="formExerciseName">
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
 );
}