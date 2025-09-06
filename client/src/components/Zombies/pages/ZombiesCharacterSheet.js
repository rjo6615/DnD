import React, { useEffect, useState, useRef, useCallback } from "react";
import apiFetch from '../../../utils/apiFetch';
import { useParams } from "react-router-dom";
import { Nav, Navbar, Container, Button, Modal } from 'react-bootstrap';
import '../../../App.scss';
import loginbg from "../../../images/loginbg.png";
import CharacterInfo from "../attributes/CharacterInfo";
import Stats from "../attributes/Stats";
import Skills from "../attributes/Skills";
import Feats from "../attributes/Feats";
import { calculateFeatPointsLeft } from '../../../utils/featUtils';
import WeaponList from "../../Weapons/WeaponList";
import PlayerTurnActions from "../attributes/PlayerTurnActions";
import ArmorList from "../../Armor/ArmorList";
import Items from "../attributes/Items";
import Help from "../attributes/Help";
import { SKILLS } from "../skillSchema";
import HealthDefense from "../attributes/HealthDefense";
import SpellSelector from "../attributes/SpellSelector";

const HEADER_PADDING = 16;

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
  const [showSpells, setShowSpells] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [navHeight, setNavHeight] = useState(0);

  useEffect(() => {
    const nav = document.querySelector('.navbar.fixed-top');
    if (nav) {
      setNavHeight(nav.offsetHeight);
    }
  }, []);

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight + navHeight + HEADER_PADDING);
    }
  }, [form, navHeight]);

  useEffect(() => {
    async function fetchCharacterData(id) {
      try {
        const response = await apiFetch(`/characters/${id}`);
        if (!response.ok) {
          throw new Error(`Error fetching character data: ${response.statusText}`);
        }
        const data = await response.json();
        const feats = (data.feat || []).map((feat) => {
          if (!Array.isArray(feat)) return feat;
          const [featName = "", notes = "", ...rest] = feat;
          const skillVals = rest.slice(0, SKILLS.length);
          const abilityVals = rest.slice(SKILLS.length, SKILLS.length + 6);
          const [initiative = 0, ac = 0, speed = 0, hpMaxBonus = 0, hpMaxBonusPerLevel = 0] =
            rest.slice(SKILLS.length + 6);
          const featObj = { featName, notes };
          SKILLS.forEach(({ key }, idx) => {
            featObj[key] = Number(skillVals[idx] || 0);
          });
          ["str", "dex", "con", "int", "wis", "cha"].forEach((stat, idx) => {
            featObj[stat] = Number(abilityVals[idx] || 0);
          });
          Object.assign(featObj, {
            initiative: Number(initiative || 0),
            ac: Number(ac || 0),
            speed: Number(speed || 0),
            hpMaxBonus: Number(hpMaxBonus || 0),
            hpMaxBonusPerLevel: Number(hpMaxBonusPerLevel || 0),
          });
          return featObj;
        });
        setForm({
          ...data,
          feat: feats,
          weapon: data.weapon || [],
          armor: data.armor || [],
        });
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
  const handleShowSpells = () => setShowSpells(true);
  const handleCloseSpells = () => setShowSpells(false);
  const handleShowHelpModal = () => setShowHelpModal(true);
  const handleCloseHelpModal = () => setShowHelpModal(false);

  const handleWeaponsChange = useCallback(
    async (weapons) => {
      setForm((prev) => ({ ...prev, weapon: weapons }));
      try {
        await apiFetch(`/equipment/update-weapon/${characterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weapon: weapons }),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    },
    [characterId]
  );

  const handleArmorChange = useCallback(
    async (armor) => {
      setForm((prev) => ({ ...prev, armor }));
      try {
        await apiFetch(`/equipment/update-armor/${characterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ armor }),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    },
    [characterId]
  );

  if (!form) {
    return <div style={{ fontFamily: 'Raleway, sans-serif', backgroundImage: `url(${loginbg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", minHeight: "100vh"}}>Loading...</div>;
  }

  const itemBonus = (form.item || []).reduce(
    (acc, el) => ({
      str: acc.str + Number(el[2] || 0),
      dex: acc.dex + Number(el[3] || 0),
      con: acc.con + Number(el[4] || 0),
      int: acc.int + Number(el[5] || 0),
      wis: acc.wis + Number(el[6] || 0),
      cha: acc.cha + Number(el[7] || 0),
    }),
    { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
  );

  const featBonus = (form.feat || []).reduce(
    (acc, el) => ({
      str: acc.str + Number(el.str || 0),
      dex: acc.dex + Number(el.dex || 0),
      con: acc.con + Number(el.con || 0),
      int: acc.int + Number(el.int || 0),
      wis: acc.wis + Number(el.wis || 0),
      cha: acc.cha + Number(el.cha || 0),
    }),
    { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
  );

  const computedStats = {
    str: form.str + itemBonus.str + featBonus.str + (form.race?.abilities?.str || 0),
    dex: form.dex + itemBonus.dex + featBonus.dex + (form.race?.abilities?.dex || 0),
    con: form.con + itemBonus.con + featBonus.con + (form.race?.abilities?.con || 0),
    int: form.int + itemBonus.int + featBonus.int + (form.race?.abilities?.int || 0),
    wis: form.wis + itemBonus.wis + featBonus.wis + (form.race?.abilities?.wis || 0),
    cha: form.cha + itemBonus.cha + featBonus.cha + (form.race?.abilities?.cha || 0),
  };

  const statMods = {
    str: Math.floor((computedStats.str - 10) / 2),
    dex: Math.floor((computedStats.dex - 10) / 2),
    con: Math.floor((computedStats.con - 10) / 2),
    int: Math.floor((computedStats.int - 10) / 2),
    wis: Math.floor((computedStats.wis - 10) / 2),
    cha: Math.floor((computedStats.cha - 10) / 2),
  };

  const statNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const totalLevel = form.occupation.reduce((total, el) => total + Number(el.Level), 0);
  const statTotal = statNames.reduce((sum, stat) => sum + form[stat], 0);
  // Characters no longer receive stat points from leveling
  const statPointsLeft = form.startStatTotal - statTotal;

  const skillPointsLeft =
    (form.proficiencyPoints || 0) -
    Object.entries(form.skills || {}).filter(
      ([key, s]) => s.proficient && !form.race?.skills?.[key]?.proficient
    ).length;
  const skillsGold = skillPointsLeft > 0 ? 'gold' : '#6C757D';

// ---------------------------------------Feats and bonuses----------------------------------------------
const featBonuses = (form.feat || []).reduce(
  (acc, feat) => {
    acc.initiative += Number(feat.initiative || 0);
    acc.speed += Number(feat.speed || 0);
    acc.ac += Number(feat.ac || 0);
    acc.hpMaxBonus += Number(feat.hpMaxBonus || 0);
    acc.hpMaxBonusPerLevel += Number(feat.hpMaxBonusPerLevel || 0);
    return acc;
  },
  {
    initiative: 0,
    speed: 0,
    ac: 0,
    hpMaxBonus: 0,
    hpMaxBonusPerLevel: 0,
  }
);

const featPointsLeft = calculateFeatPointsLeft(form.occupation, form.feat);
const featsGold = featPointsLeft > 0 ? "gold" : "#6C757D";
const spellsGold = (form.spellPoints || 0) > 0 ? "gold" : "#6C757D";
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

return (
  <div
    className="text-center"
    style={{
      fontFamily: 'Raleway, sans-serif',
      backgroundImage: `url(${loginbg})`,
      minHeight: "100vh",
      height: "100vh",
      overflow: "hidden",
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat",
      paddingTop: navHeight + HEADER_PADDING,
    }}
  >
    <div ref={headerRef}>
      <h1
        style={{
          fontSize: "28px",
          fontWeight: 600,
          color: "#FFFFFF",
          padding: "8px 0",
          textAlign: "center",
          letterSpacing: "1px",
          textShadow: "1px 1px 2px rgba(0, 0, 0, 0.4)",
          fontFamily: "'Merriweather', serif",
          textTransform: "capitalize",
          borderBottom: "2px solid #555", // Subtle underline for structure
          display: "inline-block",
        }}
        className="mx-auto"
      >
        {form.characterName}
      </h1>

      <HealthDefense
        form={form}
        totalLevel={totalLevel}
        dexMod={statMods.dex}
        conMod={statMods.con}
        initiative={featBonuses.initiative}
        speed={featBonuses.speed}
        ac={featBonuses.ac}
        hpMaxBonus={featBonuses.hpMaxBonus}
        hpMaxBonusPerLevel={featBonuses.hpMaxBonusPerLevel}
      />
    </div>
    <PlayerTurnActions
      form={form}
      atkBonus={atkBonus}
      dexMod={statMods.dex}
      strMod={statMods.str}
      headerHeight={headerHeight}
    />
    <Navbar
      fixed="bottom"
      data-bs-theme="dark"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <Container style={{ backgroundColor: 'transparent' }}>
        <Nav
          className="me-auto mx-auto"
          style={{ backgroundColor: 'transparent' }}
        >
          <Button
            onClick={handleShowCharacterInfo}
            style={{ color: "black", padding: "8px", marginTop: "10px" }}
            className="mx-1 fas fa-image-portrait"
            variant="secondary"
          ></Button>
          <Button
            onClick={handleShowStats}
            style={{
              color: "black",
              padding: "8px",
              marginTop: "10px",
              backgroundColor: statPointsLeft > 0 ? "gold" : "#6C757D",
            }}
            className="mx-1 fas fa-scroll"
            variant="secondary"
          ></Button>
          <Button
            onClick={handleShowSkill}
            style={{
              color: "black",
              padding: "8px",
              marginTop: "10px",
              backgroundColor: skillsGold,
            }}
            className="mx-1 fas fa-book-open"
            variant="secondary"
          ></Button>
          <Button
            onClick={handleShowFeats}
            style={{
              color: "black",
              padding: "8px",
              marginTop: "10px",
              backgroundColor: featsGold,
            }}
            className="mx-1 fas fa-hand-fist"
            variant="secondary"
          ></Button>
                    <Button
            onClick={handleShowSpells}
            style={{
              color: "black",
              padding: "8px",
              marginTop: "10px",
              backgroundColor: spellsGold,
            }}
            className="mx-1 fas fa-hat-wizard"
            variant="secondary"
          ></Button>
          <Button
            onClick={handleShowWeapons}
            style={{
              color: "black",
              padding: "8px",
              marginTop: "10px",
              backgroundColor: "#6C757D",
            }}
            className="mx-1 fas fa-wand-sparkles"
            variant="secondary"
          ></Button>
          <Button
            onClick={handleShowArmor}
            style={{
              color: "black",
              padding: "8px",
              marginTop: "10px",
              backgroundColor: "#6C757D",
            }}
            className="mx-1 fas fa-shield"
            variant="secondary"
          ></Button>
          <Button
            onClick={handleShowItems}
            style={{
              color: "black",
              padding: "8px",
              marginTop: "10px",
              backgroundColor: "#6C757D",
            }}
            className="mx-1 fas fa-briefcase"
            variant="secondary"
          ></Button>
          <Button
            onClick={handleShowHelpModal}
            style={{ color: "white", padding: "8px", marginTop: "10px" }}
            className="mx-1 fas fa-info"
            variant="primary"
          ></Button>
        </Nav>
      </Container>
    </Navbar>
    <CharacterInfo
      form={form}
      show={showCharacterInfo}
      handleClose={handleCloseCharacterInfo}
    />
    <Skills
      form={form}
      showSkill={showSkill}
      handleCloseSkill={handleCloseSkill}
      totalLevel={totalLevel}
      strMod={statMods.str}
      dexMod={statMods.dex}
      conMod={statMods.con}
      intMod={statMods.int}
      chaMod={statMods.cha}
      wisMod={statMods.wis}
      onSkillsChange={(skills) => setForm((prev) => ({ ...prev, skills }))}
    />
    <Stats form={form} showStats={showStats} handleCloseStats={handleCloseStats} />
    <Feats form={form} showFeats={showFeats} handleCloseFeats={handleCloseFeats} />
      <Modal
        className="dnd-modal modern-modal"
        show={showWeapons}
        onHide={handleCloseWeapons}
        size="lg"
        centered
      >
        <WeaponList
          campaign={form.campaign}
          initialWeapons={form.weapon}
          onChange={handleWeaponsChange}
          characterId={characterId}
          show={showWeapons}
        />
      </Modal>
      <Modal
        className="dnd-modal modern-modal"
        show={showArmor}
        onHide={handleCloseArmor}
        size="lg"
        centered
      >
        <ArmorList
          campaign={form.campaign}
          initialArmor={form.armor}
          onChange={handleArmorChange}
          characterId={characterId}
          show={showArmor}
        />
      </Modal>
    <Items
      form={form}
      showItems={showItems}
      handleCloseItems={handleCloseItems}
    />
    <SpellSelector
      form={form}
      show={showSpells}
      handleClose={handleCloseSpells}
      onSpellsChange={(spells, spellPoints) =>
        setForm((prev) => ({ ...prev, spells, spellPoints }))
      }
    />
    <Help
      form={form}
      showHelpModal={showHelpModal}
      handleCloseHelpModal={handleCloseHelpModal}
    />
  </div>
);
}