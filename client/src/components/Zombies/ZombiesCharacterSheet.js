import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import Modal from 'react-bootstrap/Modal';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { Button, Col, Form, Row } from "react-bootstrap";
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router";
import { useNavigate } from "react-router";
import '../../App.scss';
import PlayerTurnActions from './PlayerTurnActions';

export default function ZombiesCharacterSheet(props) {
  const navigate = useNavigate();
  const params = useParams();
  const [form, setForm] = useState({ 
    characterName: "",
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
    newSkill: [["","",0]],
    diceColor: "",
  });
  const totalLevel = form.occupation.reduce((total, el) => total + Number(el.Level), 0);
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
    setNewColor(record.diceColor);
  }
  fetchData();   
  return;
  
}, [params.id, navigate]);

 // This method will delete a record
 async function deleteRecord() {
  await fetch(`/delete-character/${params.id}`, {
    method: "DELETE"
  });
  navigate(`/zombies-character-select/${form.campaign}`);
}
const [showDeleteCharacter, setShowDeleteCharacter] = useState(false);
const handleCloseDeleteCharacter = () => setShowDeleteCharacter(false);
const handleShowDeleteCharacter = () => setShowDeleteCharacter(true);
//-------------------------------------------Character Info----------------------------------------------------------------------------------------------------------------------
const [showCharacterInfo, setShowCharacterInfo] = useState(false);
const handleCloseCharacterInfo = () => setShowCharacterInfo(false);
const handleShowCharacterInfo = () => setShowCharacterInfo(true);
//------------------------------Stats--------------------------------------------------------------------------------------------------------------------------------------------
const [showStats, setShowStats] = useState(false);
const handleCloseStats = () => setShowStats(false);
const handleShowStats = () => setShowStats(true);
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
let statPointsLeft = Math.floor((totalLevel / 4) - (statTotal - form.startStatTotal));

  let showBtn = "";
  let statGold = "gold";
  if (statPointsLeft === 0) {
    showBtn = "none";
    statGold = "#6C757D";
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
  const occupations = form.occupation;
  let highestFort = -1; 
  for (const occupation of occupations) {
  const fortValue = parseInt(occupation.Fort, 10);  
  if (!isNaN(fortValue) && fortValue > highestFort) {
    highestFort = fortValue;
  }
}
  let highestReflex = -1; 
  for (const occupation of occupations) {
  const reflexValue = parseInt(occupation.Reflex, 10);  
  if (!isNaN(reflexValue) && reflexValue > highestReflex) {
    highestReflex = reflexValue;
  }
}
  let highestWill = -1; 
  for (const occupation of occupations) {
  const willValue = parseInt(occupation.Will, 10);  
  if (!isNaN(willValue) && willValue > highestWill) {
    highestWill = willValue;
  }
  }
  let highestAttackBonus = -1; 
  for (const occupation of occupations) {
  const attackBonusValue = parseInt(occupation.atkBonus, 10);  
  if (!isNaN(attackBonusValue) && attackBonusValue > highestAttackBonus) {
    highestAttackBonus = attackBonusValue;
  }
  }
  if (highestFort === 0) {
    fortSave = Math.floor(totalLevel / 3);
  } if (highestFort === 1) {
    fortSave = Math.floor((totalLevel / 2) + 2);
  }
  if (highestReflex === 0) {
    reflexSave = Math.floor(totalLevel / 3);
  } else if (highestReflex === 1) {
    reflexSave = Math.floor((totalLevel / 2) + 2);
  }
  if (highestWill === 0) {
    willSave = Math.floor(totalLevel / 3);
  } else if (highestWill === 1) {
    willSave = Math.floor((totalLevel / 2) + 2);
  }

  if (highestAttackBonus === 0) {
    atkBonus = Math.floor(totalLevel / 2);
  } else if (highestAttackBonus === 1) {
    atkBonus = Math.floor((totalLevel * .75));
  } else if (highestAttackBonus === 2) {
    atkBonus = totalLevel;
  }

    // Saves Maffs Next
    let fortSaveNext;
    let reflexSaveNext;
    let willSaveNext;
    let atkBonusNext;
    if (highestFort === 0) {
      fortSaveNext = Math.floor((totalLevel +1) / 3);
    } if (highestFort === 1) {
      fortSaveNext = Math.floor(((totalLevel +1) / 2) + 2);
    }
    if (highestReflex === 0) {
      reflexSaveNext = Math.floor((totalLevel +1) / 3);
    } else if (highestReflex === 1) {
      reflexSaveNext = Math.floor(((totalLevel +1) / 2) + 2);
    }
    if (highestWill === 0) {
      willSaveNext = Math.floor((totalLevel +1) / 3);
    } else if (highestWill === 1) {
      willSaveNext = Math.floor(((totalLevel +1) / 2) + 2);
    }
  
    if (highestAttackBonus === 0) {
      atkBonusNext = Math.floor((totalLevel +1) / 2);
    } else if (highestAttackBonus === 1) {
      atkBonusNext = Math.floor(((totalLevel +1) * .75));
    } else if (highestAttackBonus === 2) {
      atkBonusNext = (totalLevel +1);
    }

  // Health
  const [health, setHealth] = useState(); // Initial health value
 // Sends tempHealth data to database for update
 async function tempHealthUpdate(offset){
    await fetch(`/update-temphealth/${params.id}`, {
     method: "PUT",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
      tempHealth: health + offset,
     }),
   })
   .catch(error => {
     window.alert(error);
     return;
   });
 }

  useEffect(() => {
    const parsedValue = parseFloat(form.tempHealth);
    if (!isNaN(parsedValue)) {
      setHealth(parsedValue);
    } else {
    }
  }, [form.tempHealth]);

  const maxPossibleHealth = form.health + Number(conMod * totalLevel);  
  
  function getColorForHealth(currentHealth, maxHealth) {
    const healthPercentage = (currentHealth / maxHealth) * 100;
    if (healthPercentage >= 70) {
      return 'green';
    } else if (healthPercentage >= 30) {
      return 'yellow';
    } else {
      return 'red';
    }
  }

  const healthColor = getColorForHealth(health, maxPossibleHealth);
  const healthWidth = (health / maxPossibleHealth) * 100;
  const healthStyle = {
    width: `${healthWidth}%`,
    backgroundColor: healthColor,
    color: "black",
    height: "100%",
    borderRadius: "5px",
    transition: "width 0.3s",
    textAlign: "center",
    fontWeight: "bold",
    lineHeight: "20px",
  };

  const healthBar = {
    width: "100%",
    height: "20px",
    backgroundColor: "#debb9d",
    borderRadius: "5px",
    marginBottom: "10px",
  };

  let offset;
  const increaseHealth = () => {
    if (health === form.health + Number(conMod * totalLevel)){
    } else {
    setHealth((prevHealth) => prevHealth + 1);
    offset = +1;
    tempHealthUpdate(offset);
    }
  };

  const decreaseHealth = () => {
    if (health === -10){
    } else {
    setHealth((prevHealth) => prevHealth - 1);
    offset = -1;
    tempHealthUpdate(offset);
    }
  };
//-----------------------Skills--------------------------------------------------------------------------------------------------------------------------------------------------------------------
const [showAddSkill, setShowAddSkill] = useState(false);
const handleCloseAddSkill = () => setShowAddSkill(false);
const handleShowAddSkill = () => setShowAddSkill(true);
const [showSkill, setShowSkill] = useState(false);
const handleCloseSkill = () => setShowSkill(false);
const handleShowSkill = () => setShowSkill(true);

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

let currAppraise = form.appraise;
let currBalance = form.balance;
let currBluff = form.bluff;
let currClimb = form.climb;
let currConcentration = form.concentration;
let currDecipherScript = form.decipherScript;
let currDiplomacy = form.diplomacy;
let currDisableDevice = form.disableDevice;
let currDisguise = form.disguise;
let currEscapeArtist = form.escapeArtist;
let currForgery = form.forgery;
let currGatherInfo = form.gatherInfo;
let currHandleAnimal = form.handleAnimal;
let currHeal = form.heal;
let currHide = form.hide;
let currIntimidate = form.intimidate;
let currJump = form.jump;
let currListen = form.listen;
let currMoveSilently = form.moveSilently;
let currOpenLock = form.openLock;
let currRide = form.ride;
let currSearch = form.search;
let currSenseMotive = form.senseMotive;
let currSleightOfHand = form.sleightOfHand;
let currSpot = form.spot;
let currSurvival = form.survival;
let currSwim = form.swim;
let currTumble = form.tumble;
let currUseTech = form.useTech;
let currUseRope = form.useRope;

