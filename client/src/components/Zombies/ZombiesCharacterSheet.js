import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Accordion from 'react-bootstrap/Accordion';
import Table from 'react-bootstrap/Table';
import Modal from 'react-bootstrap/Modal';
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
    weapon: [["","","","","",""]],
    armor: [["","","",""]],
    item: [["","","","","","","","","","","",""]],
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
    newSkill: [["","",0]],
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

//Item Stats
let itemStr= [];
form.item.map((el) => (  
  itemStr.push(el[2]) 
))
 let totalItemStr = itemStr.reduce((partialSum, a) => Number(partialSum) + Number(a), 0); 

let itemDex= [];
form.item.map((el) => (  
  itemDex.push(el[3]) 
))
 let totalItemDex = itemDex.reduce((partialSum, a) => Number(partialSum) + Number(a), 0); 

let itemCon= [];
form.item.map((el) => (  
  itemCon.push(el[4]) 
))
 let totalItemCon = itemCon.reduce((partialSum, a) => Number(partialSum) + Number(a), 0); 

let itemInt= [];
form.item.map((el) => (  
  itemInt.push(el[5]) 
))
let totalItemInt = itemInt.reduce((partialSum, a) => Number(partialSum) + Number(a), 0); 

let itemWis= [];
 form.item.map((el) => (  
   itemWis.push(el[6]) 
 ))
 let totalItemWis = itemWis.reduce((partialSum, a) => Number(partialSum) + Number(a), 0); 

 let itemCha= [];
 form.item.map((el) => (  
   itemCha.push(el[7]) 
 ))
 let totalItemCha = itemCha.reduce((partialSum, a) => Number(partialSum) + Number(a), 0); 

let formStr = form.str; 
let formDex = form.dex;
let formCon = form.con;
let formInt = form.int;
let formWis = form.wis;
let formCha = form.cha;

const statForm = {
  str: formStr,
  dex: formDex,
  con: formCon,
  int: formInt,
  wis: formWis,
  cha: formCha,
}

let currStr = statForm.str + totalItemStr; 
let currDex = statForm.dex + totalItemDex;
let currCon = statForm.con + totalItemCon;
let currInt = statForm.int + totalItemInt;
let currWis = statForm.wis + totalItemWis;
let currCha = statForm.cha + totalItemCha;

const statItemForm = {
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
 let strMod = Math.floor((statItemForm.str - 10) / 2); 
 let dexMod = Math.floor((statItemForm.dex - 10) / 2); 
 let conMod = Math.floor((statItemForm.con - 10) / 2); 
 let intMod = Math.floor((statItemForm.int - 10) / 2);
 let wisMod = Math.floor((statItemForm.wis - 10) / 2);  
 let chaMod = Math.floor((statItemForm.cha - 10) / 2);

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
    statItemForm[stat]++;
    statPointsLeft--;
    document.getElementById(stat).innerHTML = statItemForm[stat];
    document.getElementById("statPointLeft").innerHTML = statPointsLeft;
    document.getElementById(statMod).innerHTML = Math.floor((statItemForm[stat] - 10) / 2);
    }
  };
  function removeStat(stat, statMod) {
    if (statForm[stat] === form[stat]){
    } else {
    statForm[stat]--;
    statItemForm[stat]--;
    statPointsLeft++;
    document.getElementById(stat).innerHTML = statItemForm[stat];
    document.getElementById("statPointLeft").innerHTML = statPointsLeft;
    document.getElementById(statMod).innerHTML = Math.floor((statItemForm[stat] - 10) / 2);
    }
  };
