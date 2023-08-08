import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Accordion from 'react-bootstrap/Accordion';
import Table from 'react-bootstrap/Table';
import { Button, Col, Form, Row } from "react-bootstrap";
// import { Link } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useNavigate } from "react-router";
import '../../App.css';

export default function ZombiesCharacterSheet() {
  const navigate = useNavigate();
  const params = useParams();
  const [form, setForm] = useState({ 
    characterName: "",
    level: "", 
    occupation: "", 
    weapon: [["","","",""]],
    armor: [["","",""]],
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
    climb: "",
    gatherInfo: "",
    heal: "",
    jump: "",
  });

   //Fetches character data
 useEffect(() => {
  async function fetchData() {
    const response = await fetch(`/characters/${params.id}`);    

    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      window.alert(message);
      return;
    }

    const record = await response.json();
    if (!record) {
      window.alert(`Character not found`);
      navigate("/");
      return;
    }

    setForm(record);
  }
  fetchData();   
  return;
  
}, [params.id, navigate]);
//------------------------------Stats--------------------------------------------------------------------------------------------------------------------------------------------
let currStr = form.str; 
let currDex = form.dex;
let currCon = form.con;
let currInt = form.int;
let currWis = form.wis;
let currCha = form.cha;

const statForm = {
  str: currStr,
  dex: currDex,
  con: currCon,
  int: currInt,
  wis: currWis,
  cha: currCha,
}

 // Sends statForm data to database for update
 async function statsUpdate(){
  const updatedStats = { ...statForm };
    await fetch(`/update-stats/${params.id}`, {
     method: "PUT",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify(updatedStats),
   })
   .catch(error => {
     window.alert(error);
     return;
   });
   navigate(0);
 }
//Stat Mods
 let strMod = Math.floor((form.str - 10) / 2); 
 let dexMod = Math.floor((form.dex - 10) / 2); 
 let conMod = Math.floor((form.con - 10) / 2); 
 let intMod = Math.floor((form.int - 10) / 2);
 let wisMod = Math.floor((form.wis - 10) / 2);  
 let chaMod = Math.floor((form.cha - 10) / 2);

let statTotal = form.str + form.dex + form.con + form.int + form.wis + form.cha;
let statPointsLeft = Math.floor((form.level / 4) - (statTotal - form.startStatTotal));

  let showBtn = "";
  if (statPointsLeft === 0) {
    showBtn = "none";
  }

  function addStat(stat, statMod) {
    if (statPointsLeft === 0){
    } else {
    statForm[stat]++;
    statPointsLeft--;
    document.getElementById(stat).innerHTML = statForm[stat];
    document.getElementById("statPointLeft").innerHTML = statPointsLeft;
    document.getElementById(statMod).innerHTML = Math.floor((statForm[stat] - 10) / 2);
    }
  };
  function removeStat(stat, statMod) {
    if (statForm[stat] === form[stat]){
    } else {
    statForm[stat]--;
    statPointsLeft++;
    document.getElementById(stat).innerHTML = statForm[stat];
    document.getElementById("statPointLeft").innerHTML = statPointsLeft;
    document.getElementById(statMod).innerHTML = Math.floor((statForm[stat] - 10) / 2);
    }
  };