const skillForm = {
  appraise: currAppraise,
  balance: currBalance,
  bluff: currBluff,
  climb: currClimb,
  concentration: currConcentration,
  decipherScript: currDecipherScript,
  diplomacy: currDiplomacy,
  disableDevice: currDisableDevice,
  disguise: currDisguise,
  escapeArtist: currEscapeArtist,
  forgery: currForgery,
  gatherInfo: currGatherInfo,
  handleAnimal: currHandleAnimal,
  heal: currHeal,
  hide: currHide,
  intimidate: currIntimidate,
  jump: currJump,
  listen: currListen,
  moveSilently: currMoveSilently,
  openLock: currOpenLock,
  ride: currRide,
  search: currSearch,
  senseMotive: currSenseMotive,
  sleightOfHand: currSleightOfHand,
  spot: currSpot,
  survival: currSurvival,
  swim: currSwim,
  tumble: currTumble,
  useTech: currUseTech,
  useRope: currUseRope,
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
let itemAppraise = [];
form.item.map((el) => (
  itemAppraise.push(el[8])
));
let totalItemAppraise = itemAppraise.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemBalance = [];
form.item.map((el) => (
  itemBalance.push(el[9])
));
let totalItemBalance = itemBalance.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemBluff = [];
form.item.map((el) => (
  itemBluff.push(el[10])
));
let totalItemBluff = itemBluff.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemClimb = [];
form.item.map((el) => (
  itemClimb.push(el[11])
));
let totalItemClimb = itemClimb.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemConcentration = [];
form.item.map((el) => (
  itemConcentration.push(el[12])
));
let totalItemConcentration = itemConcentration.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemDecipherScript = [];
form.item.map((el) => (
  itemDecipherScript.push(el[13])
));
let totalItemDecipherScript = itemDecipherScript.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemDiplomacy = [];
form.item.map((el) => (
  itemDiplomacy.push(el[14])
));
let totalItemDiplomacy = itemDiplomacy.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemDisableDevice = [];
form.item.map((el) => (
  itemDisableDevice.push(el[15])
));
let totalItemDisableDevice = itemDisableDevice.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemDisguise = [];
form.item.map((el) => (
  itemDisguise.push(el[16])
));
let totalItemDisguise = itemDisguise.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemEscapeArtist = [];
form.item.map((el) => (
  itemEscapeArtist.push(el[17])
));
let totalItemEscapeArtist = itemEscapeArtist.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemForgery = [];
form.item.map((el) => (
  itemForgery.push(el[18])
));
let totalItemForgery = itemForgery.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemGatherInfo = [];
form.item.map((el) => (
  itemGatherInfo.push(el[19])
));
let totalItemGatherInfo = itemGatherInfo.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemHandleAnimal = [];
form.item.map((el) => (
  itemHandleAnimal.push(el[20])
));
let totalItemHandleAnimal = itemHandleAnimal.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemHeal = [];
form.item.map((el) => (
  itemHeal.push(el[21])
));
let totalItemHeal = itemHeal.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemHide = [];
form.item.map((el) => (
  itemHide.push(el[22])
));
let totalItemHide = itemHide.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemIntimidate = [];
form.item.map((el) => (
  itemIntimidate.push(el[23])
));
let totalItemIntimidate = itemIntimidate.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemJump = [];
form.item.map((el) => (
  itemJump.push(el[24])
));
let totalItemJump = itemJump.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemListen = [];
form.item.map((el) => (
  itemListen.push(el[25])
));
let totalItemListen = itemListen.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemMoveSilently = [];
form.item.map((el) => (
  itemMoveSilently.push(el[26])
));
let totalItemMoveSilently = itemMoveSilently.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemOpenLock = [];
form.item.map((el) => (
  itemOpenLock.push(el[27])
));
let totalItemOpenLock = itemOpenLock.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemRide = [];
form.item.map((el) => (
  itemRide.push(el[28])
));
let totalItemRide = itemRide.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemSearch = [];
form.item.map((el) => (
  itemSearch.push(el[29])
));
let totalItemSearch = itemSearch.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemSenseMotive = [];
form.item.map((el) => (
  itemSenseMotive.push(el[30])
));
let totalItemSenseMotive = itemSenseMotive.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemSleightOfHand = [];
form.item.map((el) => (
  itemSleightOfHand.push(el[31])
));
let totalItemSleightOfHand = itemSleightOfHand.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemSpot = [];
form.item.map((el) => (
  itemSpot.push(el[32])
));
let totalItemSpot = itemSpot.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemSurvival = [];
form.item.map((el) => (
  itemSurvival.push(el[33])
));
let totalItemSurvival = itemSurvival.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemSwim = [];
form.item.map((el) => (
  itemSwim.push(el[34])
));
let totalItemSwim = itemSwim.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemTumble = [];
form.item.map((el) => (
  itemTumble.push(el[35])
));
let totalItemTumble = itemTumble.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemUseTech = [];
form.item.map((el) => (
  itemUseTech.push(el[36])
));
let totalItemUseTech = itemUseTech.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let itemUseRope = [];
form.item.map((el) => (
  itemUseRope.push(el[37])
));
let totalItemUseRope = itemUseRope.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

//Feat Skills
let featAppraise = [];
form.feat.map((el) => (
  featAppraise.push(el[2])
));
let totalFeatAppraise = featAppraise.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featBalance = [];
form.feat.map((el) => (
  featBalance.push(el[3])
));
let totalFeatBalance = featBalance.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featBluff = [];
form.feat.map((el) => (
  featBluff.push(el[4])
));
let totalFeatBluff = featBluff.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featClimb = [];
form.feat.map((el) => (
  featClimb.push(el[5])
));
let totalFeatClimb = featClimb.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featConcentration = [];
form.feat.map((el) => (
  featConcentration.push(el[6])
));
let totalFeatConcentration = featConcentration.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featDecipherScript = [];
form.feat.map((el) => (
  featDecipherScript.push(el[7])
));
let totalFeatDecipherScript = featDecipherScript.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featDiplomacy = [];
form.feat.map((el) => (
  featDiplomacy.push(el[8])
));
let totalFeatDiplomacy = featDiplomacy.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featDisableDevice = [];
form.feat.map((el) => (
  featDisableDevice.push(el[9])
));
let totalFeatDisableDevice = featDisableDevice.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featDisguise = [];
form.feat.map((el) => (
  featDisguise.push(el[10])
));
let totalFeatDisguise = featDisguise.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featEscapeArtist = [];
form.feat.map((el) => (
  featEscapeArtist.push(el[11])
));
let totalFeatEscapeArtist = featEscapeArtist.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featForgery = [];
form.feat.map((el) => (
  featForgery.push(el[12])
));
let totalFeatForgery = featForgery.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featGatherInfo = [];
form.feat.map((el) => (
  featGatherInfo.push(el[13])
));
let totalFeatGatherInfo = featGatherInfo.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featHandleAnimal = [];
form.feat.map((el) => (
  featHandleAnimal.push(el[14])
));
let totalFeatHandleAnimal = featHandleAnimal.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featHeal = [];
form.feat.map((el) => (
  featHeal.push(el[15])
));
let totalFeatHeal = featHeal.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featHide = [];
form.feat.map((el) => (
  featHide.push(el[16])
));
let totalFeatHide = featHide.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featIntimidate = [];
form.feat.map((el) => (
  featIntimidate.push(el[17])
));
let totalFeatIntimidate = featIntimidate.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featJump = [];
form.feat.map((el) => (
  featJump.push(el[18])
));
let totalFeatJump = featJump.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featListen = [];
form.feat.map((el) => (
  featListen.push(el[19])
));
let totalFeatListen = featListen.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featMoveSilently = [];
form.feat.map((el) => (
  featMoveSilently.push(el[20])
));
let totalFeatMoveSilently = featMoveSilently.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featOpenLock = [];
form.feat.map((el) => (
  featOpenLock.push(el[21])
));
let totalFeatOpenLock = featOpenLock.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featRide = [];
form.feat.map((el) => (
  featRide.push(el[22])
));
let totalFeatRide = featRide.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featSearch = [];
form.feat.map((el) => (
  featSearch.push(el[23])
));
let totalFeatSearch = featSearch.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featSenseMotive = [];
form.feat.map((el) => (
  featSenseMotive.push(el[24])
));
let totalFeatSenseMotive = featSenseMotive.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featSleightOfHand = [];
form.feat.map((el) => (
  featSleightOfHand.push(el[25])
));
let totalFeatSleightOfHand = featSleightOfHand.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featSpot = [];
form.feat.map((el) => (
  featSpot.push(el[26])
));
let totalFeatSpot = featSpot.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featSurvival = [];
form.feat.map((el) => (
  featSurvival.push(el[27])
));
let totalFeatSurvival = featSurvival.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featSwim = [];
form.feat.map((el) => (
  featSwim.push(el[28])
));
let totalFeatSwim = featSwim.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featTumble = [];
form.feat.map((el) => (
  featTumble.push(el[29])
));
let totalFeatTumble = featTumble.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featUseTech = [];
form.feat.map((el) => (
  featUseTech.push(el[30])
));
let totalFeatUseTech = featUseTech.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let featUseRope = [];
form.feat.map((el) => (
  featUseRope.push(el[31])
));
let totalFeatUseRope = featUseRope.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let totalAppraise = form.appraise + intMod + totalItemAppraise + totalFeatAppraise;
let totalBalance = form.balance + dexMod + totalCheckPenalty + totalItemBalance + totalFeatBalance;
let totalBluff = form.bluff + chaMod + totalItemBluff + totalFeatBluff;
let totalClimb = form.climb + strMod + totalCheckPenalty + totalItemClimb + totalFeatClimb;
let totalConcentration = form.concentration + conMod + totalItemConcentration + totalFeatConcentration;
let totalDecipherScript = form.decipherScript + intMod + totalItemDecipherScript + totalFeatDecipherScript;
let totalDiplomacy = form.diplomacy + chaMod + totalItemDiplomacy + totalFeatDiplomacy;
let totalDisableDevice = form.disableDevice + intMod + totalItemDisableDevice + totalFeatDisableDevice;
let totalDisguise = form.disguise + chaMod + totalItemDisguise + totalFeatDisguise;
let totalEscapeArtist = form.escapeArtist + dexMod + totalCheckPenalty + totalItemEscapeArtist + totalFeatEscapeArtist;
let totalForgery = form.forgery + intMod + totalItemForgery + totalFeatForgery;
let totalGatherInfo = form.gatherInfo + chaMod + totalItemGatherInfo + totalFeatGatherInfo;
let totalHandleAnimal = form.handleAnimal + chaMod + totalItemHandleAnimal + totalFeatHandleAnimal;
let totalHeal = form.heal + wisMod + totalItemHeal + totalFeatHeal;
let totalHide = form.hide + dexMod + totalCheckPenalty + totalItemHide + totalFeatHide;
let totalIntimidate = form.intimidate + chaMod + totalItemIntimidate + totalFeatIntimidate;
let totalJump = form.jump + strMod + totalCheckPenalty + totalItemJump + totalFeatJump;
let totalListen = form.listen + wisMod + totalItemListen + totalFeatListen;
let totalMoveSilently = form.moveSilently + dexMod + totalCheckPenalty + totalItemMoveSilently + totalFeatMoveSilently;
let totalOpenLock = form.openLock + dexMod + totalItemOpenLock + totalFeatOpenLock;
let totalRide = form.ride + dexMod + totalItemRide + totalFeatRide;
let totalSearch = form.search + intMod + totalItemSearch + totalFeatSearch;
let totalSenseMotive = form.senseMotive + wisMod + totalItemSenseMotive + totalFeatSenseMotive;
let totalSleightOfHand = form.sleightOfHand + dexMod + totalCheckPenalty + totalItemSleightOfHand + totalFeatSleightOfHand;
let totalSpot = form.spot + wisMod + totalItemSpot + totalFeatSpot;
let totalSurvival = form.survival + wisMod + totalItemSurvival + totalFeatSurvival;
let totalSwim = form.swim + strMod + (totalCheckPenalty * 2) + totalItemSwim + totalFeatSwim;
let totalTumble = form.tumble + dexMod + totalItemTumble + totalFeatTumble;
let totalUseTech = form.useTech + intMod + totalItemUseTech + totalFeatUseTech;
let totalUseRope = form.useRope + dexMod + totalItemUseRope + totalFeatUseRope;

const skillTotalForm = {
  appraise: totalAppraise,
  balance: totalBalance,
  bluff: totalBluff,
  climb: totalClimb,
  concentration: totalConcentration,
  decipherScript: totalDecipherScript,
  diplomacy: totalDiplomacy,
  disableDevice: totalDisableDevice,
  disguise: totalDisguise,
  escapeArtist: totalEscapeArtist,
  forgery: totalForgery,
  gatherInfo: totalGatherInfo,
  handleAnimal: totalHandleAnimal,
  heal: totalHeal,
  hide: totalHide,
  intimidate: totalIntimidate,
  jump: totalJump,
  listen: totalListen,
  moveSilently: totalMoveSilently,
  openLock: totalOpenLock,
  ride: totalRide,
  search: totalSearch,
  senseMotive: totalSenseMotive,
  sleightOfHand: totalSleightOfHand,
  spot: totalSpot,
  survival: totalSurvival,
  swim: totalSwim,
  tumble: totalTumble,
  useTech: totalUseTech,
  useRope: totalUseRope,
}

let addedSkillsRanks= [];
form.newSkill.map((el) => (  
  addedSkillsRanks.push(el[1]) 
))
let totalAddedSkills = addedSkillsRanks.reduce((partialSum, a) => Number(partialSum) + Number(a), 0); 

let skillTotal = form.appraise + form.balance + form.bluff + form.climb + form.concentration + 
form.decipherScript + form.diplomacy + form.disableDevice + form.disguise + form.escapeArtist + 
form.forgery + form.gatherInfo + form.handleAnimal + form.heal + form.hide + form.intimidate + 
form.jump + form.listen + form.moveSilently + form.openLock + form.ride + form.search + 
form.senseMotive + form.sleightOfHand + form.spot + form.survival + form.swim + form.tumble + 
form.useTech + form.useRope;
let skillPointsLeft = Math.floor((Number(form.occupation.skillMod) + intMod) * 4 + (Number(form.occupation.skillMod) + intMod) * (totalLevel - 1) - skillTotal - totalAddedSkills);
let showSkillBtn = "";
let skillGold = "gold";
if (skillPointsLeft === 0) {
  showSkillBtn = "none";
  skillGold = "#6C757D";
}

function addSkill(skill, totalSkill) {
  if (skillPointsLeft === 0){
  } else if (form.occupation[skill] === "0" && skillForm[skill] === Math.floor((Number(totalLevel) + 3) / 2)) {  
  } else if (form.occupation[skill] === "1" && skillForm[skill] === Math.floor(Number(totalLevel) + 3)){
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
  } else if (newSkillForm[skill] === Math.floor(Number(totalLevel) + 3)){
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
const [showWeapons, setShowWeapons] = useState(false);
const handleCloseWeapons = () => setShowWeapons(false);
const handleShowWeapons = () => setShowWeapons(true);
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
const [showArmor, setShowArmor] = useState(false);
const handleCloseArmor = () => setShowArmor(false);
const handleShowArmor = () => setShowArmor(true);
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
const [showItems, setShowItems] = useState(false);
const handleCloseItems = () => setShowItems(false);
const handleShowItems = () => setShowItems(true);

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
 if (JSON.stringify(form.item) === JSON.stringify([["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]])) {
  let newItemArr = addItem.item.split(',');
  const itemArrSize = 38;
  const itemArrChunks = splitItemArr(newItemArr, itemArrSize);
  newItem = itemArrChunks;
 } else {
  let newItemArr = (form.item + "," + addItem.item).split(',');
  const itemArrSize = 38;
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
 if (JSON.stringify(form.item) === JSON.stringify([["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]])){
  showDeleteItemBtn = "none";
 }
async function addDeleteItemToDb(){
  let newItemForm = form.item;
  if (JSON.stringify(form.item) === JSON.stringify([])){
    newItemForm = [["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]];
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
//----------------------------------------------Feats Section------------------------------------------------------------------------------------------------------------------------------------
const [feat, setFeat] = useState({ 
  feat: [], 
});
const [addFeat, setAddFeat] = useState({ 
  feat: "",
});
const [modalFeatData, setModalFeatData] = useState({
  feat: "",
})
const [showFeatNotes, setShowFeatNotes] = useState(false);
const handleCloseFeatNotes = () => setShowFeatNotes(false);
const handleShowFeatNotes = () => setShowFeatNotes(true);
const [showFeats, setShowFeats] = useState(false);
const handleCloseFeats = () => setShowFeats(false);
const handleShowFeats = () => setShowFeats(true);

function updateFeat(value) {
  return setAddFeat((prev) => {
    return { ...prev, ...value };
  });
}
// ---------------------------------------Feats left-----------------------------------------------------
  let featLength;
if (JSON.stringify(form.feat) === JSON.stringify([["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]])) { 
  featLength = 0; 
} else {
   featLength = form.feat.length 
  }
let featPointsLeft = Math.floor((totalLevel / 3) - (featLength)) + 1;

  let showFeatBtn = "";
  let featGold = "gold";
  if (featPointsLeft === 0) {
    showFeatBtn = "none";
    featGold = "#6C757D";
  }

// ----------------------------------------Fetch Feats-----------------------------------
useEffect(() => {
  async function fetchFeats() {
    const response = await fetch(`/feats`);    

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
    setFeat({feat: record});
  }
  fetchFeats();   
  return;
  
}, [navigate]);
 // Sends feat data to database for update
 const splitFeatArr = (array, size) => {
  let result = [];
  for (let i = 0; i < array.length; i += size) {
    let chunk = array.slice(i, i + size);
    result.push(chunk);
  }
  return result;
};
 let newFeat;
 if (JSON.stringify(form.feat) === JSON.stringify([["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]])) {
  let newFeatArr = addFeat.feat.split(',');
  const featArrSize = 32;
  const featArrChunks = splitFeatArr(newFeatArr, featArrSize);
  newFeat = featArrChunks;
 } else {
  let newFeatArr = (form.feat + "," + addFeat.feat).split(',');
  const featArrSize = 32;
  const featArrChunks = splitFeatArr(newFeatArr, featArrSize);
  newFeat = featArrChunks;
 }
 async function addFeatToDb(e){
  e.preventDefault();
  await fetch(`/update-feat/${params.id}`, {
   method: "PUT",
   headers: {
     "Content-Type": "application/json",
   },
   body: JSON.stringify({
    feat: newFeat,
   }),
 })
 .catch(error => {
   window.alert(error);
   return;
 });
 navigate(0);
}
 // This method will delete an feat
 function deleteFeats(el) {
  const index = form.feat.indexOf(el);
  form.feat.splice(index, 1);
  updateFeat(form.feat);
  addDeleteFeatToDb();
 }
 let showDeleteFeatBtn = "";
 if (JSON.stringify(form.feat) === JSON.stringify([["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]])){
  showDeleteFeatBtn = "none";
 }
async function addDeleteFeatToDb(){
  let newFeatForm = form.feat;
  if (JSON.stringify(form.feat) === JSON.stringify([])){
    newFeatForm = [["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]];
    await fetch(`/update-feat/${params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
       feat: newFeatForm,
      }),
    })
    .catch(error => {
      window.alert(error);
      return;
    });
    console.log("Feat Deleted")
    navigate(0);
  } else {
  await fetch(`/update-feat/${params.id}`, {
   method: "PUT",
   headers: {
     "Content-Type": "application/json",
   },
   body: JSON.stringify({
    feat: newFeatForm,
   }),
 })
 .catch(error => {
   window.alert(error);
   return;
 });
 console.log("Feat Deleted")
 navigate(0);
}
}
//--------------------------------------------Actions Buttons-------------------------------------------------------------------------------------------------------------------------------------
const [selectedAction, setSelectedAction] = useState(null);
const [selectedBonusAction, setSelectedBonusAction] = useState(null);

const handleActionSelect = (action) => {
  setSelectedAction(action);
  // Perform the logic associated with the selected action
};

const handleBonusActionSelect = (bonusAction) => {
  setSelectedBonusAction(bonusAction);
  // Perform the logic associated with the selected bonus action
};




const availableActions = [
  { id: 1, name: 'Attack', description: 'Perform a basic melee or ranged attack.', background: 'url(../images/icons8-sword-64.png)' },
  { id: 2, name: 'Help', description: 'Help up a downed player or remove a status effect from them like entangle, burning or sleep.', background: 'url(../images/icons8-helping-hand-64.png)' },
  { id: 4, name: 'Hide', description: 'Attempt to hide from enemies.', background: 'url(../images/icons8-closed-eye-64.png)' },
  { id: 5, name: 'Disengage', description: 'Disengage from combat without provoking attacks of opportunity.', background: 'url(../images/icons8-highway-arrows-64.png)' },
  { id: 7, name: 'Grapple', description: 'Attempt to grapple a target creature.', background: 'url(../images/icons8-grab-100.png)' },
  { id: 9, name: 'Search', description: 'Thoroughly search an area for hidden items or secrets.', background: 'url(../images/icons8-search-100.png)' },
  { id: 10, name: 'Interact', description: 'Perform a minor interaction with an object or the environment.', background: 'url(../images/icons8-interactive-66.png)' },
  { id: 11, name: 'Throw', description: 'Throw an object that is close to you or from your inventory.', background: 'url(../images/icons8-hummer-throw-skin-type-1-96.png)' },
  { id: 12, name: 'Dash', description: 'Use the Dash action to move double your speed.', background: 'url(../images/icons8-runner-on-the-start-100.png)' },
  // ... add more actions
];

const availableBonusActions = [
  // { id: 1, name: 'Dodge', description: 'Take the Dodge action to gain advantage on Dexterity saving throws.' },
  { id: 3, name: 'Use Item', description: 'Use an item in your inventory.', background: 'url(../images/icons8-drinking-90.png)' },
  { id: 4, name: 'Jump', description: 'Jump a distance 5ft + your strength modifier and jump skill.', background: 'url(../images/icons8-long-jump-100.png)' },
  { id: 8, name: 'Shove', description: 'Shove a creature to push them or knock them prone.', background: 'url(../images/icons8-push-100.png)' },
  // ... add more bonus actions
];

let isActionSelected = selectedAction !== null;
const isBonusActionSelected = selectedBonusAction !== null;

const [moveActive, setMoveActive] = useState(false);
const handleMove = () => {
  setMoveActive(!moveActive);
  // Reset the selected move
  setSelectedAction(null);
  setSelectedBonusAction(null);
};

const [actionActive, setActionActive] = useState(false);
const handleAction = () => {
  setActionActive(!actionActive);
  // Reset the selected action
  setSelectedBonusAction(null);
};

const [bonusActive, setBonusActive] = useState(false);
const handleBonus = () => {
  setBonusActive(!bonusActive);
  // Reset the selected bonus action
  setSelectedAction(null);
};
//--------------------------------------------Level Up--------------------------------------------------------------------------------------------------------------------------------------------
const [showLvlModal, setShowLvlModal] = useState(false);

const handleCloseLvlModal = () => setShowLvlModal(false);
const handleShowLvlModal = () => setShowLvlModal(true);

const levelForm = {
  level: Number(totalLevel) + 1,
  health: Math.floor(Math.random() * Number(form.occupation.Health)) + 1 + Number(form.health),  
}

 // Sends level update to database
 async function levelUpdate(){
  const updatedLevel = { ...levelForm };
    await fetch(`/update-level/${params.id}`, {
     method: "PUT",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify(updatedLevel),
   })
   .catch(error => {
    //  window.alert(error);
     return;
   });
   navigate(0);
 }
//-------------------------------------------Help Module--------------------------------------------------------------------
const [showHelpModal, setShowHelpModal] = useState(false);

const handleCloseHelpModal = () => setShowHelpModal(false);
const handleShowHelpModal = () => setShowHelpModal(true);
// Color Picker

document.documentElement.style.setProperty('--dice-face-color', form.diceColor);
const colorPickerRef = useRef(null);
const [newColor, setNewColor] = useState(form.diceColor);

useEffect(() => {
  const colorPicker = colorPickerRef.current;

  if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
      const selectedColor = e.target.value;
      setNewColor(selectedColor); // Update the state with the new color
      document.documentElement.style.setProperty('--dice-face-color', selectedColor);
    });
  }
}, []); // Empty dependency array ensures this runs after component mounts

const handleColorChange = (e) => {
  const selectedColor = e.target.value;
  setNewColor(selectedColor); // Update the state with the new color
  document.documentElement.style.setProperty('--dice-face-color', selectedColor);
};

const opacity = 0.85;
// Calculate RGBA color with opacity
const rgbaColor = `rgba(${parseInt(form.diceColor.slice(1, 3), 16)}, ${parseInt(form.diceColor.slice(3, 5), 16)}, ${parseInt(form.diceColor.slice(5, 7), 16)}, ${opacity})`;

// Apply the calculated RGBA color to the element
document.documentElement.style.setProperty('--dice-face-color', rgbaColor);

 // Sends dice color update to database
 async function diceColorUpdate(){
    await fetch(`/update-dice-color/${params.id}`, {
     method: "PUT",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify({diceColor: newColor}),
   })
   .catch(error => {
    //  window.alert(error);
     return;
   });
   navigate(0);
 }
//--------------------------------------------Display---------------------------------------------------------------------------------------------------------------------------------------------
return (
<center className="pt-3" style={{ backgroundImage: 'url(../images/zombie.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "100vh"}}>
      <h1 style={{ fontSize: 28, backgroundPositionY: "450%", width: "300px", height: "95px", backgroundImage: 'url(../images/banner.png)', backgroundSize: "cover", backgroundRepeat: "no-repeat"}}className="text-dark">{form.characterName}</h1> 
      <div style={{marginTop: "-40px", marginBottom: "40px"}}>
      <h6 style={{backgroundColor: "#debb9d", color: "black", display: "inline-block", borderRadius: "5px"}}>
      <strong className="mx-2">AC: {Number(totalArmorAcBonus) + Number(10) + Number(armorMaxDex)}</strong>
      <strong className="mx-2">Attack Bonus: {atkBonus}</strong>
      <strong className="mx-2">Initiative: {dexMod}</strong>
      </h6>
{/*------------------------------------------------------------ Health Bar -----------------------------------------------------------------------------*/}
      <div className="health-bar" style={healthBar}>
        <div className="health-bar-inner" style={healthStyle}>{health}/{form.health + Number(conMod * totalLevel)}</div>
      </div>
      <Button style={{marginTop: "-35px", color: "black", border: "none"}} className="float-start bg-transparent fa-solid fa-minus" onClick={decreaseHealth}></Button>
      <Button style={{marginTop: "-35px", color: "black", border: "none"}} className="float-end bg-transparent fa-solid fa-plus" onClick={increaseHealth}></Button>  
      <h6 style={{backgroundColor: "#debb9d", color: "black", display: "inline-block", borderRadius: "5px"}}>
      <strong className="mx-2">Fort: {fortSave}</strong>
      <strong className="mx-2">Reflex: {reflexSave}</strong>
      <strong className="mx-2">Will: {willSave}</strong>
      </h6>    
      </div>
{/* -------------------------------------------------------------Actions--------------------------------------------------------------------------------- */}
      <Card style={{backgroundColor: "rgba(0, 0, 0, 0)", border: "none"}} className="zombiesActionItem mx-2">      
        {/* <Card.Title style={{ fontSize: 25}}>Actions Left</Card.Title> */}
        <div>
          <Button onClick={handleMove} className="mx-1 fas fa-shoe-prints" style={{ marginTop: "-80px", color: moveActive ? "black" : "#3de6d2" }} variant="secondary"></Button>
          <Button onClick={handleAction} className="mx-1 fas fa-circle" style={{ marginTop: "-80px", color: actionActive || isActionSelected ? "black" : "#7bf94d" }} variant="secondary" disabled={isActionSelected}></Button>
          <Button onClick={handleBonus} className="mx-1 fas fa-square" style={{ marginTop: "-80px", color: bonusActive || isBonusActionSelected ? "black" : "#ffb30f" }} variant="secondary" disabled={isBonusActionSelected}></Button>
          <Button onClick={() => {handleAction(); handleBonus(); handleMove();}} className="mx-1 fas fa-arrows-rotate" style={{ marginTop: "-80px", color: "#f71818" }} variant="secondary"></Button>
    <PlayerTurnActions
      actions={availableActions}
      bonusActions={availableBonusActions}
      onSelectAction={handleActionSelect}
      onSelectBonusAction={handleBonusActionSelect}
      weapons={form.weapon}
      atkBonus={atkBonus}
      strMod={strMod}
      dexMod={dexMod}
    />
  </div>
    </Card> 
{/* -----------------------------------------------------------Footer Bar----------------------------------------------------------------------------------- */}
    <Navbar fixed="bottom" bg="dark" data-bs-theme="dark">
        <Container>
          <Nav className="me-auto mx-auto" style={{marginTop: "-10px"}}>
            <div>
            <Button onClick={handleShowCharacterInfo} style={{color: "black", padding: "8px", marginTop: "10px"}} className="mx-1 fas fa-image-portrait" variant="secondary"></Button>     
            <Button onClick={handleShowStats} style={{color: "black", padding: "8px", marginTop: "10px", backgroundColor: statGold}} className="mx-1 fas fa-scroll" variant="secondary"></Button> 
            <Button onClick={handleShowSkill} style={{color: "black", padding: "8px", marginTop: "10px", backgroundColor: skillGold}} className="mx-1 fas fa-book-open" variant="secondary"></Button>  
            <Button onClick={handleShowFeats} style={{color: "black", padding: "8px", marginTop: "10px", backgroundColor: featGold}} className="mx-1 fas fa-hand-fist" variant="secondary"></Button>  
            <Button onClick={handleShowWeapons} style={{color: "black", padding: "8px", marginTop: "10px"}} className="mx-1 fas fa-wand-sparkles" variant="secondary"></Button>
            <Button onClick={handleShowArmor} style={{color: "black", padding: "8px", marginTop: "10px"}} className="mx-1 fas fa-shield" variant="secondary"></Button>  
            <Button onClick={handleShowItems} style={{color: "black", padding: "8px", marginTop: "10px"}} className="mx-1 fas fa-briefcase" variant="secondary"></Button>             
 {/* ----------------------------------Help Button-------------------------------------------------- */}
            <Button onClick={handleShowHelpModal} style={{color: "white", padding: "8px", marginTop: "10px"}} className="mx-1 fa-solid fa-info" variant="primary"></Button>
            </div>
            <Modal  {...props}
                  size="lg"
                  aria-labelledby="contained-modal-title-vcenter"
                  centered
                  className="text-center" show={showHelpModal} onHide={handleCloseHelpModal}>
                    <Modal.Header closeButton>
          <Modal.Title>Help</Modal.Title>
          </Modal.Header>
          <Modal.Body>
          Actions Left (from left to right)
          <br></br>
          Move, Action, Bonus Action, Reset
          <br></br>
          Reset will allow you to refresh your Actions Left
          <br></br>
          <br></br>
          If you are on a phone press a button to use that action or hold down on it to see what it does!
          <br></br>
          <br></br>
          If you are on pc click the button or hover over it to see what it does!
          <div className="table-container">
          <Table striped bordered hover size="sm" className="custom-table">
            <thead>
              <tr>
                <td className="center-td">
                  <strong>Change Dice Color:</strong>
                </td>
                <td className="center-td">
                  <input
                    type="color"
                    id="colorPicker"
                    ref={colorPickerRef}
                    value={newColor}
                    onChange={handleColorChange}
                  />
                </td>
                <td className="center-td">
                  <Button onClick={diceColorUpdate} className="bg-warning fa-solid fa-floppy-disk"></Button>
                </td>
              </tr>
            </thead>
          </Table>  
          </div>      
          </Modal.Body>
          <Modal.Footer className="justify-content-between">
          <Button size="lg" className="fa-solid fa-trash delete-button" variant="danger" onClick={() => { handleShowDeleteCharacter(); }}>
          </Button>
          <Button variant="secondary" onClick={handleCloseHelpModal}>
            Close
          </Button>
          </Modal.Footer>
          </Modal>
          <Modal  {...props}
                  size="lg"
                  aria-labelledby="contained-modal-title-vcenter"
                  centered
                  className="text-center" show={showDeleteCharacter} onHide={handleCloseDeleteCharacter}>
                    <Modal.Header closeButton>
          <Modal.Title>Are you sure you want to delete your character?
          </Modal.Title>
          </Modal.Header>
          <Modal.Footer className="justify-content-between">
          <Button variant="danger" onClick={() => { deleteRecord(); }}>
            Im Sure
          </Button>
          <Button variant="secondary" onClick={handleCloseDeleteCharacter}>
            Close
          </Button>
          </Modal.Footer>
        </Modal>
        </Nav>
        </Container>
        </Navbar>
{/* ------------------------------------Character Render------------------------------------------------------------------------------------ */}
<Modal show={showCharacterInfo} onHide={handleCloseCharacterInfo}
       size="sm"
      centered
       >          
        <center>
        <Card className="" style={{ width: 'auto', backgroundImage: 'url(../images/wornpaper.jpg)', backgroundSize: "cover"}}>      
        <Card.Title>Character Info</Card.Title>
        <Table striped bordered hover size="sm">        
        <thead>
          <tr>
          <th>Level</th>
          <td>{totalLevel}</td>
          </tr>
        </thead>
        <thead>
          <tr>
          <th>Occupation</th>
          <td>{form.occupation.map((el, i) => (
            <span key={i}>{el.Level + " " + el.Occupation}</span>
            ))}
          </td>
          </tr>
        </thead>
        <thead>
          <tr>
          <th>Age</th>
          <td>{form.age}</td>
          </tr>
        </thead>
        <thead>
          <tr>
          <th>Sex</th>
          <td>{form.sex}</td>
          </tr>
        </thead>
        <thead>
          <tr>
          <th>Height</th>
          <td>{form.height}</td>
          </tr>
        </thead>
        <thead>
          <tr>
          <th>Weight</th>
          <td>{form.weight}lbs</td>
          </tr>
        </thead>
          </Table>
{/* ----------------------------------------Level Up--------------------------------------------------------------------------------------------------------------------- */}
  <center>
  <Button onClick={handleShowLvlModal} style={{ backgroundImage: "url(../images/icons8-level-up-96.png)", backgroundSize: "cover",  backgroundRepeat: "no-repeat", height: "40px", width: "40px"}} className="mx-1" variant="secondary"></Button>
  </center>
    <Modal size="sm"
          centered
    className="text-center" show={showLvlModal} onHide={handleCloseLvlModal}>
  {/* <Modal.Header closeButton> */}
  <center>
        <Card className="" style={{ width: 'auto', backgroundImage: 'url(../images/wornpaper.jpg)', backgroundSize: "cover"}}>      
        <Card.Title>Level Up</Card.Title>
        <Card.Body> 
        Level: {totalLevel} {'\u2192'} Level: {Number(totalLevel) + 1}
  <br></br>
  HP: {form.health + Number(conMod * totalLevel)} {'\u2192'} HP: {levelForm.health + Number(conMod * (totalLevel + 1))}
  <br></br>
  Attack Bonus: {atkBonus} {'\u2192'} {atkBonusNext}
  <br></br>
  Fortitude Save: {fortSave} {'\u2192'} {fortSaveNext}
  <br></br>
  Will Save: {willSave} {'\u2192'} {willSaveNext}
  <br></br>
  Reflex Save: {reflexSave} {'\u2192'} {reflexSaveNext}
        </Card.Body>
  <Form onSubmit={addFeatToDb}>
    <Form.Group className="mb-3 mx-5">
  <Form.Label className="text-dark">Select Occupation</Form.Label>
  <Form.Select 
  onChange={(e) => updateFeat({ feat: e.target.value })}
   type="text">
    <option></option>
    {/* {form.occupations.map((occupation, i) => (
    <option key={i}>{occupation.Occupation}</option>
    ))} */}
  </Form.Select>
</Form.Group>
  <Button className="rounded-pill" variant="outline-dark" type="submit">Add</Button>
    </Form>
  <Modal.Footer>
    <Button variant="secondary" onClick={handleCloseLvlModal}>
      Close
    </Button>
    <Button variant="primary" onClick={() => {handleCloseLvlModal(); levelUpdate();}}>
      Confirm
    </Button>
  </Modal.Footer>
  </Card>
  </center>
</Modal>
    </Card> 
    </center>
  </Modal>
         {/* -----------------------------------------------------Stat Render------------------------------------------------------ */}
         <Modal show={showStats} onHide={handleCloseStats}
       size="sm"
      centered
       >   
       <center>
        <Card className="" style={{ width: 'auto', backgroundImage: 'url(../images/wornpaper.jpg)', backgroundSize: "cover"}}>       
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
       <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0px' }}>
        <Button
          style={{ display: showBtn, width: '100%' }}
          onClick={() => statsUpdate()}
          className="bg-warning fa-solid fa-floppy-disk"
        ></Button>
        <Button
          style={{ width: '100%' }}
          onClick={() => handleCloseStats()}
          className="bg-secondary fa-solid fa-xmark"
        ></Button>
      </div>
    </Card> 
    </center>  
    </Modal>
     {/* -----------------------------------------------Skill Render--------------------------------------------------------------- */}
     <Modal show={showSkill} onHide={handleCloseSkill}
       size="sm"
      centered
       >   
       <center>
        <Card className="zombieSkills" style={{ width: 'auto', backgroundImage: 'url(../images/wornpaper.jpg)', backgroundSize: "cover"}}>       
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
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('appraise', "totalAppraise")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Appraise</td>
            <td><span id="totalAppraise">{totalAppraise} </span></td>
            <td><span id="appraise">{currAppraise} </span></td>
            <td><span id="intMod">{intMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('appraise', "totalAppraise")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('balance', "totalBalance")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Balance</td>
            <td><span id="totalBalance">{totalBalance} </span></td>
            <td><span id="balance">{currBalance} </span></td>
            <td><span id="dexMod">{dexMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('balance', "totalBalance")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('bluff', "totalBluff")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Bluff</td>
            <td><span id="totalBluff">{totalBluff} </span></td>
            <td><span id="bluff">{currBluff} </span></td>
            <td><span id="chaMod">{chaMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('bluff', "totalBluff")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('climb', "totalClimb")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Climb</td>
            <td><span id="totalClimb">{totalClimb} </span></td>
            <td><span id="climb">{currClimb} </span></td>
            <td><span id="strMod">{strMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('climb', "totalClimb")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('concentration', "totalConcentration")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Concentration</td>
            <td><span id="totalConcentration">{totalConcentration} </span></td>
            <td><span id="concentration">{currConcentration} </span></td>
            <td><span id="conMod">{conMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('concentration', "totalConcentration")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('decipherScript', "totalDecipherScript")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Decipher Script</td>
            <td><span id="totalDecipherScript">{totalDecipherScript} </span></td>
            <td><span id="decipherScript">{currDecipherScript} </span></td>
            <td><span id="intMod">{intMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('decipherScript', "totalDecipherScript")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('diplomacy', "totalDiplomacy")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Diplomacy</td>
            <td><span id="totalDiplomacy">{totalDiplomacy} </span></td>
            <td><span id="diplomacy">{currDiplomacy} </span></td>
            <td><span id="chaMod">{chaMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('diplomacy', "totalDiplomacy")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('disableDevice', "totalDisableDevice")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Disable Device</td>
            <td><span id="totalDisableDevice">{totalDisableDevice} </span></td>
            <td><span id="disableDevice">{currDisableDevice} </span></td>
            <td><span id="intMod">{intMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('disableDevice', "totalDisableDevice")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('disguise', "totalDisguise")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Disguise</td>
            <td><span id="totalDisguise">{totalDisguise} </span></td>
            <td><span id="disguise">{currDisguise} </span></td>
            <td><span id="chaMod">{chaMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('disguise', "totalDisguise")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('escapeArtist', "totalEscapeArtist")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Escape Artist</td>
            <td><span id="totalEscapeArtist">{totalEscapeArtist} </span></td>
            <td><span id="escapeArtist">{currEscapeArtist} </span></td>
            <td><span id="dexMod">{dexMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('escapeArtist', "totalEscapeArtist")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('forgery', "totalForgery")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Forgery</td>
            <td><span id="totalForgery">{totalForgery} </span></td>
            <td><span id="forgery">{currForgery} </span></td>
            <td><span id="intMod">{intMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('forgery', "totalForgery")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('gatherInfo', "totalGatherInfo")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Gather Info</td>
            <td><span id="totalGatherInfo">{totalGatherInfo} </span></td>
            <td><span id="gatherInfo">{currGatherInfo} </span></td>
            <td><span id="chaMod">{chaMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('gatherInfo', "totalGatherInfo")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('handleAnimal', "totalHandleAnimal")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Handle Animal</td>
            <td><span id="totalHandleAnimal">{totalHandleAnimal} </span></td>
            <td><span id="handleAnimal">{currHandleAnimal} </span></td>
            <td><span id="chaMod">{chaMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('handleAnimal', "totalHandleAnimal")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('heal', "totalHeal")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Heal</td>
            <td><span id="totalHeal">{totalHeal} </span></td>
            <td><span id="heal">{currHeal} </span></td>
            <td><span id="wisMod">{wisMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('heal', "totalHeal")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('hide', "totalHide")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Hide</td>
            <td><span id="totalHide">{totalHide} </span></td>
            <td><span id="hide">{currHide} </span></td>
            <td><span id="dexMod">{dexMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('hide', "totalHide")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('intimidate', "totalIntimidate")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Intimidate</td>
            <td><span id="totalIntimidate">{totalIntimidate} </span></td>
            <td><span id="intimidate">{currIntimidate} </span></td>
            <td><span id="chaMod">{chaMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('intimidate', "totalIntimidate")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('jump', "totalJump")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Jump</td>
            <td><span id="totalJump">{totalJump} </span></td>
            <td><span id="jump">{currJump} </span></td>
            <td><span id="strMod">{strMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('jump', "totalJump")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('listen', "totalListen")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Listen</td>
            <td><span id="totalListen">{totalListen} </span></td>
            <td><span id="listen">{currListen} </span></td>
            <td><span id="wisMod">{wisMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('listen', "totalListen")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('moveSilently', "totalMoveSilently")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Move Silently</td>
            <td><span id="totalMoveSilently">{totalMoveSilently} </span></td>
            <td><span id="moveSilently">{currMoveSilently} </span></td>
            <td><span id="dexMod">{dexMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('moveSilently', "totalMoveSilently")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('openLock', "totalOpenLock")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Open Lock</td>
            <td><span id="totalOpenLock">{totalOpenLock} </span></td>
            <td><span id="openLock">{currOpenLock} </span></td>
            <td><span id="dexMod">{dexMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('openLock', "totalOpenLock")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('ride', "totalRide")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Ride</td>
            <td><span id="totalRide">{totalRide} </span></td>
            <td><span id="ride">{currRide} </span></td>
            <td><span id="dexMod">{dexMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('ride', "totalRide")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('search', "totalSearch")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Search</td>
            <td><span id="totalSearch">{totalSearch} </span></td>
            <td><span id="search">{currSearch} </span></td>
            <td><span id="intMod">{intMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('search', "totalSearch")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('senseMotive', "totalSenseMotive")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Sense Motive</td>
            <td><span id="totalSenseMotive">{totalSenseMotive} </span></td>
            <td><span id="senseMotive">{currSenseMotive} </span></td>
            <td><span id="wisMod">{wisMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('senseMotive', "totalSenseMotive")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('sleightOfHand', "totalSleightOfHand")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Sleight of Hand</td>
            <td><span id="totalSleightOfHand">{totalSleightOfHand} </span></td>
            <td><span id="sleightOfHand">{currSleightOfHand} </span></td>
            <td><span id="dexMod">{dexMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('sleightOfHand', "totalSleightOfHand")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('spot', "totalSpot")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Spot</td>
            <td><span id="totalSpot">{totalSpot} </span></td>
            <td><span id="spot">{currSpot} </span></td>
            <td><span id="wisMod">{wisMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('spot', "totalSpot")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('survival', "totalSurvival")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Survival</td>
            <td><span id="totalSurvival">{totalSurvival} </span></td>
            <td><span id="survival">{currSurvival} </span></td>
            <td><span id="wisMod">{wisMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('survival', "totalSurvival")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('swim', "totalSwim")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Swim</td>
            <td><span id="totalSwim">{totalSwim} </span></td>
            <td><span id="swim">{currSwim} </span></td>
            <td><span id="strMod">{strMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('swim', "totalSwim")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('tumble', "totalTumble")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Tumble</td>
            <td><span id="totalTumble">{totalTumble} </span></td>
            <td><span id="tumble">{currTumble} </span></td>
            <td><span id="dexMod">{dexMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('tumble', "totalTumble")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('useTech', "totalUseTech")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Use Tech</td>
            <td><span id="totalUseTech">{totalUseTech} </span></td>
            <td><span id="useTech">{currUseTech} </span></td>
            <td><span id="intMod">{intMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('useTech', "totalUseTech")} className="fa-solid fa-plus"></Button></td>
          </tr>
          <tr>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => removeSkill('useRope', "totalUseRope")} className="bg-danger fa-solid fa-minus"></Button></td>
            <td>Use Rope</td>
            <td><span id="totalUseRope">{totalUseRope} </span></td>
            <td><span id="useRope">{currUseRope} </span></td>
            <td><span id="dexMod">{dexMod} </span></td>
            <td><Button size="sm" style={{ display: showSkillBtn }} onClick={() => addSkill('useRope', "totalUseRope")} className="fa-solid fa-plus"></Button></td>
          </tr>
          {form.newSkill.map((el) => (  
            <tr key={el[0]} style={{display: showSkills}}>           
              <td><Button size="sm" style={{ display: showSkillBtn}} onClick={() => removeSkillNew(el[0], el[1])} className="bg-danger fa-solid fa-minus"></Button></td>
              <td>{el[0]}</td>
              <td><span id={el[0] + "total"}>{Number(el[1]) + intMod}</span></td>
              <td><span id={el[0]}>{Number(el[1])}</span></td>
              <td><span id="">{intMod}</span></td>
              <td><Button size="sm" style={{ display: showSkillBtn}} onClick={() => addSkillNew(el[0])} className="fa-solid fa-plus"></Button></td>
            </tr>
            ))}  
        </tbody>
      </Table>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0px' }}>
        <Button
          style={{ display: showSkillBtn, width: '100%'}} 
          onClick={() => {skillsUpdate(); addUpdatedSkillToDb();}}
          className="bg-warning fa-solid fa-floppy-disk"
        ></Button>
        <Button
          style={{ width: '100%' }}
          onClick={() => handleShowAddSkill()} 
          className="bg-success fa-solid fa-plus"
        ></Button>
           <Button
          style={{ width: '100%' }}
          onClick={() => handleCloseSkill()} 
          className="bg-secondary fa-solid fa-xmark"
        ></Button>
      </div>
    </Card>   
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
      </center>
</Modal>
 {/* -----------------------------------------Feats Render------------------------------------------------------------------------------------------------------------------------------------ */}
 <Modal show={showFeats} onHide={handleCloseFeats}
       size="sm"
      centered
       >   
       <center>
        <Card className="zombiesFeats" style={{ width: 'auto', backgroundImage: 'url(../images/wornpaper.jpg)', backgroundSize: "cover"}}>     
        <Card.Title>Feats</Card.Title>
        <Card.Title style={{ display: showFeatBtn}}>Points Left:<span className="mx-1" id="featPointLeft">{featPointsLeft}</span></Card.Title>
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th>Name</th>
              <th>Notes</th>
              <th>Skills</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
          {form.feat.map((el) => (  
            <tr key={el[0]}>           
              <td>{el[0]}</td>
              <td style={{ display: showDeleteFeatBtn}}><Button size="sm" className="fa-regular fa-eye" variant="primary" onClick={() => {handleShowFeatNotes(); setModalFeatData(el);}}></Button></td>
              <td style={{ display: showDeleteFeatBtn}}>
              {(() => {
               const skillValues = [];

                if (el[2] !== "0") skillValues.push("Appraise: " + el[2] + " ");
                if (el[3] !== "0") skillValues.push("Balance: " + el[3] + " ");
                if (el[4] !== "0") skillValues.push("Bluff: " + el[4] + " ");
                if (el[5] !== "0") skillValues.push("Climb: " + el[5] + " ");
                if (el[6] !== "0") skillValues.push("Concentration: " + el[6] + " ");
                if (el[7] !== "0") skillValues.push("Decipher Script: " + el[7] + " ");
                if (el[8] !== "0") skillValues.push("Diplomacy: " + el[8] + " ");
                if (el[9] !== "0") skillValues.push("Disable Device: " + el[9] + " ");
                if (el[10] !== "0") skillValues.push("Disguise: " + el[10] + " ");
                if (el[11] !== "0") skillValues.push("Escape Artist: " + el[11] + " ");
                if (el[12] !== "0") skillValues.push("Forgery: " + el[12] + " ");
                if (el[13] !== "0") skillValues.push("Gather Info: " + el[13] + " ");
                if (el[14] !== "0") skillValues.push("Handle Animal: " + el[14] + " ");
                if (el[15] !== "0") skillValues.push("Heal: " + el[15] + " ");
                if (el[16] !== "0") skillValues.push("Hide: " + el[16] + " ");
                if (el[17] !== "0") skillValues.push("Intimidate: " + el[17] + " ");
                if (el[18] !== "0") skillValues.push("Jump: " + el[18] + " ");
                if (el[19] !== "0") skillValues.push("Listen: " + el[19] + " ");
                if (el[20] !== "0") skillValues.push("Move Silently: " + el[20] + " ");
                if (el[21] !== "0") skillValues.push("Open Lock: " + el[21] + " ");
                if (el[22] !== "0") skillValues.push("Ride: " + el[22] + " ");
                if (el[23] !== "0") skillValues.push("Search: " + el[23] + " ");
                if (el[24] !== "0") skillValues.push("Sense Motive: " + el[24] + " ");
                if (el[25] !== "0") skillValues.push("Sleight of Hand: " + el[25] + " ");
                if (el[26] !== "0") skillValues.push("Spot: " + el[26] + " ");
                if (el[27] !== "0") skillValues.push("Survival: " + el[27] + " ");
                if (el[28] !== "0") skillValues.push("Swim: " + el[28] + " ");
                if (el[29] !== "0") skillValues.push("Tumble: " + el[29] + " ");
                if (el[30] !== "0") skillValues.push("Use Tech: " + el[30] + " ");
                if (el[31] !== "0") skillValues.push("Use Rope: " + el[31] + " ");

               return(    <div>
                {skillValues.map((skill, index) => (
                  <div key={index}>{skill}</div>
                ))}
              </div>);
              })()}
                
              </td>
              <td><Button size="sm" style={{ display: showDeleteFeatBtn}} className="fa-solid fa-trash" variant="danger" onClick={() => {deleteFeats(el);}}></Button></td>
            </tr>
            ))}   
          </tbody>
        </Table>       
    <Row>
        <Col style={{display: showFeatBtn}}>
          <Form onSubmit={addFeatToDb}>
          <Form.Group className="mb-3 mx-5">
        <Form.Label className="text-dark">Select Feat</Form.Label>
        <Form.Select 
        onChange={(e) => updateFeat({ feat: e.target.value })}
         type="text">
          <option></option>
          {feat.feat.map((el) => (  
          <option key={el.featName} value={[el.featName, el.notes, el.appraise, el.balance, el.bluff, el.climb, 
          el.concentration, el.decipherScript, el.diplomacy, el.disableDevice, el.disguise, el.escapeArtist, 
          el.forgery, el.gatherInfo, el.handleAnimal, el.heal, el.hide, el.intimidate, el.jump, el.listen, 
          el.moveSilently, el.openLock, el.ride, el.search, el.senseMotive, el.sleightOfHand, el.spot, 
          el.survival, el.swim, el.tumble, el.useTech, el.useRope]}>{el.featName}</option>
          ))}
        </Form.Select>
      </Form.Group>
        <Button className="rounded-pill" variant="outline-dark" type="submit">Add</Button>
          </Form>
        </Col>
      </Row>
      </Card> 
      <Modal show={showFeatNotes} onHide={handleCloseFeatNotes}>
        <Modal.Header closeButton>
          <Modal.Title>{modalFeatData[0]}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{modalFeatData[1]}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseFeatNotes}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
</center>
</Modal>
{/* -----------------------------------------Weapons Render---------------------------------------------------------------------------------------------------------------------------------- */}
<Modal show={showWeapons} onHide={handleCloseWeapons}
       size="sm"
      centered
       >   
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
            {form.weapon.map((el) => (  
            <tr key={el[0]}>
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
              <td><Button size="sm" style={{ display: showDeleteBtn}} className="fa-solid fa-trash" variant="danger" onClick={() => {deleteWeapons(el);}}></Button></td>
            </tr>
             ))}
          </tbody>
        </Table>      
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
          <option key={el.weaponName} value={[el.weaponName, el.enhancement, el.damage, el.critical, el.weaponStyle, el.range]}>{el.weaponName}</option>
          ))}
        </Form.Select>
      </Form.Group>
        <Button className="rounded-pill" variant="outline-dark" type="submit">Add</Button>
          </Form>
        </Col>
      </Row>
      </Card> 
</center>
</Modal>
{/* ------------------------------------------------Armor Render---------------------------------------------------------------------------------------------------------------- */}
<Modal show={showArmor} onHide={handleCloseArmor}
       size="sm"
      centered
       >   
       <center>
        <Card className="zombiesArmor" style={{ width: 'auto', backgroundImage: 'url(../images/wornpaper.jpg)', backgroundSize: "cover"}}>       
        <Card.Title>Armor</Card.Title>
        <Table striped bordered hover size="sm">
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
            <tr key={el[0]}>           
              <td>{el[0]}</td>
              <td>{el[1]}</td>
              <td>{el[2]}</td>
              <td>{el[3]}</td>
              <td><Button size="sm" style={{ display: showDeleteArmorBtn}} className="fa-solid fa-trash" variant="danger" onClick={() => {deleteArmors(el);}}></Button></td>
            </tr>
            ))}     
          </tbody>
        </Table>    
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
          <option key={el.armorName} value={[el.armorName, el.armorBonus, el.maxDex, el.armorCheckPenalty]}>{el.armorName}</option>
          ))}
        </Form.Select>
      </Form.Group>
        <Button className="rounded-pill" variant="outline-dark" type="submit">Add</Button>
          </Form>
        </Col>
      </Row>
      </Card> 
    </center>
    </Modal>
     {/* -----------------------------------------Items Render------------------------------------------------------------------------------------------------------------------------------- */}
     <Modal show={showItems} onHide={handleCloseItems}
       size="sm"
      centered
       >   
       <center>
        <Card className="zombiesItems" style={{ width: 'auto', backgroundImage: 'url(../images/wornpaper.jpg)', backgroundSize: "cover"}}>     
        <Card.Title>Items</Card.Title>
        <Table striped bordered hover size="sm">
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
            <tr key={el[0]}>           
              <td>{el[0]}</td>
              <td style={{ display: showDeleteItemBtn}}><Button size="sm" className="fa-regular fa-eye" variant="primary" onClick={() => {handleShowNotes(); setModalItemData(el);}}></Button></td>
              <td style={{ display: showDeleteItemBtn}}>
              {(() => {
               const attributeValues = [];

               if (el[2] !== "0") attributeValues.push("STR:" + el[2] + " ");
               if (el[3] !== "0") attributeValues.push("DEX:" + el[3] + " ");
               if (el[4] !== "0") attributeValues.push("CON:" + el[4] + " ");
               if (el[5] !== "0") attributeValues.push("INT:" + el[5] + " ");
               if (el[6] !== "0") attributeValues.push("WIS:" + el[6] + " ");
               if (el[7] !== "0") attributeValues.push("CHA:" + el[7] + " ");

               return(    <div>
                {attributeValues.map((attribute, index) => (
                  <div key={index}>{attribute}</div>
                ))}
              </div>);
              })()}
              
              </td>
              <td style={{ display: showDeleteItemBtn}}>
              {(() => {
               const skillValues = [];

                if (el[8] !== "0") skillValues.push("Appraise: " + el[8] + " ");
                if (el[9] !== "0") skillValues.push("Balance: " + el[9] + " ");
                if (el[10] !== "0") skillValues.push("Bluff: " + el[10] + " ");
                if (el[11] !== "0") skillValues.push("Climb: " + el[11] + " ");
                if (el[12] !== "0") skillValues.push("Concentration: " + el[12] + " ");
                if (el[13] !== "0") skillValues.push("Decipher Script: " + el[13] + " ");
                if (el[14] !== "0") skillValues.push("Diplomacy: " + el[14] + " ");
                if (el[15] !== "0") skillValues.push("Disable Device: " + el[15] + " ");
                if (el[16] !== "0") skillValues.push("Disguise: " + el[16] + " ");
                if (el[17] !== "0") skillValues.push("Escape Artist: " + el[17] + " ");
                if (el[18] !== "0") skillValues.push("Forgery: " + el[18] + " ");
                if (el[19] !== "0") skillValues.push("Gather Info: " + el[19] + " ");
                if (el[20] !== "0") skillValues.push("Handle Animal: " + el[20] + " ");
                if (el[21] !== "0") skillValues.push("Heal: " + el[21] + " ");
                if (el[22] !== "0") skillValues.push("Hide: " + el[22] + " ");
                if (el[23] !== "0") skillValues.push("Intimidate: " + el[23] + " ");
                if (el[24] !== "0") skillValues.push("Jump: " + el[24] + " ");
                if (el[25] !== "0") skillValues.push("Listen: " + el[25] + " ");
                if (el[26] !== "0") skillValues.push("Move Silently: " + el[26] + " ");
                if (el[27] !== "0") skillValues.push("Open Lock: " + el[27] + " ");
                if (el[28] !== "0") skillValues.push("Ride: " + el[28] + " ");
                if (el[29] !== "0") skillValues.push("Search: " + el[29] + " ");
                if (el[30] !== "0") skillValues.push("Sense Motive: " + el[30] + " ");
                if (el[31] !== "0") skillValues.push("Sleight of Hand: " + el[31] + " ");
                if (el[32] !== "0") skillValues.push("Spot: " + el[32] + " ");
                if (el[33] !== "0") skillValues.push("Survival: " + el[33] + " ");
                if (el[34] !== "0") skillValues.push("Swim: " + el[34] + " ");
                if (el[35] !== "0") skillValues.push("Tumble: " + el[35] + " ");
                if (el[36] !== "0") skillValues.push("Use Tech: " + el[36] + " ");
                if (el[37] !== "0") skillValues.push("Use Rope: " + el[37] + " ");

               return(   <div>
                {skillValues.map((skill, index) => (
                  <div key={index}>{skill}</div>
                ))}
              </div>);
              })()}
                
              </td>
              <td><Button size="sm" style={{ display: showDeleteItemBtn}} className="fa-solid fa-trash" variant="danger" onClick={() => {deleteItems(el);}}></Button></td>
            </tr>
            ))}   
          </tbody>
        </Table>        
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
          <option key={el.itemName} value={[el.itemName, el.notes, el.str, el.dex, el.con, el.int, el.wis, el.cha,
          el.appraise, el.balance, el.bluff, el.climb, el.concentration, el.decipherScript, el.diplomacy, el.disableDevice, 
          el.disguise, el.escapeArtist, el.forgery, el.gatherInfo, el.handleAnimal, el.heal, el.hide, el.intimidate, el.jump, 
          el.listen, el.moveSilently, el.openLock, el.ride, el.search, el.senseMotive, el.sleightOfHand, el.spot, el.survival, 
          el.swim, el.tumble, el.useTech, el.useRope]}>{el.itemName}</option>
          ))}
        </Form.Select>
      </Form.Group>
        <Button className="rounded-pill" variant="outline-dark" type="submit">Add</Button>
          </Form>
        </Col>
      </Row>
      </Card> 
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
</center>
</Modal>
  </center>  
 );
}