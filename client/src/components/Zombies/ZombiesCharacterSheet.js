import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Accordion from 'react-bootstrap/Accordion';
import Button from 'react-bootstrap/Button';
import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useNavigate } from "react-router";

export default function ZombiesCharacterSheet() {
  const navigate = useNavigate();
  const params = useParams();
  const [form, setForm] = useState({ 
    characterName: "",
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
//------------------------------Stats-------------------------------------------------------------
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
//-----------------------Health/Defense------------------------------------------------------------
  // Saves Maffs
  let fortSave;
  let reflexSave;
  let willSave;
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
//-----------------------Skills-----------------------------------------------------------------------
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
//--------------------------------------------Display---------------------------------------------------
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
        <Card className="mx-2 mb-4" style={{ width: '15rem' }}>      
        <Card.Title>Health/Defense</Card.Title>
      <ListGroup className="list-group-flush" style={{ fontSize: '.75rem' }}>
        <ListGroup.Item><Button onClick={() => removeHealth('health')} className="bg-danger fa-solid fa-minus"></Button> Health: <span id="health">{form.tempHealth} </span> | <span>{form.health + Number(conMod * form.level)} </span><Button onClick={() => addHealth()} className="fa-solid fa-plus"></Button></ListGroup.Item>
        <ListGroup.Item>AC: {Number(10) + Number(dexMod)}</ListGroup.Item>
        <ListGroup.Item>Fort: {fortSave}</ListGroup.Item>
        <ListGroup.Item>Reflex: {reflexSave}</ListGroup.Item>
        <ListGroup.Item>Will: {willSave}</ListGroup.Item>
      </ListGroup>
    </Card> 
    <Button onClick={() => tempHealthUpdate()} className="bg-warning fa-solid fa-floppy-disk"></Button>
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="2">
        <Accordion.Header>Stats <span style={{ display: showBtn, color: "gold"}} className="mx-2 fa-solid fa-star"></span></Accordion.Header>
        <Accordion.Body>
        <Card className="mx-2 mb-4" style={{ width: '15rem' }}>      
        <Card.Title>Stats</Card.Title>
       <Card.Title style={{ display: showBtn}}>Points Left:<span className="mx-1" id="statPointLeft">{statPointsLeft}</span></Card.Title>
      <ListGroup className="list-group-flush" style={{ fontSize: '.75rem' }}>
        <ListGroup.Item><Button style={{ display: showBtn}} onClick={() => removeStat('str', 'strMod')} className="bg-danger fa-solid fa-minus"></Button> STR: <span id="str">{currStr} </span> | <span id="strMod">{strMod} </span><Button style={{ display: showBtn}} onClick={() => addStat('str', 'strMod')} className="fa-solid fa-plus"></Button></ListGroup.Item>
        <ListGroup.Item><Button style={{ display: showBtn}} onClick={() => removeStat('dex', 'dexMod')} className="bg-danger fa-solid fa-minus"></Button> DEX: <span id="dex">{currDex} </span> | <span id="dexMod">{dexMod} </span><Button style={{ display: showBtn}} onClick={() => addStat('dex', 'dexMod')} className="fa-solid fa-plus"></Button></ListGroup.Item>
        <ListGroup.Item><Button style={{ display: showBtn}} onClick={() => removeStat('con', 'conMod')} className="bg-danger fa-solid fa-minus"></Button> CON: <span id="con">{currCon} </span> | <span id="conMod">{conMod} </span><Button style={{ display: showBtn}} onClick={() => addStat('con', 'conMod')} className="fa-solid fa-plus"></Button></ListGroup.Item>
        <ListGroup.Item><Button style={{ display: showBtn}} onClick={() => removeStat('int', 'intMod')} className="bg-danger fa-solid fa-minus"></Button> INT: <span id="int">{currInt} </span> | <span id="intMod">{intMod} </span><Button style={{ display: showBtn}} onClick={() => addStat('int', 'intMod')} className="fa-solid fa-plus"></Button></ListGroup.Item>
        <ListGroup.Item><Button style={{ display: showBtn}} onClick={() => removeStat('wis', 'wisMod')} className="bg-danger fa-solid fa-minus"></Button> WIS: <span id="wis">{currWis} </span> | <span id="wisMod">{wisMod} </span><Button style={{ display: showBtn}} onClick={() => addStat('wis', 'wisMod')} className="fa-solid fa-plus"></Button></ListGroup.Item>
        <ListGroup.Item><Button style={{ display: showBtn}} onClick={() => removeStat('cha', 'chaMod')} className="bg-danger fa-solid fa-minus"></Button> CHA: <span id="cha">{currCha} </span> | <span id="chaMod">{chaMod} </span><Button style={{ display: showBtn}} onClick={() => addStat('cha', 'chaMod')} className="fa-solid fa-plus"></Button></ListGroup.Item>
      </ListGroup>
    </Card> 
    <Button style={{ display: showBtn}} onClick={() => statsUpdate()} className="bg-warning fa-solid fa-floppy-disk"></Button>
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="3">
      <Accordion.Header>Skills <span style={{ display: showSkillBtn, color: "gold"}} className="mx-2 fa-solid fa-star"></span></Accordion.Header>
        <Accordion.Body>
        <Card className="mx-2 mb-4" style={{ width: '15rem' }}>
        <Card.Title>Skills</Card.Title>
        <Card.Title style={{ display: showSkillBtn}}>Points Left:<span className="mx-1" id="skillPointLeft">{skillPointsLeft}</span></Card.Title>
      <ListGroup className="list-group-flush" style={{ fontSize: '.75rem' }}>
        <ListGroup.Item><Button style={{ display: showSkillBtn}} onClick={() => removeSkill('climb', "totalClimb")} className="bg-danger fa-solid fa-minus"></Button> Climb: <span id="totalClimb">{totalClimb} </span> | <span id="climb">{currClimb} </span> | <span id="strMod">{strMod} </span><Button style={{ display: showSkillBtn}} onClick={() => addSkill('climb', "totalClimb")} className="fa-solid fa-plus"></Button></ListGroup.Item>
        <ListGroup.Item><Button style={{ display: showSkillBtn}} onClick={() => removeSkill('gatherInfo', "totalGatherInfo")} className="bg-danger fa-solid fa-minus"></Button> Gather Info: <span id="totalGatherInfo">{totalGatherInfo} </span> | <span id="gatherInfo">{currGatherInfo} </span> | <span id="dexMod">{chaMod} </span><Button style={{ display: showSkillBtn}} onClick={() => addSkill('gatherInfo', "totalGatherInfo")} className="fa-solid fa-plus"></Button></ListGroup.Item>
        <ListGroup.Item><Button style={{ display: showSkillBtn}} onClick={() => removeSkill('heal', "totalHeal")} className="bg-danger fa-solid fa-minus"></Button> Heal: <span id="totalHeal">{totalHeal} </span> | <span id="heal">{currHeal} </span> | <span id="conMod">{wisMod} </span><Button style={{ display: showSkillBtn}} onClick={() => addSkill('heal', "totalHeal")} className="fa-solid fa-plus"></Button></ListGroup.Item>
        <ListGroup.Item><Button style={{ display: showSkillBtn}} onClick={() => removeSkill('jump', "totalJump")} className="bg-danger fa-solid fa-minus"></Button> Jump: <span id="totalJump">{totalJump} </span> | <span id="jump">{currJump} </span> | <span id="intMod">{strMod} </span><Button style={{ display: showSkillBtn}} onClick={() => addSkill('jump', "totalJump")} className="fa-solid fa-plus"></Button></ListGroup.Item>   
      </ListGroup>
    </Card> 
    <Button style={{ display: showSkillBtn}} onClick={() => skillsUpdate()} className="bg-warning fa-solid fa-floppy-disk"></Button>
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="4">
        <Accordion.Header>Weapons</Accordion.Header>
        <Accordion.Body>
        <Card className="mx-2 mb-4" style={{ width: '20rem' }}>      
        <Card.Title>Weapons</Card.Title>
      <ListGroup className="list-group-flush" style={{ fontSize: '.75rem' }}>
        <ListGroup.Item><ListGroup.Item>Iron Sword</ListGroup.Item>Attack Bonus: +8 | Damage: 1d8+4 | Critical: 19/20</ListGroup.Item>
        <ListGroup.Item><ListGroup.Item>Rusty Dagger</ListGroup.Item>Attack Bonus: +6 | Damage: 1d10 | Critical: 20</ListGroup.Item>
      </ListGroup>
    </Card> 
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="5">
        <Accordion.Header>Armor</Accordion.Header>
        <Accordion.Body>
        <Card className="mx-2 mb-4" style={{ width: '20rem' }}>      
        <Card.Title>Armor</Card.Title>
      <ListGroup className="list-group-flush" style={{ fontSize: '.75rem' }}>
        <ListGroup.Item><ListGroup.Item>Platemail</ListGroup.Item>Armor Bonus: +8 | Max Dex 1 | Check penalty -6</ListGroup.Item>
        <ListGroup.Item><ListGroup.Item>Shield Heavy (steel)</ListGroup.Item>Armor Bonus: +2 | Max Dex - | Check penalty -2</ListGroup.Item>
      </ListGroup>
    </Card> 
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="6">
        <Accordion.Header>Notes</Accordion.Header>
        <Accordion.Body>
        <center>
  <div className="">
    <h5 className="text-dark">Weapon Finess</h5>
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