//-----------------------Health/Defense-------------------------------------------------------------------------------------------------------------------------------------------------
  // Saves Maffs
  let fortSave;
  let reflexSave;
  let willSave;
  let atkBonusSave;
  if (form.occupation.Fort === "0") {
    fortSave = Math.floor(form.level / 3);
  } if (form.occupation.Fort === "1") {
    fortSave = Math.floor((form.level / 2) + 2);
  }
  if (form.occupation.Reflex === "0") {
    reflexSave = Math.floor(form.level / 3);
  } else if (form.occupation.Reflex === "1") {
    reflexSave = Math.floor((form.level / 2) + 2);
  }
  if (form.occupation.Will === "0") {
    willSave = Math.floor(form.level / 3);
  } else if (form.occupation.Will === "1") {
    willSave = Math.floor((form.level / 2) + 2);
  }

  if (form.occupation.atkBonus === "0") {
    atkBonusSave = Math.floor(form.level / 2);
  } else if (form.occupation.atkBonus === "1") {
    atkBonusSave = Math.floor((form.level * .75));
  } else if (form.occupation.atkBonus === "2") {
    atkBonusSave = form.level;
  }

  // Health
  let currHealth = form.tempHealth

 // Sends tempHealth data to database for update
 async function tempHealthUpdate(){
    await fetch(`/update-temphealth/${params.id}`, {
     method: "PUT",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
      tempHealth: currHealth,
     }),
   })
   .catch(error => {
     window.alert(error);
     return;
   });
 }
  function addHealth() {
    if (currHealth === form.health + Number(conMod * form.level)){
    } else {
    currHealth++;
    document.getElementById("health").innerHTML = currHealth;
    }
  };
  function removeHealth() {
    if (currHealth === -10){
    } else {
    currHealth--;
    document.getElementById("health").innerHTML = currHealth;
    }
  };
//-----------------------Skills--------------------------------------------------------------------------------------------------------------------------------------------------------------------
let currClimb = form.climb; 
let currGatherInfo = form.gatherInfo;
let currHeal = form.heal;
let currJump = form.jump;

const skillForm = {
  climb: currClimb,
  gatherInfo: currGatherInfo,
  heal: currHeal,
  jump: currJump,
}
 // Sends skillForm data to database for update
 async function skillsUpdate(){
  const updatedSkills = { ...skillForm };
    await fetch(`/update-skills/${params.id}`, {
     method: "PUT",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify(updatedSkills),
   })
   .catch(error => {
     window.alert(error);
     return;
   });
   navigate(0);
 }
let totalClimb = form.climb + strMod;
let totalGatherInfo = form.gatherInfo + chaMod;
let totalHeal = form.heal + wisMod;
let totalJump = form.jump + strMod;

const skillTotalForm = {
  climb: totalClimb,
  gatherInfo: totalGatherInfo,
  heal: totalHeal,
  jump: totalJump,
}

let skillTotal = form.climb + form.gatherInfo + form.heal + form.jump;
let skillPointsLeft = Math.floor((Number(form.occupation.skillMod) + intMod) * 4 + (Number(form.occupation.skillMod) + intMod) * (form.level - 1) - skillTotal);

let showSkillBtn = "";
if (skillPointsLeft === 0) {
  showSkillBtn = "none";
}