//-----------------------Health/Defense-------------------------------------------------------------------------------------------------------------------------------------------------
  // Saves Maffs
  let fortSave;
  let reflexSave;
  let willSave;
  let atkBonus;
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
    atkBonus = Math.floor(form.level / 2);
  } else if (form.occupation.atkBonus === "1") {
    atkBonus = Math.floor((form.level * .75));
  } else if (form.occupation.atkBonus === "2") {
    atkBonus = form.level;
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
const [showAddSkill, setShowAddSkill] = useState(false);
const handleCloseAddSkill = () => setShowAddSkill(false);
const handleShowAddSkill = () => setShowAddSkill(true);

const [addSkillForm, setAddSkillForm] = useState({ 
  newSkill: "",
});
function updateAddSkill(value) {
  return setAddSkillForm((prev) => {
    return { ...prev, ...value };
  });
}
const [newSkill, setNewSkill] = useState({ 
  skill: "",
});
function updateNewSkill(value) {
  return setNewSkill((prev) => {
    return { ...prev, ...value };
  });
}
const splitSkillArr = (array, size) => {
  let result = [];
  for (let i = 0; i < array.length; i += size) {
    let chunk = array.slice(i, i + size);
    result.push(chunk);
  }
  return result;
};
let addNewSkill;
 if (JSON.stringify(form.newSkill) === JSON.stringify([["",0]])) {
  let addNewSkillArr = addSkillForm.newSkill.split(',');
  const skillArrSize = 2;
  const skillArrChunks = splitSkillArr(addNewSkillArr, skillArrSize);
  addNewSkill = skillArrChunks;
 } else {
  let addNewSkillArr = (form.newSkill + "," + addSkillForm.newSkill).split(',');
  const skillArrSize = 2;
  const skillArrChunks = splitSkillArr(addNewSkillArr, skillArrSize);
  addNewSkill = skillArrChunks;
 }

 let showSkills = "";
 if (JSON.stringify(form.newSkill) === JSON.stringify([["",0]])){
  showSkills = "none";
 }
async function addSkillToDb(e){
  e.preventDefault();
  await fetch(`/update-add-skill/${params.id}`, {
   method: "PUT",
   headers: {
     "Content-Type": "application/json",
   },
   body: JSON.stringify({
    newSkill: addNewSkill,
   }),
 })
 .catch(error => {
   window.alert(error);
   return;
 });
 navigate(0);
}

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
    //  window.alert(error);
     return;
   });
   navigate(0);
 }
 //Armor Check Penalty
let checkPenalty= [];
 form.armor.map((el) => (  
  checkPenalty.push(el[3]) 
))
let totalCheckPenalty = checkPenalty.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

//Item Skills
let itemClimb= [];
form.item.map((el) => (  
  itemClimb.push(el[8]) 
))
 let totalItemClimb = itemClimb.reduce((partialSum, a) => Number(partialSum) + Number(a), 0); 

let itemGatherInfo= [];
form.item.map((el) => (  
  itemGatherInfo.push(el[9]) 
))
 let totalItemGatherInfo = itemGatherInfo.reduce((partialSum, a) => Number(partialSum) + Number(a), 0); 

let itemHeal= [];
form.item.map((el) => (  
  itemHeal.push(el[10]) 
))
 let totalItemHeal = itemHeal.reduce((partialSum, a) => Number(partialSum) + Number(a), 0); 

let itemJump= [];
form.item.map((el) => (  
  itemJump.push(el[11]) 
))
let totalItemJump = itemJump.reduce((partialSum, a) => Number(partialSum) + Number(a), 0); 

let totalClimb = form.climb + strMod + totalCheckPenalty + totalItemClimb;
let totalGatherInfo = form.gatherInfo + chaMod + totalItemGatherInfo;
let totalHeal = form.heal + wisMod + totalItemHeal;
let totalJump = form.jump + strMod + totalCheckPenalty + totalItemJump;

const skillTotalForm = {
  climb: totalClimb,
  gatherInfo: totalGatherInfo,
  heal: totalHeal,
  jump: totalJump,
}

let addedSkillsRanks= [];
form.newSkill.map((el) => (  
  addedSkillsRanks.push(el[1]) 
))
let totalAddedSkills = addedSkillsRanks.reduce((partialSum, a) => Number(partialSum) + Number(a), 0); 

let skillTotal = form.climb + form.gatherInfo + form.heal + form.jump;
let skillPointsLeft = Math.floor((Number(form.occupation.skillMod) + intMod) * 4 + (Number(form.occupation.skillMod) + intMod) * (form.level - 1) - skillTotal - totalAddedSkills);
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
// New Added Skills Button Control
const newSkillForm = {};

form.newSkill.forEach((el) => {
  newSkillForm[el[0]] = el[1];
});

