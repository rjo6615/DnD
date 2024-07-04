import React, { useState } from 'react'; // Import useState and React
import { Modal, Card, Table, Button, Form } from 'react-bootstrap'; // Adjust as per your actual UI library
import { useNavigate, useParams } from "react-router";
import wornpaper from "../../../images/wornpaper.jpg";

export default function Skills({ form, showSkill, handleCloseSkill, totalLevel, strMod, dexMod, conMod, intMod, chaMod, wisMod}) {
  const params = useParams();
  const navigate = useNavigate();

  //-----------------------Skills--------------------------------------------------------------------------------------------------------------------------------------------------------------------
  const [showAddSkill, setShowAddSkill] = useState(false);
  const handleShowAddSkill = () => setShowAddSkill(true);
  const handleCloseAddSkill = () => {setShowAddSkill(false); setChosenSkill('');};
  const [chosenSkill, setChosenSkill] = useState('');
  const handleChosenSkillChange = (e) => {
      setChosenSkill(e.target.value);
  }
  
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
  
  if (!form) {
    return <div>Loading...</div>;
  }

  const occupations = form.occupation;
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
  
  let firstLevelSkill = Math.floor((Number(form.occupation[0].skillMod) + intMod) * 4);
  let allSkillPointsLeft = 0;
  let skillPointsLeft;
  for (const occupation of occupations) {
      if (occupation.Occupation === form.occupation[0].Occupation) {
        let occupationLevel = occupation.Level - 1;
        const skillMod = Number(occupation.skillMod);
        skillPointsLeft = Math.floor((skillMod + intMod) * (occupationLevel));
        allSkillPointsLeft += skillPointsLeft;
      } else {
        let occupationLevel = occupation.Level;
        const skillMod = Number(occupation.skillMod);
        skillPointsLeft = Math.floor((skillMod + intMod) * (occupationLevel));
        allSkillPointsLeft += skillPointsLeft;
      }
  }
  let totalSkillPointsLeft = allSkillPointsLeft + firstLevelSkill  - skillTotal - totalAddedSkills;
  let showSkillBtn = "";
  if (totalSkillPointsLeft === 0) {
    showSkillBtn = "none";
  }
  
  const skillKnown = {
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
  }
  for (const skill in skillKnown) {
    let highestValue = -1;
  
    for (const occupation of occupations) {
      const skillValue = parseInt(occupation[skill], 10);
      if (!isNaN(skillValue) && skillValue > highestValue) {
        highestValue = skillValue;
      }
    }
    skillKnown[skill] = highestValue.toString();
  }
  
  function addSkill(skill, totalSkill) {
    if (totalSkillPointsLeft === 0){
    } else if (skillKnown[skill] === "0" && skillForm[skill] === Math.floor((Number(totalLevel) + 3) / 2)) {  
    } else if (skillKnown[skill]  === "1" && skillForm[skill] === Math.floor(Number(totalLevel) + 3)){
    } else {
    skillForm[skill]++;
    skillTotalForm[skill]++;
    totalSkillPointsLeft--;
    document.getElementById(skill).innerHTML = skillForm[skill];
    document.getElementById(totalSkill).innerHTML = skillTotalForm[skill];
    document.getElementById("skillPointLeft").innerHTML = totalSkillPointsLeft;
    }
  };
  function removeSkill(skill, totalSkill) {
    if (skillForm[skill] === form[skill]){
    } else {
    skillForm[skill]--;
    skillTotalForm[skill]--;
    totalSkillPointsLeft++;
    document.getElementById(skill).innerHTML = skillForm[skill];
    document.getElementById(totalSkill).innerHTML = skillTotalForm[skill];
    document.getElementById("skillPointLeft").innerHTML = totalSkillPointsLeft;
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
    if (totalSkillPointsLeft === 0){
    } else if (newSkillForm[skill] === Math.floor(Number(totalLevel) + 3)){
    } else {
    newSkillForm[skill]++;
    totalSkillPointsLeft--;
    document.getElementById(skill).innerHTML = newSkillForm[skill];
    document.getElementById(skill + "total").innerHTML = newSkillForm[skill] + intMod;
    document.getElementById("skillPointLeft").innerHTML = totalSkillPointsLeft;
    }
  };
  function removeSkillNew(skill, rank) {
    if (Number(newSkillForm[skill]) === Number(rank)){
    } else {
    newSkillForm[skill]--;
    totalSkillPointsLeft++;
    document.getElementById(skill).innerHTML = newSkillForm[skill];
    document.getElementById(skill + "total").innerHTML = newSkillForm[skill] + intMod;
    document.getElementById("skillPointLeft").innerHTML = totalSkillPointsLeft;
    }
  };
      return (   
      <div>  
       {/* -----------------------------------------------Skill Render--------------------------------------------------------------- */}
       <Modal show={showSkill} onHide={handleCloseSkill}
         size="sm"
        centered
         >   
         <center>
          <Card className="zombieSkills" style={{ width: 'auto', backgroundImage: `url(${wornpaper})`, backgroundSize: "cover"}}>       
          <Card.Title>Skills</Card.Title>
          <Card.Title style={{ display: showSkillBtn}}>Points Left:<span className="mx-1" id="skillPointLeft">{totalSkillPointsLeft}</span></Card.Title>
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
      </center>
        <Modal show={showAddSkill} onHide={handleCloseAddSkill} centered>
        <center>
          <Card className="" style={{ width: 'auto', backgroundImage: `url(${wornpaper})`, backgroundSize: "cover"}}>
          <Card.Body>
          <Form onSubmit={addSkillToDb} className="px-5">
    <Form.Group className="mb-3 pt-3">
      <Form.Label className="text-dark">Skill</Form.Label>
      <Form.Control
        className="mb-2"
        onChange={(e) => updateNewSkill({ skill: e.target.value })}
        type="text"
        placeholder="Enter Skill"
      />
      <Form.Label className="text-dark">Skill Type</Form.Label>
      <Form.Select
        className="mb-2"
        onChange={(e) => {
          const newSkill = e.target.value;
          updateAddSkill({ newSkill });
          handleChosenSkillChange(e);
        }}
        defaultValue=""
        type="text"
      >
        <option value="" disabled>
          Select skill type
        </option>
        <option value={["Knowledge " + newSkill.skill, 0]}>Knowledge</option>
        <option value={["Craft " + newSkill.skill, 0]}>Craft</option>
      </Form.Select>
    </Form.Group>
    <Button variant="secondary" onClick={handleCloseAddSkill}>
      Close
    </Button>
    <Button
      disabled={!chosenSkill || !newSkill.skill} // Disable when either field is empty
      className="ms-4"
      variant="primary"
      type="submit"
    >
      Create
    </Button>
  </Form>
       </Card.Body>
          <Modal.Footer>
          </Modal.Footer>
          </Card>
          </center>
        </Modal>
  </Modal>
  </div>
   );
  }