import React, { useEffect, useState, useRef, useCallback } from "react";
import apiFetch from '../../../utils/apiFetch';
import Button from 'react-bootstrap/Button';
import { Table, Form, Modal, Card } from 'react-bootstrap';
import { useParams, useNavigate } from "react-router-dom";
import '../../../App.scss';
import loginbg from "../../../images/loginbg.png";
import useUser from '../../../hooks/useUser';
import { SKILLS } from "../skillSchema";
import { STATS } from "../statSchema";
import { notify } from '../../../utils/notification';

export default function RecordList() {
  const params = useParams();
  const [records, setRecords] = useState([]);
  const navigate = useNavigate();
  const user = useUser();

  useEffect(() => {
    if (!user) {
      return;
    }
    async function getRecords() {
    const response = await apiFetch(`/campaigns/${params.campaign}/${user.username}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        notify(message);
        return;
      }

      const records = await response.json();
      setRecords(records);
    }

    getRecords();

    return;
  }, [params.campaign, user]);

  const navigateToCharacter = (id) => {
    navigate(`/zombies-character-sheet/${id}`);
  }

// --------------------------Random Character Creator Section------------------------------------
  const createEmptyArray = (length) => Array(length).fill("");

const createDefaultForm = useCallback((campaign) => {
  const skillDefaults = Object.fromEntries(SKILLS.map(({ key }) => [key, 0]));
  const statDefaults = Object.fromEntries(STATS.map(({ key }) => [key, ""]));
  return {
    token: "",
    characterName: "",
    campaign: campaign.toString(),
    occupation: [""],
    race: null,
    feat: [],
    weapon: [],
    armor: [createEmptyArray(4)],
    item: [createEmptyArray(SKILLS.length + 8)],
    age: "",
    sex: "",
    height: "",
    weight: "",
    startStatTotal: "",
    health: "",
    tempHealth: "",
    ...statDefaults,
    ...skillDefaults,
    newSkill: [["", 0]],
    diceColor: "#000000",
  };
}, []);

  const [form, setForm] = useState(createDefaultForm(params.campaign));

useEffect(() => {
  // Update form state once the token is decoded
  if (user) {
    setForm(prevForm => ({ ...prevForm, token: user.username }));
  }
}, [user]);

const [occupation, setOccupation] = useState({
  occupation: [],
});

const [races, setRaces] = useState({});

const [show, setShow] = useState(false);
const handleClose = () => setShow(false);
const handleShow = () => setShow(true);

const [showAbilitySkillModal, setShowAbilitySkillModal] = useState(false);
const [abilitySelections, setAbilitySelections] = useState([]);
const [skillSelections, setSkillSelections] = useState([]);

// Fetch Occupations
useEffect(() => {
  if (!user) return;
  async function fetchData() {
    const response = await apiFetch(`/classes`);

    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      notify(message);
      return;
    }

    const record = await response.json();
    if (!record) {
      notify(`Record not found`, 'warning');
      navigate("/");
      return;
    }

    const classes = Object.values(record);
    setOccupation(classes);
    setGetOccupation(classes);
  }
  fetchData();
  return;

}, [navigate, user]);

// Fetch Races
useEffect(() => {
  if (!user) return;
  async function fetchRaces() {
    const response = await apiFetch(`/races`);
    if (!response.ok) {
      notify(`An error has occurred: ${response.statusText}`);
      return;
    }
    const data = await response.json();
    setRaces(data);
  }
  fetchRaces();
}, [user]);

// Update the state properties.
function updateForm(value) {
  return setForm((prev) => {
    const updatedForm = { ...prev };

    // Convert numeric values to numbers
    Object.keys(value).forEach((key) => {
      if (!isNaN(value[key])) {
        updatedForm[key] = parseFloat(value[key]);
      } else {
        updatedForm[key] = value[key];
      }
    });

    return updatedForm;
  });
}

 // Function to handle submission.
 async function onSubmit(e) {
  e.preventDefault();
  if (form.race?.abilityChoices || form.race?.skillChoices) {
    setAbilitySelections(Array(form.race?.abilityChoices?.count || 0).fill(""));
    setSkillSelections(Array(form.race?.skillChoices?.count || 0).fill(""));
    setShowAbilitySkillModal(true);
    return;
  }
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
  const normalizedOccupation = {
    Occupation: newOccupation.name,
    Health: newOccupation.hitDie,
    Level: 1,
  };
  updateForm({ occupation: [normalizedOccupation] });

  // Race Randomizer
  const raceKeys = Object.keys(races);
  let chosenRace = null;
  if (raceKeys.length) {
    const randomRaceKey = raceKeys[Math.floor(Math.random() * raceKeys.length)];
    chosenRace = JSON.parse(JSON.stringify(races[randomRaceKey]));
    if (chosenRace.abilityChoices) {
      const { count, options } = chosenRace.abilityChoices;
      for (let i = 0; i < count; i++) {
        const choice = options[Math.floor(Math.random() * options.length)];
        chosenRace.abilities[choice] = (chosenRace.abilities[choice] || 0) + 1;
      }
      delete chosenRace.abilityChoices;
    }
    if (chosenRace.skillChoices) {
      const { count } = chosenRace.skillChoices;
      const available = SKILLS.map((s) => s.key);
      chosenRace.skills = chosenRace.skills || {};
      for (let i = 0; i < count; i++) {
        if (!available.length) break;
        const idx = Math.floor(Math.random() * available.length);
        const skill = available.splice(idx, 1)[0];
        chosenRace.skills[skill] = { proficient: true };
      }
      delete chosenRace.skillChoices;
    }
    updateForm({ race: chosenRace, speed: chosenRace.speed });
      if (chosenRace.skills) {
        updateForm({ skills: { ...(form.skills || {}), ...chosenRace.skills } });
      }
  }

  // Age Randomizer
  let newAge = Math.round(Math.random() * (50 - 19)) + 19;
  updateForm({ age: newAge });

  // Sex Randomizer
  let sexArr = ["Male", "Female"];
  let randomSex = Math.round(Math.random() * 1);
  let newSex = sexArr[randomSex];
  updateForm({ sex: newSex });

  // Height Randomizer - store height as total inches to satisfy numeric validation
  let randomHeight = Math.round(Math.random() * (76 - 60)) + 60;
  updateForm({ height: randomHeight });

  // Weight Randomizer
  let randomWeight = Math.round(Math.random() * (220 - 120)) + 120;
  let newWeight = randomWeight;
  updateForm({ weight: newWeight });

  // Stat Randomizer
    const raceAbilities = (chosenRace && chosenRace.abilities) || {};
    let randomStr = sumArray[0] + Number(newOccupation.str) + (raceAbilities.str || 0);
    updateForm({ str: randomStr });
    let randomDex = sumArray[1] + Number(newOccupation.dex) + (raceAbilities.dex || 0);
    updateForm({ dex: randomDex });
    let randomCon = sumArray[2] + Number(newOccupation.con) + (raceAbilities.con || 0);
    updateForm({ con: randomCon });
    let randomInt = sumArray[3] + Number(newOccupation.int) + (raceAbilities.int || 0);
    updateForm({ int: randomInt });
    let randomWis = sumArray[4] + Number(newOccupation.wis) + (raceAbilities.wis || 0);
    updateForm({ wis: randomWis });
    let randomCha = sumArray[5] + Number(newOccupation.cha) + (raceAbilities.cha || 0);
    updateForm({ cha: randomCha });

  let startStatTotal =
    randomStr +
    randomDex +
    randomCon +
    randomInt +
    randomWis +
    randomCha;
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
   const sendToDb = useCallback(async (characterData) => {
    const baseCharacter = characterData ?? form;
    const newCharacter = {
      ...baseCharacter,
      feat: (baseCharacter.feat || []).filter((feat) => feat?.featName && feat.featName.trim() !== ""),
    };
    if (newCharacter.race == null) {
      delete newCharacter.race;
    }
    try {
      await apiFetch("/characters/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newCharacter),
      });
    } catch (error) {
      notify(error.toString());
      return;
    };
   setForm(createDefaultForm(params.campaign));
  navigate(0);
}, [form, setForm, navigate, createDefaultForm, params.campaign]);

//--------------------------------------------Create Character (Manual)---------------------
const [show5, setShow5] = useState(false);
const handleClose5 = () => setShow5(false);
const handleShow5 = () => setShow5(true);

const [selectedOccupation, setSelectedOccupation] = useState(null);
const selectedAddOccupationRef = useRef();

const [getOccupation, setGetOccupation] = useState([]);

const handleOccupationChange = (event) => {
  const selectedIndex = event.target.selectedIndex;
  setSelectedOccupation(getOccupation[selectedIndex - 1]); // Subtract 1 because the first option is empty
};

const handleRaceChange = (e) => {
  const key = e.target.value;
  const baseRace = races[key] || null;
  const raceObj = baseRace ? JSON.parse(JSON.stringify(baseRace)) : null;

  if (!raceObj) {
    updateForm({ race: null, speed: 0 });
    return;
  }

  let updatedSkills = { ...(form.skills || {}) };

  if (raceObj.skills) {
    updatedSkills = { ...updatedSkills, ...raceObj.skills };
  }

  const updatedValues = { race: raceObj, speed: raceObj.speed };
  if (Object.keys(updatedSkills).length) {
    updatedValues.skills = updatedSkills;
  }
  updateForm(updatedValues);
};

const [isOccupationConfirmed, setIsOccupationConfirmed] = useState(false);

const handleConfirmOccupation = useCallback(() => {
  if (selectedOccupation && !isOccupationConfirmed) {
    const selectedAddOccupation = selectedAddOccupationRef.current.value;
    const occupationExists = form.occupation.some(
      (occupation) => occupation.Occupation === selectedOccupation.name
    );
    const selectedAddOccupationObject = getOccupation.find(
      (occupation) => occupation.name === selectedAddOccupation
    );

    if (!occupationExists && selectedAddOccupationObject) {
      const addOccupationStr = Number(selectedAddOccupationObject.str || 0) + Number(form.str);
      const addOccupationDex = Number(selectedAddOccupationObject.dex || 0) + Number(form.dex);
      const addOccupationCon = Number(selectedAddOccupationObject.con || 0) + Number(form.con);
      const addOccupationInt = Number(selectedAddOccupationObject.int || 0) + Number(form.int);
      const addOccupationWis = Number(selectedAddOccupationObject.wis || 0) + Number(form.wis);
      const addOccupationCha = Number(selectedAddOccupationObject.cha || 0) + Number(form.cha);

      const totalNewStats =
        addOccupationStr +
        addOccupationDex +
        addOccupationCon +
        addOccupationInt +
        addOccupationWis +
        addOccupationCha;

      const updatedForm = {
        ...form,
        occupation: [{ ...selectedOccupation, Occupation: selectedOccupation.name }],
        startStatTotal: totalNewStats,
        str: addOccupationStr,
        dex: addOccupationDex,
        con: addOccupationCon,
        int: addOccupationInt,
        wis: addOccupationWis,
        cha: addOccupationCha,
      };

      setForm(updatedForm);
      setIsOccupationConfirmed(true);
      return updatedForm;
    }
  }
  return form;
}, [selectedOccupation, isOccupationConfirmed, form, getOccupation, selectedAddOccupationRef, setForm]);

const sendManualToDb = useCallback(async (characterData) => {
  const baseCharacter = characterData ?? form;
  const newCharacter = {
    ...baseCharacter,
    feat: (baseCharacter.feat || []).filter((feat) => feat?.featName && feat.featName.trim() !== ""),
  };
  if (!newCharacter.occupation?.[0]?.Level) {
    notify("Class level is required.", 'warning');
    return;
  }
  try {
    const response = await apiFetch("/characters/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newCharacter),
    });
    if (!response.ok) {
      notify(`An error occurred: ${response.statusText}`);
      return;
    }
    const { insertedId } = await response.json();
    handleClose5();
    setRecords((prev) => [...prev, { ...newCharacter, _id: insertedId }]);
    setForm(createDefaultForm(params.campaign));
  } catch (error) {
    notify(error.toString());
  }
}, [form, params.campaign, handleClose5, setRecords, setForm, createDefaultForm]);

// Function to handle submission for manual character creation.
const onSubmitManual = async (e) => {
  e.preventDefault();
  const updatedForm = await handleConfirmOccupation();
  if (updatedForm.race?.abilityChoices || updatedForm.race?.skillChoices) {
    setAbilitySelections(Array(updatedForm.race?.abilityChoices?.count || 0).fill(""));
    setSkillSelections(Array(updatedForm.race?.skillChoices?.count || 0).fill(""));
    setShowAbilitySkillModal(true);
    setForm(updatedForm);
    return;
  }
  await sendToDb(updatedForm);
};

const handleAbilitySkillConfirm = () => {
  const raceObj = { ...form.race };
  let updatedSkills = { ...(form.skills || {}) };

  if (raceObj.abilityChoices) {
    abilitySelections.forEach((choice) => {
      if (choice) {
        raceObj.abilities[choice] = (raceObj.abilities[choice] || 0) + 1;
      }
    });
    delete raceObj.abilityChoices;
  }

  if (raceObj.skillChoices) {
    raceObj.skills = raceObj.skills || {};
    skillSelections.forEach((skill) => {
      if (skill) {
        raceObj.skills[skill] = { proficient: true };
        updatedSkills[skill] = { proficient: true };
      }
    });
    delete raceObj.skillChoices;
  }

  const updatedForm = { ...form, race: raceObj };
  if (Object.keys(updatedSkills).length) {
    updatedForm.skills = updatedSkills;
  }

  setForm(updatedForm);
  setShowAbilitySkillModal(false);
  setAbilitySelections([]);
  setSkillSelections([]);
  sendToDb(updatedForm);
};

const getAvailableAbilityOptions = (index) => {
  const taken = abilitySelections.filter((_, i) => i !== index);
  return form.race?.abilityChoices?.options.filter((opt) => !taken.includes(opt)) || [];
};

const getAvailableSkillOptions = (index) => {
  const taken = skillSelections.filter((_, i) => i !== index);
  const base = SKILLS.map((s) => s.key).filter((s) => !form.skills?.[s]?.proficient);
  return base.filter((opt) => !taken.includes(opt));
};

  return (
    <div className="pt-2 text-center" style={{ fontFamily: 'Raleway, sans-serif', backgroundImage: `url(${loginbg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "100vh"}}>
      <div style={{paddingTop: '150px'}}>
<div style={{ maxHeight: '500px', overflowY: 'auto', position: 'relative', zIndex: '4'}}>
        <Table style={{ width: 'auto', position: "relative", zIndex: "4", margin: "0 auto" }} striped bordered condensed="true" className="zombieCharacterSelectTable dnd-background">
          <thead>
            <tr>
                <th colSpan="4" style={{fontSize: 28}}>{params.campaign.toString()}</th>
            </tr>
            <tr>
              <th colSpan="2">
                  <Button
                    className="fantasy-button"
                    size="sm"
                    style={{ width: 'auto', border: "none" }}
                    variant="primary"
                    onClick={(e) => { e.preventDefault(); bigMaff(); handleShow(); }}
                  >
                    Create Character Random
                  </Button>
              </th>
                <th colSpan="2">
                  <Button
                    className="fantasy-button"
                    size="sm"
                    style={{ width: 'auto', border: "none" }}
                    variant="primary"
                    onClick={(e) => { e.preventDefault(); handleShow5();}}
                  >
                    Create Character Manual
                  </Button>
              </th>
            </tr>
            <tr>
              <th>Character</th>
              <th>Level</th>
              <th>Class</th>
              <th>View</th>
            </tr>
          </thead>
          <tbody>
          {records.map((Characters) => (
              <tr key={Characters._id}>
                <td>{Characters.characterName}</td>
                <td>{Characters.occupation.reduce((total, el) => total + Number(el.Level), 0)}</td>
                <td>
                  {Characters.occupation.map((el, i) => (
                    <span key={i}>{el.Level + " " + el.Occupation}<br></br></span>
                  ))}
                </td>
                <td>
                  <Button
                    className="fantasy-button"
                    size="sm"
                    style={{ width: 'auto', border: "none" }}
                    variant="primary"
                    onClick={() => navigateToCharacter(Characters._id)}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        </div>
    {/* ---------------------------Create Character (Random)------------------------------------------------------- */}
    <Modal className="dnd-modal" centered show={show} onHide={handleClose}>
       <div className="text-center">
        <Card className="dnd-background">
          <Card.Title>Create Random</Card.Title>
        <Card.Body>   
        <div className="text-center">
      <Form onSubmit={onSubmit} className="px-5">
      <Form.Group className="mb-3 pt-3">
       <Form.Label className="text-light">Character Name</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ characterName: e.target.value })}
        type="text" placeholder="Enter character name" />        
     </Form.Group>
     <div className="text-center">
     <Button variant="primary" onClick={handleClose} type="submit">
            Create
          </Button>
          <Button className="ms-4" variant="secondary" onClick={handleClose}>
            Close
          </Button>
          </div>
     </Form>
     </div>
     </Card.Body> 
     </Card>  
     </div>      
      </Modal>
       {/* ---------------------------Create Character (Manual)------------------------------------------------------- */}
    <Modal className="dnd-modal" centered show={show5} onHide={handleClose5}>
       <div className="text-center">
        <Card className="dnd-background">
          <Card.Title>Create Manual</Card.Title>
        <Card.Body>   
        <div className="text-center">
      <Form 
      onSubmit={onSubmitManual} 
      className="px-5">
      <Form.Group className="mb-3 pt-3">
       <Form.Label className="text-light">Character Name</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ characterName: e.target.value })}
        type="text" placeholder="Enter character name max 12 characters" pattern="^([^0-9]{0,12})$"/>        
        <Form.Label className="text-light">Class</Form.Label>
        <Form.Select
              ref={selectedAddOccupationRef}
              onChange={handleOccupationChange}
              defaultValue=""
            >
              <option value="" disabled>Select your class</option>
              {getOccupation.map((occupation, i) => (
                <option key={i}>{occupation.name}</option>
              ))}
            </Form.Select>
        <Form.Label className="text-light">Race</Form.Label>
        <Form.Select onChange={handleRaceChange} defaultValue="">
          <option value="" disabled>Select your race</option>
          {Object.keys(races).map((key) => (
            <option key={key} value={key}>{races[key].name}</option>
          ))}
        </Form.Select>
         <Form.Label className="text-light">Age</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ age: e.target.value })}
        type="number" placeholder="Enter age" pattern="[0-9]*" />
         <Form.Label className="text-light">Sex</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ sex: e.target.value })}
        type="text"  placeholder="Enter sex" pattern="[^0-9]+" />
        <Form.Label className="text-light">Height</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ height: e.target.value })}
        type="number" placeholder="Enter height in inches" pattern="[0-9]*" />
        <Form.Label className="text-light">Weight</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ weight: e.target.value })}
        type="number" placeholder="Enter weight" pattern="[0-9]*" />
        {STATS.map(({ key, label }) => (
          <React.Fragment key={key}>
            <Form.Label className="text-light">{label}</Form.Label>
            <Form.Control
              className="mb-2"
              onChange={(e) => updateForm({ [key]: e.target.value })}
              type="number"
              placeholder={`Enter ${label.toLowerCase()}`}
              pattern="[0-9]*"
            />
          </React.Fragment>
        ))}
        <Form.Label className="text-light">Health</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ health: e.target.value, tempHealth: e.target.value })}
        type="number" placeholder="Enter health" pattern="[0-9]*" />
     </Form.Group>
     <div className="text-center">
     <Button variant="primary" type="submit">
            Create
          </Button>
          <Button className="ms-4" variant="secondary" onClick={handleClose5}>
            Close
          </Button>
          </div>
     </Form>
     </div>
      </Card.Body>
      </Card>
      </div>
      </Modal>
       <Modal className="dnd-modal" centered show={showAbilitySkillModal} onHide={() => setShowAbilitySkillModal(false)}>
       <div className="text-center">
        <Card className="dnd-background">
          <Card.Title>Choose Half-Elf Bonuses</Card.Title>
        <Card.Body>
        {form.race?.abilityChoices && abilitySelections.map((sel, idx) => (
          <Form.Group className="mb-2" key={`ability-${idx}`}>
            <Form.Label className="text-light">Ability Choice {idx + 1}</Form.Label>
            <Form.Select value={sel} onChange={(e) => {
              const arr = [...abilitySelections];
              arr[idx] = e.target.value;
              setAbilitySelections(arr);
            }}>
              <option value="" disabled>Select ability</option>
              {getAvailableAbilityOptions(idx).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </Form.Select>
          </Form.Group>
        ))}
        {form.race?.skillChoices && skillSelections.map((sel, idx) => (
          <Form.Group className="mb-2" key={`skill-${idx}`}>
            <Form.Label className="text-light">Skill Choice {idx + 1}</Form.Label>
            <Form.Select value={sel} onChange={(e) => {
              const arr = [...skillSelections];
              arr[idx] = e.target.value;
              setSkillSelections(arr);
            }}>
              <option value="" disabled>Select skill</option>
              {getAvailableSkillOptions(idx).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </Form.Select>
          </Form.Group>
        ))}
        <div className="text-center">
          <Button variant="primary" onClick={handleAbilitySkillConfirm}>
            Confirm
          </Button>
          <Button className="ms-4" variant="secondary" onClick={() => setShowAbilitySkillModal(false)}>
            Close
          </Button>
        </div>
        </Card.Body>
        </Card>
        </div>
       </Modal>
      </div>
    </div>

  );
}