async function addUpdatedSkillToDb(){
  const addUpdatedSkill = Object.entries({...newSkillForm});
  await fetch(`/updated-add-skills/${params.id}`, {
   method: "PUT",
   headers: {
     "Content-Type": "application/json",
   },
   body: JSON.stringify({
    newSkill: addUpdatedSkill,
   }),
 })
 .catch(error => {
   window.alert(error);
   return;
 });
 navigate(0);
}
function addSkillNew(skill) {  
  if (skillPointsLeft === 0){
  } else if (newSkillForm[skill] === Math.floor(Number(form.level) + 3)){
  } else {
  newSkillForm[skill]++;
  skillPointsLeft--;
  document.getElementById(skill).innerHTML = newSkillForm[skill];
  document.getElementById(skill + "total").innerHTML = newSkillForm[skill] + intMod;
  document.getElementById("skillPointLeft").innerHTML = skillPointsLeft;
  }
};
function removeSkillNew(skill, rank) {
  if (Number(newSkillForm[skill]) === Number(rank)){
  } else {
  newSkillForm[skill]--;
  skillPointsLeft++;
  document.getElementById(skill).innerHTML = newSkillForm[skill];
  document.getElementById(skill + "total").innerHTML = newSkillForm[skill] + intMod;
  document.getElementById("skillPointLeft").innerHTML = skillPointsLeft;
  }
};
//--------------------------------------------Weapons Section-----------------------------------------------------------------------------------------------------------------------------------------------
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
 if (JSON.stringify(form.weapon) === JSON.stringify([["","","","","",""]])) {
  let newWeaponArr = addWeapon.weapon.split(',');
  const weaponArrSize = 6;
  const weaponArrChunks = splitWeaponArr(newWeaponArr, weaponArrSize);
  newWeapon = weaponArrChunks;
 } else {
  let newWeaponArr = (form.weapon + "," + addWeapon.weapon).split(',');
  const weaponArrSize = 6;
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
 if (JSON.stringify(form.weapon) === JSON.stringify([["","","","","",""]])){
  showDeleteBtn = "none";
  showAtkBonusSave = "none";
 }
async function addDeleteWeaponToDb(){
  let newWeaponForm = form.weapon;
  if (JSON.stringify(form.weapon) === JSON.stringify([])){
    newWeaponForm = [["","","","","",""]];
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
 //Armor AC/MaxDex
 let armorAcBonus= [];
 let armorMaxDexBonus= [];
 form.armor.map((el) => (  
   armorAcBonus.push(el[1]) 
 ))
 let totalArmorAcBonus = armorAcBonus.reduce((partialSum, a) => Number(partialSum) + Number(a), 0); 
 form.armor.map((el) => (
  armorMaxDexBonus.push(el[2]) 
 ))
 let filteredMaxDexArray = armorMaxDexBonus.filter(e => e !== '0')
 let armorMaxDexMin = Math.min(...filteredMaxDexArray);

 let armorMaxDex;
 if (Number(armorMaxDexMin) < Number(dexMod) && Number(armorMaxDexMin > 0)) {
    armorMaxDex = armorMaxDexMin;
 } else {
  armorMaxDex = dexMod;
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
 if (JSON.stringify(form.armor) === JSON.stringify([["","","",""]])) {
  let newArmorArr = addArmor.armor.split(',');
  const armorArrSize = 4;
  const armorArrChunks = splitArmorArr(newArmorArr, armorArrSize);
  newArmor = armorArrChunks;
 } else {
  let newArmorArr = (form.armor + "," + addArmor.armor).split(',');
  const armorArrSize = 4;
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
 if (JSON.stringify(form.armor) === JSON.stringify([["","","",""]])){
  showDeleteArmorBtn = "none";
 }
async function addDeleteArmorToDb(){
  let newArmorForm = form.armor;
  if (JSON.stringify(form.armor) === JSON.stringify([])){
    newArmorForm = [["","","",""]];
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

//--------------------------------------------Items-----------------------------------------------------------------------------------------------------------------------------------------------
const [item, setItem] = useState({ 
  item: [], 
});
const [addItem, setAddItem] = useState({ 
  item: "",
});
const [modalItemData, setModalItemData] = useState({
  item: "",
})
const [showNotes, setShowNotes] = useState(false);
const handleCloseNotes = () => setShowNotes(false);
const handleShowNotes = () => setShowNotes(true);

function updateItem(value) {
  return setAddItem((prev) => {
    return { ...prev, ...value };
  });
}

// Fetch Items
useEffect(() => {
  async function fetchItems() {
    const response = await fetch(`/items`);    

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
    setItem({item: record});
  }
  fetchItems();   
  return;
  
}, [navigate]);
 // Sends item data to database for update
 const splitItemArr = (array, size) => {
  let result = [];
  for (let i = 0; i < array.length; i += size) {
    let chunk = array.slice(i, i + size);
    result.push(chunk);
  }
  return result;
};
 let newItem;
 if (JSON.stringify(form.item) === JSON.stringify([["","","","","","","","","","","",""]])) {
  let newItemArr = addItem.item.split(',');
  const itemArrSize = 12;
  const itemArrChunks = splitItemArr(newItemArr, itemArrSize);
  newItem = itemArrChunks;
 } else {
  let newItemArr = (form.item + "," + addItem.item).split(',');
  const itemArrSize = 12;
  const itemArrChunks = splitItemArr(newItemArr, itemArrSize);
  newItem = itemArrChunks;
 }
 async function addItemToDb(e){
  e.preventDefault();
  await fetch(`/update-item/${params.id}`, {
   method: "PUT",
   headers: {
     "Content-Type": "application/json",
   },
   body: JSON.stringify({
    item: newItem,
   }),
 })
 .catch(error => {
   window.alert(error);
   return;
 });
 navigate(0);
}
 // This method will delete an item
 function deleteItems(el) {
  const index = form.item.indexOf(el);
  form.item.splice(index, 1);
  updateItem(form.item);
  addDeleteItemToDb();
 }
 let showDeleteItemBtn = "";
 if (JSON.stringify(form.item) === JSON.stringify([["","","","","","","","","","","",""]])){
  showDeleteItemBtn = "none";
 }
async function addDeleteItemToDb(){
  let newItemForm = form.item;
  if (JSON.stringify(form.item) === JSON.stringify([])){
    newItemForm = [["","","","","","","","","","","",""]];
    await fetch(`/update-item/${params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
       item: newItemForm,
      }),
    })
    .catch(error => {
      window.alert(error);
      return;
    });
    console.log("Item Deleted")
    navigate(0);
  } else {
  await fetch(`/update-item/${params.id}`, {
   method: "PUT",
   headers: {
     "Content-Type": "application/json",
   },
   body: JSON.stringify({
    item: newItemForm,
   }),
 })
 .catch(error => {
   window.alert(error);
   return;
 });
 console.log("Item Deleted")
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
              <td>{atkBonus}</td>
            </tr>
            <tr>
              <td>AC</td>
              <td>{Number(totalArmorAcBonus) + Number(10) + Number(armorMaxDex)}</td>
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
            <tr>
              <td>Initiative</td>
              <td>{dexMod}</td>
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
        <Card className="mx-2 mb-4" style={{ width: '21rem' }}>
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
        {/* --------------------------------Working on---------------------------------------------------- */}
          {form.newSkill.map((el) => (  
            <tr style={{display: showSkills}}>           
              <td><Button style={{ display: showSkillBtn}} onClick={() => removeSkillNew(el[0], el[1])} className="bg-danger fa-solid fa-minus"></Button></td>
              <td>{el[0]}</td>
              <td><span id={el[0] + "total"}>{Number(el[1]) + intMod}</span></td>
              <td><span id={el[0]}>{Number(el[1])}</span></td>
              <td><span id="">{intMod}</span></td>
              <td><Button style={{ display: showSkillBtn}} onClick={() => addSkillNew(el[0])} className="fa-solid fa-plus"></Button></td>
            </tr>
            ))}  
        {/* ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^Working on^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ */}
        </tbody>
      </Table>
    </Card> 
    <Button style={{ display: showSkillBtn}} onClick={() => {skillsUpdate(); addUpdatedSkillToDb();}} className="mx-2 bg-warning fa-solid fa-floppy-disk"></Button>
    <Button
     onClick={() => handleShowAddSkill()}
      className="bg-success fa-solid fa-plus"></Button>   
     </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="4">
      <Modal show={showAddSkill} onHide={handleCloseAddSkill}>
        <Modal.Header closeButton>
          <Modal.Title>Add Skill</Modal.Title>
        </Modal.Header>
        <Modal.Body>
        <center>
      <Form 
      onSubmit={addSkillToDb} 
      className="px-5">
      <Form.Group className="mb-3 pt-3" >
      <Form.Label className="text-dark">Skill</Form.Label>
       <Form.Control className="mb-2" 
       onChange={(e) => updateNewSkill({ skill: e.target.value })}
        type="text" placeholder="Enter Skill" />
      <Form.Label className="text-dark">Skill Type</Form.Label>
       <Form.Select className="mb-2" 
       onChange={(e) => updateAddSkill({ newSkill: e.target.value })}
        type="text">
        <option></option>
        <option value={["Knowledge " + newSkill.skill, 0]}>Knowledge</option> 
        <option value={["Craft " + newSkill.skill, 0]}>Craft</option> 
        </Form.Select>
         </Form.Group>
     <center>
     <Button variant="primary" onClick={handleCloseAddSkill} type="submit">
            Create
          </Button>
          <Button className="ms-4" variant="secondary" onClick={handleCloseAddSkill}>
            Close
          </Button>
          </center>
     </Form>
     </center>
        </Modal.Body>
        <Modal.Footer>
        </Modal.Footer>
      </Modal>
      {/* -----------------------------------------Weapons Render---------------------------------------------------------------------------------------------------------------------------------- */}
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
              <th>Range</th>
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
                return(Number(atkBonus) + Number(strMod) + Number(el[1]));
              } else if (el[4] === "1") {
                return(Number(atkBonus) + Number(strMod) + Number(el[1]));
              } else if (el[4] === "2") {
                return(Number(atkBonus) + Number(dexMod) + Number(el[1]));
              }
              })()}</td>
              <td style={{display: showAtkBonusSave}}>{el[2]}
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
          <option value={[el.weaponName, el.enhancement, el.damage, el.critical, el.weaponStyle, el.range]}>{el.weaponName}</option>
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
              <th>Check Penalty</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
          {form.armor.map((el) => (  
            <tr>           
              <td>{el[0]}</td>
              <td>{el[1]}</td>
              <td>{el[2]}</td>
              <td>{el[3]}</td>
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
          <option value={[el.armorName, el.armorBonus, el.maxDex, el.armorCheckPenalty]}>{el.armorName}</option>
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
          {form.item.map((el) => (  
            <tr>           
              <td>{el[0]}</td>
              <td><Button className="fa-regular fa-eye" variant="primary" onClick={() => {handleShowNotes(); setModalItemData(el);}}></Button></td>
              <td style={{ display: showDeleteItemBtn}}>
              {(() => {
               const attributeValues = [];

               if (el[2] !== "0") attributeValues.push("STR:" + el[2] + " ");
               if (el[3] !== "0") attributeValues.push("DEX:" + el[3] + " ");
               if (el[4] !== "0") attributeValues.push("CON:" + el[4] + " ");
               if (el[5] !== "0") attributeValues.push("INT:" + el[5] + " ");
               if (el[6] !== "0") attributeValues.push("WIS:" + el[6] + " ");
               if (el[7] !== "0") attributeValues.push("CHA:" + el[7] + " ");

               return(attributeValues);
              })()}
              
              </td>
              <td style={{ display: showDeleteItemBtn}}>
              {(() => {
               const skillValues = [];

               if (el[8] !== "0") skillValues.push("Climb:" + el[8] + " ");
               if (el[9] !== "0") skillValues.push("GatherInfo:" + el[9] + " ");
               if (el[10] !== "0") skillValues.push("Heal:" + el[10] + " ");
               if (el[11] !== "0") skillValues.push("Jump:" + el[11] + " ");

               return(skillValues);
              })()}
                
              </td>
              <td><Button style={{ display: showDeleteItemBtn}} className="fa-solid fa-trash" variant="danger" onClick={() => {deleteItems(el);}}></Button></td>
            </tr>
            ))}   
          </tbody>
        </Table>        
    </Card> 
    <Row>
        <Col>
          <Form onSubmit={addItemToDb}>
          <Form.Group className="mb-3 mx-5">
        <Form.Label className="text-dark">Select Item</Form.Label>
        <Form.Select 
        onChange={(e) => updateItem({ item: e.target.value })}
         type="text">
          <option></option>
          {item.item.map((el) => (  
          <option value={[el.itemName, el.notes, el.str, el.dex, el.con, el.int, el.wis, el.cha,
          el.climb, el.gatherInfo, el.heal, el.jump]}>{el.itemName}</option>
          ))}
        </Form.Select>
      </Form.Group>
        <Button className="rounded-pill" variant="outline-dark" type="submit">Add</Button>
          </Form>
        </Col>
      </Row>
      <Modal show={showNotes} onHide={handleCloseNotes}>
        <Modal.Header closeButton>
          <Modal.Title>{modalItemData[0]}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{modalItemData[1]}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseNotes}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
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