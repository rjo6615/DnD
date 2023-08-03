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
  let statPointsLeft = (form.level / 4) - (statTotal - form.startStatTotal);

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

 return (
<center style={{ backgroundImage: 'url(../images/zombie.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "80vh"}}>
      <h1 className="text-light">{form.characterName}</h1> 
      <Accordion className="mx-2 mt-4">
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
        <Card className="mx-2 mb-4" style={{ width: '10rem' }}>      
        <Card.Title>Health/Defense</Card.Title>
      <ListGroup className="list-group-flush" style={{ fontSize: '.75rem' }}>
        <ListGroup.Item>HP: {form.health + Number(conMod * form.level)}</ListGroup.Item>
        <ListGroup.Item>AC: {Number(10) + Number(dexMod)}</ListGroup.Item>
        <ListGroup.Item>Fort: {fortSave}</ListGroup.Item>
        <ListGroup.Item>Reflex: {reflexSave}</ListGroup.Item>
        <ListGroup.Item>Will: {willSave}</ListGroup.Item>
      </ListGroup>
    </Card> 
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="2">
        <Accordion.Header>Stats</Accordion.Header>
        <Accordion.Body>
        <Card className="mx-2 mb-4" style={{ width: '15rem' }}>      
        <Card.Title>Stats</Card.Title>
       <Card.Title>Points Left:<span id="statPointLeft">{statPointsLeft}</span></Card.Title>
      <ListGroup className="list-group-flush" style={{ fontSize: '.75rem' }}>
        <ListGroup.Item><Button onClick={() => removeStat('str', 'strMod')} className="bg-danger fa-solid fa-minus"></Button> STR: <span id="str">{currStr} </span> | <span id="strMod">{strMod} </span><Button onClick={() => addStat('str', 'strMod')} className="fa-solid fa-plus"></Button></ListGroup.Item>
        <ListGroup.Item><Button onClick={() => removeStat('dex', 'dexMod')} className="bg-danger fa-solid fa-minus"></Button> DEX: <span id="dex">{currDex} </span> | <span id="dexMod">{dexMod} </span><Button onClick={() => addStat('dex', 'dexMod')} className="fa-solid fa-plus"></Button></ListGroup.Item>
        <ListGroup.Item><Button onClick={() => removeStat('con', 'conMod')} className="bg-danger fa-solid fa-minus"></Button> CON: <span id="con">{currCon} </span> | <span id="conMod">{conMod} </span><Button onClick={() => addStat('con', 'conMod')} className="fa-solid fa-plus"></Button></ListGroup.Item>
        <ListGroup.Item><Button onClick={() => removeStat('int', 'intMod')} className="bg-danger fa-solid fa-minus"></Button> INT: <span id="int">{currInt} </span> | <span id="intMod">{intMod} </span><Button onClick={() => addStat('int', 'intMod')} className="fa-solid fa-plus"></Button></ListGroup.Item>
        <ListGroup.Item><Button onClick={() => removeStat('wis', 'wisMod')} className="bg-danger fa-solid fa-minus"></Button> WIS: <span id="wis">{currWis} </span> | <span id="wisMod">{wisMod} </span><Button onClick={() => addStat('wis', 'wisMod')} className="fa-solid fa-plus"></Button></ListGroup.Item>
        <ListGroup.Item><Button onClick={() => removeStat('cha', 'chaMod')} className="bg-danger fa-solid fa-minus"></Button> CHA: <span id="cha">{currCha} </span> | <span id="chaMod">{chaMod} </span><Button onClick={() => addStat('cha', 'chaMod')} className="fa-solid fa-plus"></Button></ListGroup.Item>
      </ListGroup>
    </Card> 
    <Button onClick={() => statsUpdate()} className="bg-warning fa-solid fa-floppy-disk"></Button>
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="3">
        <Accordion.Header>Skills</Accordion.Header>
        <Accordion.Body>
        <Card className="mx-2 mb-4" style={{ width: '10rem' }}>
        <Card.Title>Skills</Card.Title>
      <ListGroup className="list-group-flush" style={{ fontSize: '.75rem' }}>
        <ListGroup.Item>Appraise: 4</ListGroup.Item>
        <ListGroup.Item>Balance: 4</ListGroup.Item>
        <ListGroup.Item>Bluff: 4</ListGroup.Item>
        <ListGroup.Item>Climb: 4</ListGroup.Item>
        <ListGroup.Item>Concentration: 4</ListGroup.Item>
        <ListGroup.Item>Decipher Script: 4</ListGroup.Item>
        <ListGroup.Item>Diplomacy: 4</ListGroup.Item>
        <ListGroup.Item>Disable Device: 4</ListGroup.Item>
        <ListGroup.Item>Disguise: 4</ListGroup.Item>
        <ListGroup.Item>Escape Artist: 4</ListGroup.Item>
        <ListGroup.Item>Forgery: 4</ListGroup.Item>
        <ListGroup.Item>Gather Info: 4</ListGroup.Item>
        <ListGroup.Item>Handle Animal: 4</ListGroup.Item>
        <ListGroup.Item>Heal: 4</ListGroup.Item>
        <ListGroup.Item>Intimidate: 4</ListGroup.Item>
        <ListGroup.Item>Jump: 4</ListGroup.Item>
        <ListGroup.Item>Listen: 4</ListGroup.Item>
        <ListGroup.Item>Move Silently: 4</ListGroup.Item>
        <ListGroup.Item>Open Lock: 4</ListGroup.Item>
        <ListGroup.Item>Ride: 4</ListGroup.Item>
        <ListGroup.Item>Search: 4</ListGroup.Item>
        <ListGroup.Item>Sense Motive: 4</ListGroup.Item>
        <ListGroup.Item>Sleight of Hand: 4</ListGroup.Item>
        <ListGroup.Item>Spellcraft: 4</ListGroup.Item>
        <ListGroup.Item>Spot: 4</ListGroup.Item>
        <ListGroup.Item>Survival: 4</ListGroup.Item>
        <ListGroup.Item>Swim: 4</ListGroup.Item>
        <ListGroup.Item>Tumble: 4</ListGroup.Item>
        <ListGroup.Item>Use Rope: 4</ListGroup.Item>
        <ListGroup.Item>Use Technology: 4</ListGroup.Item>
      </ListGroup>
    </Card> 
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