function addSkill(skill, totalSkill) {
  if (skillPointsLeft === 0){
  } else if (form.occupation[skill] === "0" && skillForm[skill] === Math.floor((Number(form.level) + 3) / 2)) {  
  } else if (form.occupation[skill] === "1" && skillForm[skill] === Math.floor(Number(form.level) + 3)){
  } else {
  skillForm[skill]++;
  skillTotalForm[skill]++;
  skillPointsLeft--;
  document.getElementById(skill).innerHTML = skillForm[skill];
  document.getElementById(totalSkill).innerHTML = skillTotalForm[skill];
  document.getElementById("skillPointLeft").innerHTML = skillPointsLeft;
  }
};
function removeSkill(skill, totalSkill) {
  if (skillForm[skill] === form[skill]){
  } else {
  skillForm[skill]--;
  skillTotalForm[skill]--;
  skillPointsLeft++;
  document.getElementById(skill).innerHTML = skillForm[skill];
  document.getElementById(totalSkill).innerHTML = skillTotalForm[skill];
  document.getElementById("skillPointLeft").innerHTML = skillPointsLeft;
  }
};
//--------------------------------------------Weapons-----------------------------------------------------------------------------------------------------------------------------------------------
const [weapon, setWeapon] = useState({ 
  weapon: [], 
});
const [addWeapon, setAddWeapon] = useState({ 
  weapon: "",
});
function updateWeapon(value) {
  return setAddWeapon((prev) => {
    return { ...prev, ...value };
  });
}
// Fetch Weapons
useEffect(() => {
  async function fetchWeapons() {
    const response = await fetch(`/weapons`);    

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
    setWeapon({weapon: record});
  }
  fetchWeapons();   
  return;
  
}, [navigate]);
//  Sends weapon data to database for update
 const splitWeaponArr = (array, size) => {
  let result = [];
  for (let i = 0; i < array.length; i += size) {
    let chunk = array.slice(i, i + size);
    result.push(chunk);
  }
  return result;
};
 let newWeapon;
 if (JSON.stringify(form.weapon) === JSON.stringify([["","","","",""]])) {
  let newWeaponArr = addWeapon.weapon.split(',');
  const weaponArrSize = 5;
  const weaponArrChunks = splitWeaponArr(newWeaponArr, weaponArrSize);
  newWeapon = weaponArrChunks;
 } else {
  let newWeaponArr = (form.weapon + "," + addWeapon.weapon).split(',');
  const weaponArrSize = 5;
  const weaponArrChunks = splitWeaponArr(newWeaponArr, weaponArrSize);
  newWeapon = weaponArrChunks;
 }
 async function addWeaponToDb(e){
  e.preventDefault();
  await fetch(`/update-weapon/${params.id}`, {
   method: "PUT",
   headers: {
     "Content-Type": "application/json",
   },
   body: JSON.stringify({
    weapon: newWeapon,
   }),
 })
 .catch(error => {
   window.alert(error);
   return;
 });
 navigate(0);
}
 // This method will delete a weapon
 function deleteWeapons(el) {
  const index = form.weapon.indexOf(el);
  form.weapon.splice(index, 1);
  updateWeapon(form.weapon);
  addDeleteWeaponToDb();
 }
 let showDeleteBtn = "";
 let showAtkBonusSave= "";
 if (JSON.stringify(form.weapon) === JSON.stringify([["","","","",""]])){
  showDeleteBtn = "none";
  showAtkBonusSave = "none";
 }
