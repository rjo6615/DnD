import React, { useState, useEffect } from "react";
import { Button, Col, Container, Form, Row } from "react-bootstrap";
import { useNavigate } from "react-router";
import Modal from 'react-bootstrap/Modal';
import { Link } from "react-router-dom";

export default function ZombiesHome() {
  // --------------------------Random Character Creator Section------------------------------------
 const navigate = useNavigate();
 const [form, setForm] = useState({ 
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
  }
  fetchData();   
  return;
  
}, [navigate]);

//  Update the state properties.
  function updateForm(value) {
    return setForm((prev) => {
      return { ...prev, ...value };
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
  });
   navigate(`/zombies-character-select/${form.campaign}`);
 }

//--------------------------------------------Campaign Section------------------------------

const [form1, setForm1] = useState({ 
  campaignName: "", 
  gameMode: "zombies",
});

const [campaignSearch, setCampaignSearch] = useState({ 
  campaign: "", 
});

const [campaign, setCampaign] = useState({ 
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
//---------------------------------------Weapons----------------------------------------------

const [form2, setForm2] = useState({ 
  weaponName: "", 
  enhancement: "",
  damage: "",
  critical: "",
  weaponStyle: "",
  range: ""
});

const [show2, setShow2] = useState(false);
const handleClose2 = () => setShow2(false);
const handleShow2 = () => setShow2(true);

function updateForm2(value) {
  return setForm2((prev) => {
    return { ...prev, ...value };
  });
}

async function onSubmit2(e) {
  e.preventDefault();   
   sendToDb2();
}

async function sendToDb2(){
  const newWeapon = { ...form2 };
    await fetch("/weapon/add", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify(newWeapon),
   })
   .catch(error => {
     window.alert(error);
     return;
   });
 
   setForm2({
    weaponName: "", 
    enhancement: "",
    damage: "",
    critical: "",
    weaponStyle: "",
    range: ""
  });
   navigate(0);
 }
 //  ------------------------------------Armor-----------------------------------

const [show3, setShow3] = useState(false);
const handleClose3 = () => setShow3(false);
const handleShow3 = () => setShow3(true);

 const [form3, setForm3] = useState({ 
  armorName: "", 
  armorBonus: "",
  maxDex: "",
  armorCheckPenalty: "",
});

function updateForm3(value) {
  return setForm3((prev) => {
    return { ...prev, ...value };
  });
}

async function onSubmit3(e) {
  e.preventDefault();   
   sendToDb3();
}

async function sendToDb3(){
  const newArmor = { ...form3 };
  await fetch("/armor/add", {
   method: "POST",
   headers: {
     "Content-Type": "application/json",
   },
   body: JSON.stringify(newArmor),
 })
 .catch(error => {
   window.alert(error);
   return;
 });

 setForm3({
  armorName: "", 
  armorBonus: "",
  maxDex: "",
  armorCheckPenalty: "",
});
 navigate(0);
}

//------------------------------------Items-------------------------------------------------------------------------------
const [show4, setShow4] = useState(false);
const handleClose4 = () => setShow4(false);
const handleShow4 = () => setShow4(true);

 const [form4, setForm4] = useState({ 
  itemName: "", 
  notes: "",
  str: "0",
  dex: "0",
  con: "0",
  int: "0",
  wis: "0",
  cha: "0",
  appraise: "0",
  balance: "0",
  bluff: "0",
  climb: "0",
  concentration: "0",
  decipherScript: "0",
  diplomacy: "0",
  disableDevice: "0",
  disguise: "0",
  escapeArtist: "0",
  forgery: "0",
  gatherInfo: "0",
  handleAnimal: "0",
  heal: "0",
  hide: "0",
  intimidate: "0",
  jump: "0",
  listen: "0",
  moveSilently: "0",
  openLock: "0",
  ride: "0",
  search: "0",
  senseMotive: "0",
  sleightOfHand: "0",
  spot: "0",
  survival: "0",
  swim: "0",
  tumble: "0",
  useTech: "0",
  useRope: "0",
});

function updateForm4(value) {
  return setForm4((prev) => {
    return { ...prev, ...value };
  });
}

async function onSubmit4(e) {
  e.preventDefault();   
   sendToDb4();
}

async function sendToDb4(){
  const newItem = { ...form4 };
  await fetch("/item/add", {
   method: "POST",
   headers: {
     "Content-Type": "application/json",
   },
   body: JSON.stringify(newItem),
 })
 .catch(error => {
   window.alert(error);
   return;
 });

 setForm4({
  itemName: "", 
  notes: "",
  str: "",
  dex: "",
  con: "",
  int: "",
  wis: "",
  cha: "",
  appraise: "",
  balance: "",
  bluff: "",
  climb: "",
  concentration: "",
  decipherScript: "",
  diplomacy: "",
  disableDevice: "",
  disguise: "",
  escapeArtist: "",
  forgery: "",
  gatherInfo: "",
  handleAnimal: "",
  heal: "",
  hide: "",
  intimidate: "",
  jump: "",
  listen: "",
  moveSilently: "",
  openLock: "",
  ride: "",
  search: "",
  senseMotive: "",
  sleightOfHand: "",
  spot: "",
  survival: "",
  swim: "",
  tumble: "",
  useTech: "",
  useRope: "",
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
          <option>{el.campaignName}</option>
          ))};
        </Form.Select>
      </Form.Group>
      <Link className="btn btn-link" to={`/zombies-character-select/${campaignSearch.campaign}`}>
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
    <Button className="p-1 m-1" size="sm"  style={{backgroundImage: 'url(./images/zombie-campaign.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat", color: "silver", maxWidth: 85, minHeight: 85, border: "3px solid silver"}} variant="secondary">Create Character (Manual)</Button>
    <Button onClick={() => { handleShow2();}} className="p-1 m-1" size="sm"  style={{backgroundImage: 'url(./images/zombie-campaign.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat", color: "silver", maxWidth: 85, minHeight: 85, border: "3px solid silver"}} variant="secondary">Create Weapon</Button>
    <Button onClick={() => { handleShow3();}} className="p-1 m-1" size="sm"  style={{backgroundImage: 'url(./images/zombie-campaign.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat", color: "silver", maxWidth: 85, minHeight: 85, border: "3px solid silver"}} variant="secondary">Create Armor</Button>
    <Button onClick={() => { handleShow4();}} className="p-1 m-1" size="sm"  style={{backgroundImage: 'url(./images/zombie-campaign.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat", color: "silver", maxWidth: 85, minHeight: 85, border: "3px solid silver"}} variant="secondary">Create Item</Button>
    </Col>   
    {/* ---------------------------Modals------------------------------------------------------- */}
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
      {/* ----------------------------------Weapon Modal---------------------------------------- */}
      <Modal show={show2} onHide={handleClose2}>
        <Modal.Header closeButton>
          <Modal.Title>Create Weapon</Modal.Title>
        </Modal.Header>
        <Modal.Body>   
        <center>
      <Form onSubmit={onSubmit2} className="px-5">
      <Form.Group className="mb-3 pt-3" >

       <Form.Label className="text-dark">Weapon Name</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm2({ weaponName: e.target.value })}
        type="text" placeholder="Enter Weapon name" /> 

       <Form.Label className="text-dark">Enhancement Bonus</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm2({ enhancement: e.target.value })}
        type="text" placeholder="Enter Enhancement Bonus" />

       <Form.Label className="text-dark">Damage</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm2({ damage: e.target.value })}
        type="text" placeholder="Enter Damage" />  

       <Form.Label className="text-dark">Critical</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm2({ critical: e.target.value })}
        type="text" placeholder="Enter Weapon Critical" />

       <Form.Label className="text-dark">Weapon Type</Form.Label>
       <Form.Select className="mb-2" onChange={(e) => updateForm2({ weaponStyle: e.target.value })}
        type="text">
        <option></option>
        <option value= "0">One Handed</option> 
        <option value= "1">Two Handed</option> 
        <option value= "2">Ranged</option> 
        </Form.Select>

       <Form.Label className="text-dark">Range</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm2({ range: e.target.value })}
        type="text" placeholder="Enter Range" />   

     </Form.Group>
     <center>
     <Button variant="primary" onClick={handleClose2} type="submit">
            Create
          </Button>
          <Button className="ms-4" variant="secondary" onClick={handleClose2}>
            Close
          </Button>
          </center>
     </Form>
     </center>
     </Modal.Body>        
      </Modal>
{/* --------------------------------------- Armor Modal --------------------------------- */}
<Modal show={show3} onHide={handleClose3}>
<Modal.Header closeButton>
  <Modal.Title>Create Armor</Modal.Title>
</Modal.Header>
<Modal.Body>   
<center>
<Form onSubmit={onSubmit3} className="px-5">
<Form.Group className="mb-3 pt-3"  >
<Form.Label className="text-dark">Armor Name</Form.Label>
<Form.Control className="mb-2" onChange={(e) => updateForm3({ armorName: e.target.value })}
type="text" placeholder="Enter Armor name" />   
<Form.Label className="text-dark">Armor Bonus</Form.Label>
<Form.Control className="mb-2" onChange={(e) => updateForm3({ armorBonus: e.target.value })}
type="text" placeholder="Enter Armor Bonus" />
<Form.Label className="text-dark">Max Dex Bonus</Form.Label>
<Form.Control className="mb-2" onChange={(e) => updateForm3({ maxDex: e.target.value })}
type="text" placeholder="Enter Max Dex Bonus" />     
<Form.Label className="text-dark">Armor Check Penalty</Form.Label>
<Form.Control className="mb-2" onChange={(e) => updateForm3({ armorCheckPenalty: e.target.value })}
type="text" placeholder="Enter Armor Check Penalty" />     
</Form.Group>
<center>
<Button variant="primary" onClick={handleClose3} type="submit">
    Create
  </Button>
  <Button className="ms-4" variant="secondary" onClick={handleClose3}>
    Close
  </Button>
  </center>
</Form>
</center>
</Modal.Body>        
</Modal>
{/* -----------------------------------------Item Modal--------------------------------------------- */}
<Modal show={show4} onHide={handleClose4}>
        <Modal.Header closeButton>
          <Modal.Title>Create Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>   
        <center>
      <Form onSubmit={onSubmit4} className="px-5">
      <Form.Group className="mb-3 pt-3" >

       <Form.Label className="text-dark">Item Name</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ itemName: e.target.value })}
        type="text" placeholder="Enter Item name" /> 

       <Form.Label className="text-dark">Notes</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ notes: e.target.value })}
        type="text" placeholder="Enter Notes" />

       <Form.Label className="text-dark">Strength</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ str: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Strength" />  

       <Form.Label className="text-dark">Dexterity</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ dex: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Dexterity" />

       <Form.Label className="text-dark">Constitution</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ con: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Constitution" />   

       <Form.Label className="text-dark">Intellect</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ int: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Intellect" />  

       <Form.Label className="text-dark">Wisdom</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ wis: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Wisdom" />  

       <Form.Label className="text-dark">Charisma</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ cha: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Charisma" /> 

       <Form.Label className="text-dark">Appraise</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ appraise: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Appraise" />

       <Form.Label className="text-dark">Balance</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ balance: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Balance" />

       <Form.Label className="text-dark">Bluff</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ bluff: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Bluff" />

       <Form.Label className="text-dark">Climb</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ climb: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Climb" /> 

       <Form.Label className="text-dark">Concentration</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ concentration: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Concentration" />

       <Form.Label className="text-dark">Decipher Script</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ decipherScript: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Decipher Script" />

       <Form.Label className="text-dark">Diplomacy</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ diplomacy: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Diplomacy" />

       <Form.Label className="text-dark">Disable Device</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ disableDevice: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Disable Device" />

       <Form.Label className="text-dark">Disguise</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ disguise: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Disguise" />

       <Form.Label className="text-dark">Escape Artist</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ escapeArtist: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Escape Artist" />

       <Form.Label className="text-dark">Forgery</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ forgery: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Forgery" />

       <Form.Label className="text-dark">Gather Info</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ gatherInfo: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Gather Info" />

       <Form.Label className="text-dark">Handle Animal</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ handleAnimal: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Handle Animal" />

       <Form.Label className="text-dark">Heal</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ heal: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Heal" />

       <Form.Label className="text-dark">Hide</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ hide: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Hide" />

       <Form.Label className="text-dark">Intimidate</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ intimidate: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Intimidate" />

       <Form.Label className="text-dark">Jump</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ jump: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Jump" /> 

       <Form.Label className="text-dark">Listen</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ listen: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Listen" />

       <Form.Label className="text-dark">Move Silently</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ moveSilently: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Move Silently" />

       <Form.Label className="text-dark">Open Lock</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ openLock: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Open Lock" />

       <Form.Label className="text-dark">Ride</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ ride: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Ride" />

       <Form.Label className="text-dark">Search</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ search: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Search" />

       <Form.Label className="text-dark">Sense Motive</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ senseMotive: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Sense Motive" />

       <Form.Label className="text-dark">Sleight of Hand</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ sleightOfHand: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Sleight of Hand" />

       <Form.Label className="text-dark">Spot</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ spot: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Spot" />

       <Form.Label className="text-dark">Survival</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ survival: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Survival" />

       <Form.Label className="text-dark">Swim</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ swim: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Swim" />

       <Form.Label className="text-dark">Tumble</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ tumble: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Tumble" />

       <Form.Label className="text-dark">Use Tech</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ useTech: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Use Tech" />

       <Form.Label className="text-dark">Use Rope</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm4({ useRope: e.target.value === "" ? 0 : e.target.value, })}
        type="text" placeholder="Enter Use Rope" />

     </Form.Group>
     <center>
     <Button variant="primary" onClick={handleClose4} type="submit">
            Create
          </Button>
          <Button className="ms-4" variant="secondary" onClick={handleClose4}>
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