import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Nav, Navbar, Container, Button } from 'react-bootstrap';
import '../../../App.scss';
import zombiesbg from "../../../images/zombiesbg.jpg";
import banner from "../../../images/banner.png";
import CharacterInfo from "../attributes/CharacterInfo";
import Stats from "../attributes/Stats";
import Skills from "../attributes/Skills";
import Feats from "../attributes/Feats";
import Weapons from "../attributes/Weapons";
import PlayerTurnActions from "../attributes/PlayerTurnActions";
import Armor from "../attributes/Armor";
import Items from "../attributes/Items";
import Help from "../attributes/Help";
import { SKILLS } from "../skillSchema";
import HealthDefense from "../attributes/HealthDefense";

export default function ZombiesCharacterSheet() {
  const params = useParams();
  const characterId = params.id; 
  const [form, setForm] = useState(null);
  const [showCharacterInfo, setShowCharacterInfo] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSkill, setShowSkill] = useState(false); // State for skills modal
  const [showFeats, setShowFeats] = useState(false);
  const [showWeapons, setShowWeapons] = useState(false);
  const [showArmor, setShowArmor] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

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
  const handleShowArmor = () => setShowArmor(true);
  const handleCloseArmor = () => setShowArmor(false); 
  const handleShowItems = () => setShowItems(true);
  const handleCloseItems = () => setShowItems(false); 
  const handleShowHelpModal = () => setShowHelpModal(true);
  const handleCloseHelpModal = () => setShowHelpModal(false); 

  if (!form) {
    return <div style={{ fontFamily: 'Raleway, sans-serif', backgroundImage: `url(${zombiesbg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "100vh"}}>Loading...</div>;
  }

  // Skills and skill points calculation
  let addedSkillsRanks= [];
  form.newSkill.map((el) => addedSkillsRanks.push(el[1]));
  let totalAddedSkills = addedSkillsRanks.reduce((partialSum, a) => Number(partialSum) + Number(a), 0); 

  let skillTotal = SKILLS.reduce((sum, { key }) => sum + form[key], 0);

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
// ------------------------------------------Attack Bonus---------------------------------------------------
let atkBonus = 0;
const occupations = form.occupation;

for (const occupation of occupations) {
  const level = parseInt(occupation.Level, 10);
  const attackBonusValue = parseInt(occupation.atkBonus, 10);

  if (!isNaN(level)) {
    if (attackBonusValue === 0) {
      atkBonus += Math.floor(level / 2);
    } else if (attackBonusValue === 1) {
      atkBonus += Math.floor(level * 0.75);
    } else if (attackBonusValue === 2) {
      atkBonus += level;
    }
  }
}
if (!form) {
  return <div style={{ fontFamily: 'Raleway, sans-serif', background: "radial-gradient(circle, #1a1a2e, #16213e, #0f3460)", height: "100vh" }}>Loading...</div>;
}

return (
<div className="pt-3 text-center"
  style={{
    fontFamily: 'Raleway, sans-serif',
    background: "#FAFAFA",
    height: "100vh"
  }}
>
      <div style={{paddingTop: '80px'}}>
      <h1
  style={{
    fontSize: "28px",
    fontWeight: 600,
    color: "#000000", 
    padding: "8px 0",
    textAlign: "center",
    letterSpacing: "1px",
    textShadow: "1px 1px 2px rgba(0, 0, 0, 0.4)",
    fontFamily: "'Merriweather', serif",
    textTransform: "capitalize",
    borderBottom: "2px solid #555", // Subtle underline for structure
    display: "inline-block"
  }}
  className="mx-auto"
>
  {form.characterName}
</h1>

        <HealthDefense form={form} totalLevel={totalLevel} dexMod={statMods.dex} conMod={statMods.con}  />
        <PlayerTurnActions form={form} atkBonus={atkBonus} dexMod={statMods.dex} strMod={statMods.str}/>
        <Navbar fixed="bottom" bg="dark" data-bs-theme="dark">
          <Container>
            <Nav className="me-auto mx-auto" style={{marginTop: "-10px"}}>
              <Button onClick={handleShowCharacterInfo} style={{color: "black", padding: "8px", marginTop: "10px"}} className="mx-1 fas fa-image-portrait" variant="secondary"></Button>
              <Button onClick={handleShowStats} style={{color: "black", padding: "8px", marginTop: "10px", backgroundColor: statPointsLeft > 0 ? "gold" : "#6C757D"}} className="mx-1 fas fa-scroll" variant="secondary"></Button>
              <Button onClick={handleShowSkill} style={{color: "black", padding: "8px", marginTop: "10px", backgroundColor: skillGold}} className="mx-1 fas fa-book-open" variant="secondary"></Button>  
              <Button onClick={handleShowFeats} style={{color: "black", padding: "8px", marginTop: "10px", backgroundColor: featsGold}} className="mx-1 fas fa-hand-fist" variant="secondary"></Button>  
              <Button onClick={handleShowWeapons} style={{color: "black", padding: "8px", marginTop: "10px", backgroundColor: "#6C757D"}} className="mx-1 fas fa-wand-sparkles" variant="secondary"></Button> 
              <Button onClick={handleShowArmor} style={{color: "black", padding: "8px", marginTop: "10px", backgroundColor: "#6C757D"}} className="mx-1 fas fa-shield" variant="secondary"></Button>   
              <Button onClick={handleShowItems} style={{color: "black", padding: "8px", marginTop: "10px", backgroundColor: "#6C757D"}} className="mx-1 fas fa-briefcase" variant="secondary"></Button>  
              <Button onClick={handleShowHelpModal} style={{color: "white", padding: "8px", marginTop: "10px"}} className="mx-1 fas fa-info" variant="primary"></Button>    
            </Nav>
          </Container>
        </Navbar>
        <CharacterInfo form={form} show={showCharacterInfo} handleClose={handleCloseCharacterInfo} />
        <Skills form={form} showSkill={showSkill} handleCloseSkill={handleCloseSkill} totalLevel={totalLevel} strMod={statMods.str} dexMod={statMods.dex} conMod={statMods.con} intMod={statMods.int} chaMod={statMods.cha} wisMod={statMods.wis} />
        <Stats form={form} showStats={showStats} handleCloseStats={handleCloseStats} totalLevel={totalLevel} />
        <Feats form={form} showFeats={showFeats} handleCloseFeats={handleCloseFeats} totalLevel={totalLevel} />
        <Weapons form={form} showWeapons={showWeapons} handleCloseWeapons={handleCloseWeapons} strMod={statMods.str} dexMod={statMods.dex}/>
        <Armor form={form} showArmor={showArmor} handleCloseArmor={handleCloseArmor} dexMod={statMods.dex} />
        <Items form={form} showItems={showItems} handleCloseItems={handleCloseItems} />
        <Help form={form} showHelpModal={showHelpModal} handleCloseHelpModal={handleCloseHelpModal} />
      </div>
    </div>
  );
}