async function addDeleteWeaponToDb(){
  let newWeaponForm = form.weapon;
  if (JSON.stringify(form.weapon) === JSON.stringify([])){
    newWeaponForm = [["","","","",""]];
    await fetch(`/update-weapon/${params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
       weapon: newWeaponForm,
      }),
    })
    .catch(error => {
      window.alert(error);
      return;
    });
    console.log("Weapon Deleted")
    navigate(0);
  } else {
  await fetch(`/update-weapon/${params.id}`, {
   method: "PUT",
   headers: {
     "Content-Type": "application/json",
   },
   body: JSON.stringify({
    weapon: newWeaponForm,
   }),
 })
 .catch(error => {
   window.alert(error);
   return;
 });
 console.log("Weapon Deleted")
 navigate(0);
}
}
// -------------------------------------------Armor---------------------------------------------------------------------------------------------------------------------------------------------------
const [armor, setArmor] = useState({ 
  armor: [], 
});
const [addArmor, setAddArmor] = useState({ 
  armor: "",
});
function updateArmor(value) {
  return setAddArmor((prev) => {
    return { ...prev, ...value };
  });
}
// Fetch Armors
useEffect(() => {
  async function fetchArmor() {
    const response = await fetch(`/armor`);    

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
    setArmor({armor: record});
  }
  fetchArmor();   
  return;
  
}, [navigate]);
 // Sends armor data to database for update
 const splitArmorArr = (array, size) => {
  let result = [];
  for (let i = 0; i < array.length; i += size) {
    let chunk = array.slice(i, i + size);
    result.push(chunk);
  }
  return result;
};
 let newArmor;
 if (JSON.stringify(form.armor) === JSON.stringify([["","",""]])) {
  let newArmorArr = addArmor.armor.split(',');
  const armorArrSize = 3;
  const armorArrChunks = splitArmorArr(newArmorArr, armorArrSize);
  newArmor = armorArrChunks;
 } else {
  let newArmorArr = (form.armor + "," + addArmor.armor).split(',');
  const armorArrSize = 3;
  const armorArrChunks = splitArmorArr(newArmorArr, armorArrSize);
  newArmor = armorArrChunks;
 }
 async function addArmorToDb(e){
  e.preventDefault();
  await fetch(`/update-armor/${params.id}`, {
   method: "PUT",
   headers: {
     "Content-Type": "application/json",
   },
   body: JSON.stringify({
    armor: newArmor,
   }),
 })
 .catch(error => {
   window.alert(error);
   return;
 });
 navigate(0);
}
 // This method will delete a armor
 function deleteArmors(el) {
  const index = form.armor.indexOf(el);
  form.armor.splice(index, 1);
  updateArmor(form.armor);
  addDeleteArmorToDb();
 }
 let showDeleteArmorBtn = "";
 if (JSON.stringify(form.armor) === JSON.stringify([["","",""]])){
  showDeleteArmorBtn = "none";
 }
async function addDeleteArmorToDb(){
  let newArmorForm = form.armor;
  if (JSON.stringify(form.armor) === JSON.stringify([])){
    newArmorForm = [["","",""]];
    await fetch(`/update-armor/${params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
       armor: newArmorForm,
      }),
    })
    .catch(error => {
      window.alert(error);
      return;
    });
    console.log("Armor Deleted")
    navigate(0);
  } else {
  await fetch(`/update-armor/${params.id}`, {
   method: "PUT",
   headers: {
     "Content-Type": "application/json",
   },
   body: JSON.stringify({
    armor: newArmorForm,
   }),
 })
 .catch(error => {
   window.alert(error);
   return;
 });
 console.log("Armor Deleted")
 navigate(0);
}
}
//--------------------------------------------Display---------------------------------------------------------------------------------------------------------------------------------------------
 return (
<center className="pt-3" style={{ backgroundImage: 'url(../images/zombie.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "80vh"}}>
      <h1 style={{ fontSize: 28, backgroundPositionY: "450%", width: "300px", height: "95px", backgroundImage: 'url(../images/banner.png)', backgroundSize: "cover", backgroundRepeat: "no-repeat"}}className="text-dark">{form.characterName}</h1> 
      <Accordion className="mx-2">
      <Accordion.Item eventKey="0">
        <Accordion.Header>Character Info</Accordion.Header>
        <Accordion.Body> 
        <Card className="mx-2 mb-4" style={{ width: '10rem' }}>      
        <Card.Title>Character Info</Card.Title>
      <ListGroup className="list-group-flush" style={{ fontSize: '.75rem' }}>
        <ListGroup.Item>Level: {form.level}</ListGroup.Item>
        <ListGroup.Item>Occupation: {form.occupation.Occupation}</ListGroup.Item>        
        <ListGroup.Item>Age: {form.age}</ListGroup.Item>
        <ListGroup.Item>Sex: {form.sex}</ListGroup.Item>
        <ListGroup.Item>Height: {form.height}</ListGroup.Item>
        <ListGroup.Item>Weight: {form.weight}lbs</ListGroup.Item>
      </ListGroup>
    </Card> 
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="1">
        <Accordion.Header>Health/Defense</Accordion.Header>
        <Accordion.Body>
        <Card className="mx-2 mb-1" style={{ width: '19rem'}}>      
        <Card.Title>Health</Card.Title>
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th></th>
              <th>Health</th>
              <th>Temp</th>
              <th>Max</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><Button onClick={() => removeHealth('health')} className="bg-danger fa-solid fa-minus"></Button></td>
              <td>Health</td>
              <td><span id="health">{form.tempHealth} </span></td>
              <td><span>{form.health + Number(conMod * form.level)} </span></td>
              <td><Button onClick={() => addHealth()} className="fa-solid fa-plus"></Button></td>
            </tr>
          </tbody>
        </Table>
        </Card> 
        <Button onClick={() => tempHealthUpdate()} className="bg-warning fa-solid fa-floppy-disk"></Button>
        <Card className="mx-2 mb-4 mt-2" style={{ width: '12rem' }}>      
        <Card.Title>Saving Throws</Card.Title>
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th>Saves</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Attack Bonus</td>
              <td>{atkBonusSave}</td>
            </tr>
            <tr>
              <td>AC</td>
              <td>{Number(10) + Number(dexMod)}</td>
            </tr>
            <tr>
              <td>Fort</td>
              <td>{fortSave}</td>
            </tr>
            <tr>
              <td>Reflex</td>
              <td>{reflexSave}</td>
            </tr>
            <tr>
              <td>Will</td>
              <td>{willSave}</td>
            </tr>
          </tbody>
          </Table>
          </Card>
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="2">
        <Accordion.Header>Stats <span style={{ display: showBtn, color: "gold"}} className="mx-2 fa-solid fa-star"></span></Accordion.Header>
        <Accordion.Body>
        <Card className="mx-2 mb-4" style={{ width: '15rem' }}>      
        <Card.Title>Stats</Card.Title>
       <Card.Title style={{ display: showBtn}}>Points Left:<span className="mx-1" id="statPointLeft">{statPointsLeft}</span></Card.Title>
       <Table striped bordered hover size="sm">        
        <thead>
          <tr>
          <th></th>
          <th>Stat</th>
          <th>Level</th>
          <th>Mod</th>
          <th></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Button style={{ display: showBtn}} onClick={() => removeStat('str', 'strMod')} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>STR</td>
            <td><span id="str">{currStr} </span></td>
            <td><span id="strMod">{strMod} </span></td>
            <td><Button style={{ display: showBtn}} onClick={() => addStat('str', 'strMod')} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button style={{ display: showBtn}} onClick={() => removeStat('dex', 'dexMod')} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>DEX</td>
            <td><span id="dex">{currDex} </span></td>
            <td><span id="dexMod">{dexMod} </span></td>
            <td><Button style={{ display: showBtn}} onClick={() => addStat('dex', 'dexMod')} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button style={{ display: showBtn}} onClick={() => removeStat('con', 'conMod')} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>CON</td>
            <td><span id="con">{currCon} </span></td>
            <td><span id="conMod">{conMod} </span></td>
            <td><Button style={{ display: showBtn}} onClick={() => addStat('con', 'conMod')} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button style={{ display: showBtn}} onClick={() => removeStat('int', 'intMod')} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>INT</td>
            <td><span id="int">{currInt} </span></td>
            <td><span id="intMod">{intMod} </span></td>
            <td><Button style={{ display: showBtn}} onClick={() => addStat('int', 'intMod')} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button style={{ display: showBtn}} onClick={() => removeStat('wis', 'wisMod')} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>WIS</td>
            <td><span id="wis">{currWis} </span></td>
            <td><span id="wisMod">{wisMod} </span></td>
            <td><Button style={{ display: showBtn}} onClick={() => addStat('wis', 'wisMod')} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button style={{ display: showBtn}} onClick={() => removeStat('cha', 'chaMod')} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>CHA</td>
            <td><span id="cha">{currCha} </span></td>
            <td><span id="chaMod">{chaMod} </span></td>
            <td><Button style={{ display: showBtn}} onClick={() => addStat('cha', 'chaMod')} className="fa-solid fa-plus"></Button></td>
          </tr>
        </tbody>        
       </Table>
    </Card> 
    <Button style={{ display: showBtn}} onClick={() => statsUpdate()} className="bg-warning fa-solid fa-floppy-disk"></Button>
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="3">
      <Accordion.Header>Skills <span style={{ display: showSkillBtn, color: "gold"}} className="mx-2 fa-solid fa-star"></span></Accordion.Header>
        <Accordion.Body>
        <Card className="mx-2 mb-4" style={{ width: '19rem' }}>
        <Card.Title>Skills</Card.Title>
        <Card.Title style={{ display: showSkillBtn}}>Points Left:<span className="mx-1" id="skillPointLeft">{skillPointsLeft}</span></Card.Title>
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th></th>
            <th>Skill</th>
            <th>Total</th>
            <th>Rank</th>
            <th>Mod</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr>            
            <td><Button style={{ display: showSkillBtn}} onClick={() => removeSkill('climb', "totalClimb")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Climb</td>
            <td><span id="totalClimb">{totalClimb} </span></td>
            <td><span id="climb">{currClimb} </span></td>
            <td><span id="strMod">{strMod} </span></td>
            <td><Button style={{ display: showSkillBtn}} onClick={() => addSkill('climb', "totalClimb")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>            
            <td><Button style={{ display: showSkillBtn}} onClick={() => removeSkill('gatherInfo', "totalGatherInfo")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Gather Info</td>
            <td><span id="totalGatherInfo">{totalGatherInfo} </span></td>
            <td><span id="gatherInfo">{currGatherInfo} </span></td>
            <td><span id="chaMod">{chaMod} </span></td>
            <td><Button style={{ display: showSkillBtn}} onClick={() => addSkill('gatherInfo', "totalGatherInfo")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>            
            <td><Button style={{ display: showSkillBtn}} onClick={() => removeSkill('heal', "totalHeal")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Heal</td>
            <td><span id="totalHeal">{totalHeal} </span></td>
            <td><span id="heal">{currHeal} </span></td>
            <td><span id="wisMod">{wisMod} </span></td>
            <td><Button style={{ display: showSkillBtn}} onClick={() => addSkill('heal', "totalHeal")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>            
            <td><Button style={{ display: showSkillBtn}} onClick={() => removeSkill('jump', "totalJump")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Jump</td>
            <td><span id="totalJump">{totalJump} </span></td>
            <td><span id="jump">{currJump} </span></td>
            <td><span id="strMod">{strMod} </span></td>
            <td><Button style={{ display: showSkillBtn}} onClick={() => addSkill('jump', "totalJump")} className="fa-solid fa-plus"></Button></td>
          </tr>
        </tbody>
      </Table>
    </Card> 
    <Button style={{ display: showSkillBtn}} onClick={() => skillsUpdate()} className="bg-warning fa-solid fa-floppy-disk"></Button>
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="4">
      {/* -----------------------------------------Weapons section---------------------------------------------------------------------------------------------------------------------------------- */}
        <Accordion.Header>Weapons</Accordion.Header>
        <Accordion.Body>
        <Card className="mx-2 mb-4" style={{ width: '20rem' }}>      
        <Card.Title>Weapons</Card.Title>
        <Table style={{ fontSize: '.75rem' }} striped bordered hover size="sm">
          <thead>
            <tr>
              <th>Weapon Name</th>
              <th>Attack Bonus</th>
              <th>Damage</th>
              <th>Critical</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {form.weapon.map((el) => (  
            <tr>
              <td>{el[0]}</td>             
              <td style={{display: showAtkBonusSave}}>
               {(() => {
              if (el[4] === "0") {
                return(Number(atkBonusSave) + Number(strMod) + Number(el[1]));
              } else if (el[4] === "1") {
                return(Number(atkBonusSave) + Number((strMod * 1.5)) + Number(el[1]));
              } else if (el[4] === "2") {
                return(Number(atkBonusSave) + Number(dexMod) + Number(el[1]));
              }
              })()}</td>
              <td>{el[2]}</td>
              <td>{el[3]}</td>
              <td><Button style={{ display: showDeleteBtn}} className="fa-solid fa-trash" variant="danger" onClick={() => {deleteWeapons(el);}}></Button></td>
            </tr>
             ))}
          </tbody>
        </Table>        
    </Card> 
    <Row>
        <Col>
          <Form onSubmit={addWeaponToDb}>
          <Form.Group className="mb-3 mx-5">
        <Form.Label className="text-dark">Select Weapon</Form.Label>
        <Form.Select 
        onChange={(e) => updateWeapon({ weapon: e.target.value })}
         type="text">
          <option></option>
          {weapon.weapon.map((el) => (  
          <option value={[el.weaponName, el.attackBonus, el.damage, el.critical, el.weaponStyle]}>{el.weaponName}</option>
          ))}
        </Form.Select>
      </Form.Group>
        <Button className="rounded-pill" variant="outline-dark" type="submit">Add</Button>
          </Form>
        </Col>
      </Row>
            {/* ------------------------------------------------Armor---------------------------------------------------------------------------------------------------------------- */}
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="5">
        <Accordion.Header>Armor</Accordion.Header>
        <Accordion.Body>
        <Card className="mx-2 mb-4" style={{ width: '20rem' }}>      
        <Card.Title>Armor</Card.Title>
        <Table style={{ fontSize: '.75rem' }} striped bordered hover size="sm">
          <thead>
            <tr>
              <th>Armor Name</th>
              <th>Ac Bns</th>
              <th>Max Dex Bns</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
          {form.armor.map((el) => (  
            <tr>           
              <td>{el[0]}</td>
              <td>{el[1]}</td>
              <td>{el[2]}</td>
              <td><Button style={{ display: showDeleteArmorBtn}} className="fa-solid fa-trash" variant="danger" onClick={() => {deleteArmors(el);}}></Button></td>
            </tr>
            ))}     
          </tbody>
        </Table>        
    </Card> 
    <Row>
        <Col>
          <Form onSubmit={addArmorToDb}>
          <Form.Group className="mb-3 mx-5">
        <Form.Label className="text-dark">Select Armor</Form.Label>
        <Form.Select 
        onChange={(e) => updateArmor({ armor: e.target.value })}
         type="text">
          <option></option>
          {armor.armor.map((el) => (  
          <option value={[el.armorName, el.armorBonus, el.maxDex]}>{el.armorName}</option>
          ))}
        </Form.Select>
      </Form.Group>
        <Button className="rounded-pill" variant="outline-dark" type="submit">Add</Button>
          </Form>
        </Col>
      </Row>
      {/* -----------------------------------------Items------------------------------------------------------------------------------------------------------------------------------- */}
      </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="6">
        <Accordion.Header>Items</Accordion.Header>
        <Accordion.Body>
        <Card className="mx-2 mb-4" style={{ width: '20rem' }}>      
        <Card.Title>Items</Card.Title>
        <Table style={{ fontSize: '.75rem' }} striped bordered hover size="sm">
          <thead>
            <tr>
              <th>Name</th>
              <th>Notes</th>
              <th>Stats</th>
              <th>Skills</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
          {/* {form.item.map((el) => (   */}
            <tr>           
              <td>Crystal Buttplug</td>
              <td>this mythical item grants the user control over their sphincter and gives off a powerful aura</td>
              <td>int+2, wis+4</td>
              <td>Gatherinfo+4</td>
              <td>
              <Button style={{ display: ''}} className="fa-solid fa-trash" variant="danger"></Button>
              </td>
            </tr>
            {/* ))}      */}
          </tbody>
        </Table>        
    </Card> 
    <Row>
        <Col>
          <Form
          //  onSubmit={addItemToDb}
           >
          <Form.Group className="mb-3 mx-5">
        <Form.Label className="text-dark">Select Item</Form.Label>
        <Form.Select 
        // onChange={(e) => updateItem({ item: e.target.value })}
         type="text">
          <option></option>
          {/* {item.item.map((el) => (  
          <option value={[el.itemName, el.itemNotes, el.itemStats, el.itemSkills]}>{el.itemName}</option>
          ))} */}
        </Form.Select>
      </Form.Group>
        <Button className="rounded-pill" variant="outline-dark" type="submit">Add</Button>
          </Form>
        </Col>
      </Row>
      {/* -----------------------------------------Notes------------------------------------------------------------------------------------------------------------------- */}
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="7">
        <Accordion.Header>Notes</Accordion.Header>
        <Accordion.Body>
        <center>
  <div className="">
    <h5 className="text-dark">Notes</h5>
    <table className="table text-dark" style={{ marginTop: 20 }}>
      <thead>
        <tr>        
        </tr>
      </thead>
      <tbody></tbody>
    </table>
    <Button><i className="fa-solid fa-plus"></i></Button>
  </div>
  </center>
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
    <br></br>
    </center>
 );
}