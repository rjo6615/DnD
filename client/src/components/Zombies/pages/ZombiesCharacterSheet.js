import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Nav, Navbar, Container, Button } from 'react-bootstrap';
import '../../../App.scss';
import zombiesbg from "../../../images/zombiesbg.jpg";
import banner from "../../../images/banner.png";
import CharacterInfo from "../attributes/CharacterInfo";
import Stats from "../attributes/Stats";
import Skills from "../attributes/Skills";
import Feats from "../attributes/Feats";
import Weapons from "../attributes/Weapons";

export default function ZombiesCharacterSheet() {
  const params = useParams();
  const characterId = params.id; 
  const [form, setForm] = useState(null);
  const [showCharacterInfo, setShowCharacterInfo] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSkill, setShowSkill] = useState(false); // State for skills modal
  const [showFeats, setShowFeats] = useState(false);
  const [showWeapons, setShowWeapons] = useState(false);

  useEffect(() => {
    async function fetchCharacterData(id) {
      try {
        const response = await fetch(`/characters/${id}`);
        if (!response.ok) {
          throw new Error(`Error fetching character data: ${response.statusText}`);
        }
        const data = await response.json();
        setForm(data);
      } catch (error) {
        console.error(error);
      }
    }

    fetchCharacterData(characterId);
  }, [characterId]);

  const handleShowCharacterInfo = () => setShowCharacterInfo(true);
  const handleCloseCharacterInfo = () => setShowCharacterInfo(false);
  const handleShowStats = () => setShowStats(true);
  const handleCloseStats = () => setShowStats(false);
  const handleShowSkill = () => setShowSkill(true); // Handler to show skills modal
  const handleCloseSkill = () => setShowSkill(false); // Handler to close skills modal
  const handleShowFeats = () => setShowFeats(true);
  const handleCloseFeats = () => setShowFeats(false); 
  const handleShowWeapons = () => setShowWeapons(true);
  const handleCloseWeapons = () => setShowWeapons(false); 

  if (!form) {
    return <div style={{ fontFamily: 'Raleway, sans-serif', backgroundImage: `url(${zombiesbg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "100vh"}}>Loading...</div>;
  }

  // Skills and skill points calculation
  let addedSkillsRanks= [];
  form.newSkill.map((el) => addedSkillsRanks.push(el[1]));
  let totalAddedSkills = addedSkillsRanks.reduce((partialSum, a) => Number(partialSum) + Number(a), 0); 

  let skillTotal = form.appraise + form.balance + form.bluff + form.climb + form.concentration + 
    form.decipherScript + form.diplomacy + form.disableDevice + form.disguise + form.escapeArtist + 
    form.forgery + form.gatherInfo + form.handleAnimal + form.heal + form.hide + form.intimidate + 
    form.jump + form.listen + form.moveSilently + form.openLock + form.ride + form.search + 
    form.senseMotive + form.sleightOfHand + form.spot + form.survival + form.swim + form.tumble + 
    form.useTech + form.useRope;

  const statMods = {
    str: Math.floor((form.str - 10) / 2),
    dex: Math.floor((form.dex - 10) / 2),
    con: Math.floor((form.con - 10) / 2),
    int: Math.floor((form.int - 10) / 2),
    wis: Math.floor((form.wis - 10) / 2),
    cha: Math.floor((form.cha - 10) / 2),
  };

  let firstLevelSkill = Math.floor((Number(form.occupation[0].skillMod) + statMods.int) * 4);
  let allSkillPointsLeft = 0;
  let skillPointsLeft;
  for (const occupation of form.occupation) {
    let occupationLevel = occupation.Occupation === form.occupation[0].Occupation ? occupation.Level - 1 : occupation.Level;
    const skillMod = Number(occupation.skillMod);
    skillPointsLeft = Math.floor((skillMod + statMods.int) * occupationLevel);
    allSkillPointsLeft += skillPointsLeft;
  }
  let totalSkillPointsLeft = allSkillPointsLeft + firstLevelSkill - skillTotal - totalAddedSkills;
  let skillGold = totalSkillPointsLeft === 0 ? "#6C757D" : "gold";

  const statNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const totalLevel = form.occupation.reduce((total, el) => total + Number(el.Level), 0);
  const statTotal = statNames.reduce((sum, stat) => sum + form[stat], 0);
  const statPointsLeft = Math.floor((totalLevel / 4) - (statTotal - form.startStatTotal));

// ---------------------------------------Feats left-----------------------------------------------------
let featLength;
if (JSON.stringify(form.feat) === JSON.stringify([["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]])) { 
  featLength = 0; 
} else {
   featLength = form.feat.length 
  }
let featPointsLeft = Math.floor((totalLevel / 3) - (featLength)) + 1;
let featsGold = featPointsLeft === 0 ? "#6C757D" : "gold";
  
return (
    <center className="pt-3" style={{ fontFamily: 'Raleway, sans-serif', backgroundImage: `url(${zombiesbg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "100vh"}}>
      <div style={{paddingTop: '80px'}}>
        <h1 style={{ fontSize: 28, backgroundPositionY: "450%", width: "300px", height: "95px", backgroundImage: `url(${banner})`, backgroundSize: "cover", backgroundRepeat: "no-repeat"}} className="text-dark">{form.characterName}</h1>  
        <Navbar fixed="bottom" bg="dark" data-bs-theme="dark">
          <Container>
            <Nav className="me-auto mx-auto" style={{marginTop: "-10px"}}>
              <Button onClick={handleShowCharacterInfo} style={{color: "black", padding: "8px", marginTop: "10px"}} className="mx-1 fas fa-image-portrait" variant="secondary"></Button>
              <Button onClick={handleShowStats} style={{color: "black", padding: "8px", marginTop: "10px", backgroundColor: statPointsLeft > 0 ? "gold" : "#6C757D"}} className="mx-1 fas fa-scroll" variant="secondary"></Button>
              <Button onClick={handleShowSkill} style={{color: "black", padding: "8px", marginTop: "10px", backgroundColor: skillGold}} className="mx-1 fas fa-book-open" variant="secondary"></Button>  
              <Button onClick={handleShowFeats} style={{color: "black", padding: "8px", marginTop: "10px", backgroundColor: featsGold}} className="mx-1 fas fa-hand-fist" variant="secondary"></Button>  
              <Button onClick={handleShowWeapons} style={{color: "black", padding: "8px", marginTop: "10px", backgroundColor: "#6C757D"}} className="mx-1 fas fa-wand-sparkles" variant="secondary"></Button>  
            </Nav>
          </Container>
        </Navbar>
        <CharacterInfo form={form} show={showCharacterInfo} handleClose={handleCloseCharacterInfo} />
        <Skills form={form} showSkill={showSkill} handleCloseSkill={handleCloseSkill} totalLevel={totalLevel} strMod={statMods.str} dexMod={statMods.dex} conMod={statMods.con} intMod={statMods.int} chaMod={statMods.cha} wisMod={statMods.wis} />
        <Stats form={form} showStats={showStats} handleCloseStats={handleCloseStats} totalLevel={totalLevel} />
        <Feats form={form} showFeats={showFeats} handleCloseFeats={handleCloseFeats} totalLevel={totalLevel} />
        <Weapons form={form} showWeapons={showWeapons} handleCloseWeapons={handleCloseWeapons} strMod={statMods.str} dexMod={statMods.dex}/>
      </div>
    </center>  
  );
}