import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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

const DEFAULT_SIZE_OPTIONS = ["Tiny", "Small", "Medium", "Large"];

const sanitizeLineageAbility = (value) =>
  typeof value === "string" ? value.trim() : "";

const getRaceSizeOptions = (race) => {
  if (!race) {
    return [];
  }
  if (Array.isArray(race.sizeOptions) && race.sizeOptions.length) {
    return race.sizeOptions;
  }
  if (race.size) {
    return [race.size];
  }
  return [];
};

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
    occupation: [],
    race: null,
    dragonAncestryKey: "",
    dragonAncestry: null,
    giantAncestryKey: "",
    giantAncestry: null,
    gnomeLineageKey: "",
    gnomeLineage: null,
    gnomeLineageAbility: "",
    background: null,
    feat: [],
    weapon: [],
    armor: [createEmptyArray(4)],
    item: [createEmptyArray(SKILLS.length + 8)],
    age: "",
    sex: "",
    size: "",
    weight: "",
    startStatTotal: "",
    health: "",
    tempHealth: "",
    alignment: "",
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
const [backgrounds, setBackgrounds] = useState({});

const globalSizeOptions = useMemo(() => {
  const collected = new Set();
  Object.values(races || {}).forEach((race) => {
    getRaceSizeOptions(race).forEach((size) => {
      if (size) {
        collected.add(size);
      }
    });
  });
  return collected.size ? Array.from(collected) : DEFAULT_SIZE_OPTIONS;
}, [races]);

const sizeOptionsForManual = useMemo(() => {
  const baseOptions = form.race?.sizeOptions?.length
    ? form.race.sizeOptions
    : globalSizeOptions;
  const optionsSet = new Set(baseOptions);
  if (form.size && !optionsSet.has(form.size)) {
    optionsSet.add(form.size);
  }
  return Array.from(optionsSet);
}, [form.race, form.size, globalSizeOptions]);

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
      const val = value[key];
      if (typeof val === "number") {
        updatedForm[key] = val;
        return;
      }
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (trimmed !== "" && !Number.isNaN(Number(trimmed))) {
          updatedForm[key] = Number(trimmed);
          return;
        }
        updatedForm[key] = val;
        return;
      }

      updatedForm[key] = val;
    });

    return updatedForm;
  });
}

const attachSelectedAncestryToRace = useCallback((race, {
  dragonAncestryKey,
  dragonAncestry,
  giantAncestryKey,
  giantAncestry,
  gnomeLineageKey,
  gnomeLineage,
  gnomeLineageAbility,
}) => {
  if (!race) return race;
  const updatedRace = { ...race };
  const sanitizedGnomeLineageAbility = sanitizeLineageAbility(
    gnomeLineageAbility
  );

  delete updatedRace.selectedAncestryKey;
  delete updatedRace.selectedAncestry;
  delete updatedRace.selectedLineageAbility;

  if (race.dragonAncestries && dragonAncestryKey && dragonAncestry) {
    updatedRace.selectedAncestryKey = dragonAncestryKey;
    updatedRace.selectedAncestry = dragonAncestry;
  } else if (race.giantAncestries && giantAncestryKey && giantAncestry) {
    updatedRace.selectedAncestryKey = giantAncestryKey;
    updatedRace.selectedAncestry = giantAncestry;
  } else if (race.gnomeLineages && gnomeLineageKey && gnomeLineage) {
    updatedRace.selectedAncestryKey = gnomeLineageKey;
    updatedRace.selectedAncestry = gnomeLineage;
    if (sanitizedGnomeLineageAbility) {
      updatedRace.selectedLineageAbility = sanitizedGnomeLineageAbility;
    }
  }

  return updatedRace;
}, []);

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

// Fetch Backgrounds
useEffect(() => {
  if (!user) return;
  async function fetchBackgrounds() {
    const response = await apiFetch(`/backgrounds`);
    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      notify(message);
      return;
    }
    const record = await response.json();
    setBackgrounds(record);
  }
  fetchBackgrounds();
}, [user]);
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
  const normalizedOcc = {
    Occupation: newOccupation.name,
    Health: newOccupation.hitDie,
    Level: 1,
    proficiencyPoints: newOccupation.proficiencies?.skills?.count || 0,
    armor: newOccupation.proficiencies?.armor || [],
    weapons: newOccupation.proficiencies?.weapons || [],
    tools: newOccupation.proficiencies?.tools || [],
    savingThrows: newOccupation.proficiencies?.savingThrows || [],
    skills: (() => {
      const skills = {};
      const profSkills = newOccupation.proficiencies?.skills;
      if (profSkills?.options && profSkills.count) {
        const available = [...profSkills.options];
        for (let i = 0; i < profSkills.count; i++) {
          if (!available.length) break;
          const idx = Math.floor(Math.random() * available.length);
          const skill = available.splice(idx, 1)[0];
          skills[skill] = { proficient: true };
        }
      }
      return skills;
    })(),
  };
  updateForm({ occupation: [normalizedOcc] });

  const alignmentOptions = [
    "Lawful Good",
    "Neutral Good",
    "Chaotic Good",
    "Lawful Neutral",
    "True Neutral",
    "Chaotic Neutral",
    "Lawful Evil",
    "Neutral Evil",
    "Chaotic Evil",
  ];
  const alignmentValue =
    form.alignment && form.alignment !== ""
      ? form.alignment
      : alignmentOptions[Math.floor(Math.random() * alignmentOptions.length)];
  if (!form.alignment || form.alignment === "") {
    updateForm({ alignment: alignmentValue });
  }

  // Race Randomizer
  const raceKeys = Object.keys(races);
  let chosenRace = null;
  if (raceKeys.length) {
    const randomRaceKey = raceKeys[Math.floor(Math.random() * raceKeys.length)];
    chosenRace = JSON.parse(JSON.stringify(races[randomRaceKey]));
    const raceSizeOptions = getRaceSizeOptions(chosenRace);
    const selectedSize =
      raceSizeOptions.length > 1
        ? raceSizeOptions[Math.floor(Math.random() * raceSizeOptions.length)]
        : raceSizeOptions[0] || "";
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
    let selectedDragonAncestryKey = "";
    let selectedDragonAncestry = null;
    let selectedGiantAncestryKey = "";
    let selectedGiantAncestry = null;
    let selectedGnomeLineageKey = "";
    let selectedGnomeLineage = null;
    let selectedGnomeLineageAbility = "";
    if (chosenRace.name === "Dragonborn" && chosenRace.dragonAncestries) {
      const ancestryKeys = Object.keys(chosenRace.dragonAncestries);
      const alignmentLower = alignmentValue.toLowerCase();
      let ancestryPool = ancestryKeys;
      if (alignmentLower.includes("good")) {
        ancestryPool = ancestryKeys.filter(
          (key) => chosenRace.dragonAncestries[key].moralAlignment === "good"
        );
      } else if (alignmentLower.includes("evil")) {
        ancestryPool = ancestryKeys.filter(
          (key) => chosenRace.dragonAncestries[key].moralAlignment === "evil"
        );
      }
      if (!ancestryPool.length) {
        ancestryPool = ancestryKeys;
      }
      selectedDragonAncestryKey = ancestryPool[Math.floor(Math.random() * ancestryPool.length)];
      selectedDragonAncestry = chosenRace.dragonAncestries[selectedDragonAncestryKey];
      chosenRace.selectedAncestryKey = selectedDragonAncestryKey;
      chosenRace.selectedAncestry = selectedDragonAncestry;
    }
    if (chosenRace.name === "Goliath" && chosenRace.giantAncestries) {
      const ancestryKeys = Object.keys(chosenRace.giantAncestries);
      if (ancestryKeys.length) {
        selectedGiantAncestryKey = ancestryKeys[Math.floor(Math.random() * ancestryKeys.length)];
        selectedGiantAncestry = chosenRace.giantAncestries[selectedGiantAncestryKey];
        chosenRace.selectedAncestryKey = selectedGiantAncestryKey;
        chosenRace.selectedAncestry = selectedGiantAncestry;
      }
    }
    if (chosenRace.name === "Gnome" && chosenRace.gnomeLineages) {
      const lineageKeys = Object.keys(chosenRace.gnomeLineages);
      if (lineageKeys.length) {
        selectedGnomeLineageKey = lineageKeys[Math.floor(Math.random() * lineageKeys.length)];
        selectedGnomeLineage = chosenRace.gnomeLineages[selectedGnomeLineageKey];
        chosenRace.selectedAncestryKey = selectedGnomeLineageKey;
        chosenRace.selectedAncestry = selectedGnomeLineage;
        const abilityOptions = selectedGnomeLineage?.spellcastingAbilities || [];
        if (abilityOptions.length) {
          const randomAbility = abilityOptions[
            Math.floor(Math.random() * abilityOptions.length)
          ];
          const sanitizedAbility = sanitizeLineageAbility(randomAbility);
          selectedGnomeLineageAbility = sanitizedAbility || randomAbility || "";
          if (selectedGnomeLineageAbility) {
            chosenRace.selectedLineageAbility = selectedGnomeLineageAbility;
          }
        }
      }
    }
    setForm((prev) => {
      const updatedSkills = { ...(prev.skills || {}) };
      if (chosenRace.skills) {
        Object.assign(updatedSkills, chosenRace.skills);
      }
      const nextForm = {
        ...prev,
        race: chosenRace,
        speed: chosenRace.speed,
        size: selectedSize || prev.size || "",
        dragonAncestryKey: selectedDragonAncestry ? selectedDragonAncestryKey : "",
        dragonAncestry: selectedDragonAncestry || null,
        giantAncestryKey: selectedGiantAncestry ? selectedGiantAncestryKey : "",
        giantAncestry: selectedGiantAncestry || null,
        gnomeLineageKey: selectedGnomeLineage ? selectedGnomeLineageKey : "",
        gnomeLineage: selectedGnomeLineage || null,
        gnomeLineageAbility: sanitizeLineageAbility(
          selectedGnomeLineageAbility
        ),
      };
      if (Object.keys(updatedSkills).length) {
        nextForm.skills = updatedSkills;
      }
      return nextForm;
    });
  }
  // Background Randomizer
  const backgroundKeys = Object.keys(backgrounds);
  if (backgroundKeys.length) {
    const bg = JSON.parse(JSON.stringify(
      backgrounds[backgroundKeys[Math.floor(Math.random() * backgroundKeys.length)]]
    ));
    setForm((prev) => {
      const updatedSkills = { ...(prev.skills || {}) };
      if (bg.skills) {
        Object.assign(updatedSkills, bg.skills);
      }
      const nextForm = {
        ...prev,
        background: bg,
      };
      if (Object.keys(updatedSkills).length) {
        nextForm.skills = updatedSkills;
      }
      return nextForm;
    });
  }

  // Age Randomizer
  let newAge = Math.round(Math.random() * (50 - 19)) + 19;
  updateForm({ age: newAge });

  // Sex Randomizer
  let sexArr = ["Male", "Female"];
  let randomSex = Math.round(Math.random() * 1);
  let newSex = sexArr[randomSex];
  updateForm({ sex: newSex });

  if (!chosenRace) {
    const fallbackSizeOptions = globalSizeOptions;
    if (fallbackSizeOptions.length) {
      const randomIndex = Math.floor(Math.random() * fallbackSizeOptions.length);
      updateForm({ size: fallbackSizeOptions[randomIndex] });
    }
  }

  // Weight Randomizer
  let randomWeight = Math.round(Math.random() * (220 - 120)) + 120;
  let newWeight = randomWeight;
  updateForm({ weight: newWeight });

  // Stat Randomizer
    const raceAbilities = (chosenRace && chosenRace.abilities) || {};
    let randomStr = sumArray[0] + Number(newOccupation.str || 0) + (raceAbilities.str || 0);
    updateForm({ str: randomStr });
    let randomDex = sumArray[1] + Number(newOccupation.dex || 0) + (raceAbilities.dex || 0);
    updateForm({ dex: randomDex });
    let randomCon = sumArray[2] + Number(newOccupation.con || 0) + (raceAbilities.con || 0);
    updateForm({ con: randomCon });
    let randomInt = sumArray[3] + Number(newOccupation.int || 0) + (raceAbilities.int || 0);
    updateForm({ int: randomInt });
    let randomWis = sumArray[4] + Number(newOccupation.wis || 0) + (raceAbilities.wis || 0);
    updateForm({ wis: randomWis });
    let randomCha = sumArray[5] + Number(newOccupation.cha || 0) + (raceAbilities.cha || 0);
    updateForm({ cha: randomCha });

  const stats = [randomStr, randomDex, randomCon, randomInt, randomWis, randomCha];
  const startStatTotal = stats.reduce((sum, stat) => sum + (Number(stat) || 0), 0);
  updateForm({ startStatTotal });

  const conModValue = Math.floor((randomCon - 10) / 2);
  const newHealth = Number(normalizedOcc.Health);
  const tempHealth = newHealth + conModValue * Number(normalizedOcc.Level);
  updateForm({ health: newHealth, tempHealth });
}

// Health Randomizer
let conMod = Math.floor((form.con - 10) / 2);
const [healthArray, setHealthArray] = useState([]);
const normalizedOccState = form.occupation?.[0] || {};
let newHealth = (healthArray[0] || 0) + Number(normalizedOccState.Health || 0);
let tempHealth = newHealth + Number(conMod) * Number(normalizedOccState.Level || 0);
useEffect(() => {
  updateForm({ health: newHealth });
  updateForm({ tempHealth });
}, [newHealth, tempHealth]);

  useEffect(() => {
  const lvl = (normalizedOccState.Level || 1) - 1;
  const diceValue = normalizedOccState.Health || 0;
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
}, [normalizedOccState.Health, normalizedOccState.Level]);

 // Sends form data to database
   const sendToDb = useCallback(async (characterData) => {
    const baseCharacter = characterData ?? form;
    const newCharacter = {
      ...baseCharacter,
      feat: (baseCharacter.feat || []).filter((feat) => feat?.featName && feat.featName.trim() !== ""),
    };

    delete newCharacter.height;

    const raceWithAncestry = attachSelectedAncestryToRace(
      baseCharacter.race,
      {
        dragonAncestryKey: baseCharacter.dragonAncestryKey,
        dragonAncestry: baseCharacter.dragonAncestry,
        giantAncestryKey: baseCharacter.giantAncestryKey,
        giantAncestry: baseCharacter.giantAncestry,
        gnomeLineageKey: baseCharacter.gnomeLineageKey,
        gnomeLineage: baseCharacter.gnomeLineage,
        gnomeLineageAbility: baseCharacter.gnomeLineageAbility,
      }
    );
    if (raceWithAncestry) {
      newCharacter.race = raceWithAncestry;
    } else {
      delete newCharacter.race;
    }
    if (newCharacter.background == null) {
      delete newCharacter.background;
    }
    Object.keys(newCharacter).forEach((key) => {
      if (newCharacter[key] === "") {
        delete newCharacter[key];
      }
    });
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
      handleClose();
      setRecords((prev) => [...prev, { ...newCharacter, _id: insertedId }]);
      setForm(createDefaultForm(params.campaign));
    } catch (error) {
      notify(error.toString());
    }
}, [form, params.campaign, handleClose, setRecords, setForm, createDefaultForm, attachSelectedAncestryToRace]);

//--------------------------------------------Create Character (Manual)---------------------
const [show5, setShow5] = useState(false);
const handleClose5 = useCallback(() => setShow5(false), []);
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

  setForm((prev) => {
    if (!raceObj) {
      return {
        ...prev,
        race: null,
        speed: 0,
        size: "",
        dragonAncestryKey: "",
        dragonAncestry: null,
        giantAncestryKey: "",
        giantAncestry: null,
        gnomeLineageKey: "",
        gnomeLineage: null,
        gnomeLineageAbility: "",
      };
    }

    const updatedSkills = { ...(prev.skills || {}) };
    if (raceObj.skills) {
      Object.assign(updatedSkills, raceObj.skills);
    }

    const sizeOptions = getRaceSizeOptions(raceObj);
    const shouldRetainPreviousRace = prev.race?.name === raceObj.name;
    const size =
      shouldRetainPreviousRace && sizeOptions.includes(prev.size)
        ? prev.size
        : sizeOptions[0] || (shouldRetainPreviousRace ? prev.size : "");

    let dragonAncestryKey = "";
    let dragonAncestry = null;
    let giantAncestryKey = "";
    let giantAncestry = null;
    let gnomeLineageKey = "";
    let gnomeLineage = null;
    let gnomeLineageAbility = "";
    if (raceObj.dragonAncestries) {
      const prevKey =
        prev.race?.name === raceObj.name && prev.dragonAncestryKey
          ? prev.dragonAncestryKey
          : "";
      if (prevKey && raceObj.dragonAncestries[prevKey]) {
        dragonAncestryKey = prevKey;
        dragonAncestry = raceObj.dragonAncestries[prevKey];
      }
    }

    if (raceObj.giantAncestries) {
      const prevKey =
        prev.race?.name === raceObj.name && prev.giantAncestryKey
          ? prev.giantAncestryKey
          : "";
      if (prevKey && raceObj.giantAncestries[prevKey]) {
        giantAncestryKey = prevKey;
        giantAncestry = raceObj.giantAncestries[prevKey];
      }
    }

    if (raceObj.gnomeLineages) {
      const prevKey =
        prev.race?.name === raceObj.name && prev.gnomeLineageKey
          ? prev.gnomeLineageKey
          : "";
      if (prevKey && raceObj.gnomeLineages[prevKey]) {
        gnomeLineageKey = prevKey;
        gnomeLineage = raceObj.gnomeLineages[prevKey];
        const prevAbilityRaw =
          prev.race?.name === raceObj.name && prev.gnomeLineageAbility
            ? prev.gnomeLineageAbility
            : "";
        const prevAbility = sanitizeLineageAbility(prevAbilityRaw);
        if (
          prevAbility &&
          gnomeLineage?.spellcastingAbilities?.includes(prevAbility)
        ) {
          gnomeLineageAbility = prevAbility;
        }
      }
    }

    const updatedRace = attachSelectedAncestryToRace(raceObj, {
      dragonAncestryKey,
      dragonAncestry,
      giantAncestryKey,
      giantAncestry,
      gnomeLineageKey,
      gnomeLineage,
      gnomeLineageAbility: sanitizeLineageAbility(gnomeLineageAbility),
    });

    const updatedForm = {
      ...prev,
      race: updatedRace,
      speed: raceObj.speed,
      size,
      dragonAncestryKey,
      dragonAncestry,
      giantAncestryKey,
      giantAncestry,
      gnomeLineageKey,
      gnomeLineage,
      gnomeLineageAbility: sanitizeLineageAbility(gnomeLineageAbility),
    };

    if (Object.keys(updatedSkills).length) {
      updatedForm.skills = updatedSkills;
    }

    return updatedForm;
  });
};

const handleDragonAncestryChange = (e) => {
  const key = e.target.value;
  setForm((prev) => {
    if (!prev.race?.dragonAncestries) {
      const sanitizedLineageAbility = sanitizeLineageAbility(
        prev.gnomeLineageAbility
      );
      const updatedRace = attachSelectedAncestryToRace(prev.race, {
        dragonAncestryKey: "",
        dragonAncestry: null,
        giantAncestryKey: prev.giantAncestryKey,
        giantAncestry: prev.giantAncestry,
        gnomeLineageKey: prev.gnomeLineageKey,
        gnomeLineage: prev.gnomeLineage,
        gnomeLineageAbility: sanitizedLineageAbility,
      });
      return {
        ...prev,
        race: updatedRace,
        dragonAncestryKey: "",
        dragonAncestry: null,
        giantAncestryKey: prev.giantAncestryKey,
        giantAncestry: prev.giantAncestry,
        gnomeLineageKey: prev.gnomeLineageKey,
        gnomeLineage: prev.gnomeLineage,
        gnomeLineageAbility: sanitizedLineageAbility,
      };
    }

    const ancestry = prev.race.dragonAncestries[key];
    const updatedRace = attachSelectedAncestryToRace(prev.race, {
      dragonAncestryKey: ancestry ? key : "",
      dragonAncestry: ancestry || null,
      giantAncestryKey: "",
      giantAncestry: null,
      gnomeLineageKey: "",
      gnomeLineage: null,
      gnomeLineageAbility: "",
    });

    return {
      ...prev,
      race: updatedRace,
      dragonAncestryKey: ancestry ? key : "",
      dragonAncestry: ancestry || null,
      giantAncestryKey: "",
      giantAncestry: null,
      gnomeLineageKey: "",
      gnomeLineage: null,
      gnomeLineageAbility: "",
    };
  });
};

const handleGiantAncestryChange = (e) => {
  const key = e.target.value;
  setForm((prev) => {
    if (!prev.race?.giantAncestries) {
      const sanitizedLineageAbility = sanitizeLineageAbility(
        prev.gnomeLineageAbility
      );
      const updatedRace = attachSelectedAncestryToRace(prev.race, {
        dragonAncestryKey: prev.dragonAncestryKey,
        dragonAncestry: prev.dragonAncestry,
        giantAncestryKey: "",
        giantAncestry: null,
        gnomeLineageKey: prev.gnomeLineageKey,
        gnomeLineage: prev.gnomeLineage,
        gnomeLineageAbility: sanitizedLineageAbility,
      });
      return {
        ...prev,
        race: updatedRace,
        dragonAncestryKey: prev.dragonAncestryKey,
        dragonAncestry: prev.dragonAncestry,
        giantAncestryKey: "",
        giantAncestry: null,
        gnomeLineageKey: prev.gnomeLineageKey,
        gnomeLineage: prev.gnomeLineage,
        gnomeLineageAbility: sanitizedLineageAbility,
      };
    }

    const ancestry = prev.race.giantAncestries[key];
    const updatedRace = attachSelectedAncestryToRace(prev.race, {
      dragonAncestryKey: "",
      dragonAncestry: null,
      giantAncestryKey: ancestry ? key : "",
      giantAncestry: ancestry || null,
      gnomeLineageKey: "",
      gnomeLineage: null,
      gnomeLineageAbility: "",
    });

    return {
      ...prev,
      race: updatedRace,
      dragonAncestryKey: "",
      dragonAncestry: null,
      giantAncestryKey: ancestry ? key : "",
      giantAncestry: ancestry || null,
      gnomeLineageKey: "",
      gnomeLineage: null,
      gnomeLineageAbility: "",
    };
  });
};

const handleGnomeLineageChange = (e) => {
  const key = e.target.value;
  setForm((prev) => {
    if (!prev.race?.gnomeLineages) {
      const updatedRace = attachSelectedAncestryToRace(prev.race, {
        dragonAncestryKey: prev.dragonAncestryKey,
        dragonAncestry: prev.dragonAncestry,
        giantAncestryKey: prev.giantAncestryKey,
        giantAncestry: prev.giantAncestry,
        gnomeLineageKey: "",
        gnomeLineage: null,
        gnomeLineageAbility: "",
      });
      return {
        ...prev,
        race: updatedRace,
        gnomeLineageKey: "",
        gnomeLineage: null,
        gnomeLineageAbility: "",
      };
    }

    const lineage = prev.race.gnomeLineages[key];
    const abilityOptions = Array.isArray(lineage?.spellcastingAbilities)
      ? lineage.spellcastingAbilities
      : [];
    const sanitizedAbilityOptions = abilityOptions.map(sanitizeLineageAbility);
    let nextAbility = "";
    if (lineage) {
      const prevAbility = sanitizeLineageAbility(prev.gnomeLineageAbility);
      if (prevAbility && sanitizedAbilityOptions.includes(prevAbility)) {
        nextAbility = prevAbility;
      } else if (sanitizedAbilityOptions.length === 1) {
        nextAbility = sanitizedAbilityOptions[0];
      }
    }

    const updatedRace = attachSelectedAncestryToRace(prev.race, {
      dragonAncestryKey: prev.dragonAncestryKey,
      dragonAncestry: prev.dragonAncestry,
      giantAncestryKey: prev.giantAncestryKey,
      giantAncestry: prev.giantAncestry,
      gnomeLineageKey: lineage ? key : "",
      gnomeLineage: lineage || null,
      gnomeLineageAbility: sanitizeLineageAbility(nextAbility),
    });

    return {
      ...prev,
      race: updatedRace,
      gnomeLineageKey: lineage ? key : "",
      gnomeLineage: lineage || null,
      gnomeLineageAbility: sanitizeLineageAbility(nextAbility),
    };
  });
};

const handleGnomeLineageAbilityChange = (e) => {
  const ability = e.target.value;
  setForm((prev) => {
    if (!prev.race?.gnomeLineages || !prev.gnomeLineageKey) {
      const updatedRace = attachSelectedAncestryToRace(prev.race, {
        dragonAncestryKey: prev.dragonAncestryKey,
        dragonAncestry: prev.dragonAncestry,
        giantAncestryKey: prev.giantAncestryKey,
        giantAncestry: prev.giantAncestry,
        gnomeLineageKey: "",
        gnomeLineage: null,
        gnomeLineageAbility: "",
      });
      return {
        ...prev,
        race: updatedRace,
        gnomeLineageAbility: "",
      };
    }

    const lineage = prev.race.gnomeLineages[prev.gnomeLineageKey];
    const sanitizedAbility = sanitizeLineageAbility(ability);
    const abilityOptions = Array.isArray(lineage?.spellcastingAbilities)
      ? lineage.spellcastingAbilities.map(sanitizeLineageAbility)
      : [];
    const validAbility = abilityOptions.includes(sanitizedAbility)
      ? sanitizedAbility
      : "";

    const updatedRace = attachSelectedAncestryToRace(prev.race, {
      dragonAncestryKey: prev.dragonAncestryKey,
      dragonAncestry: prev.dragonAncestry,
      giantAncestryKey: prev.giantAncestryKey,
      giantAncestry: prev.giantAncestry,
      gnomeLineageKey: lineage ? prev.gnomeLineageKey : "",
      gnomeLineage: lineage || null,
      gnomeLineageAbility: validAbility,
    });

    return {
      ...prev,
      race: updatedRace,
      gnomeLineageAbility: validAbility,
    };
  });
};

const handleBackgroundChange = (e) => {
  const key = e.target.value;
  const base = backgrounds[key] || null;
  const bgObj = base ? JSON.parse(JSON.stringify(base)) : null;
  setForm((prev) => {
    if (!bgObj) {
      return {
        ...prev,
        background: null,
      };
    }

    const updatedSkills = { ...(prev.skills || {}) };
    if (bgObj.skills) {
      Object.assign(updatedSkills, bgObj.skills);
    }

    const updatedForm = {
      ...prev,
      background: bgObj,
    };

    if (Object.keys(updatedSkills).length) {
      updatedForm.skills = updatedSkills;
    }

    return updatedForm;
  });
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
      const normalizedOcc = {
        Occupation: selectedAddOccupationObject.name,
        Health: selectedAddOccupationObject.hitDie,
        Level: 1,
        proficiencyPoints: selectedAddOccupationObject.proficiencies?.skills?.count || 0,
        armor: selectedAddOccupationObject.proficiencies?.armor || [],
        weapons: selectedAddOccupationObject.proficiencies?.weapons || [],
        tools: selectedAddOccupationObject.proficiencies?.tools || [],
        savingThrows: selectedAddOccupationObject.proficiencies?.savingThrows || [],
        skills: (() => {
          const skills = {};
          const profSkills = selectedAddOccupationObject.proficiencies?.skills;
          if (profSkills?.options && profSkills.count) {
            const available = [...profSkills.options];
            for (let i = 0; i < profSkills.count; i++) {
              if (!available.length) break;
              const idx = Math.floor(Math.random() * available.length);
              const skill = available.splice(idx, 1)[0];
              skills[skill] = { proficient: true };
            }
          }
          return skills;
        })(),
      };

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
        occupation: [normalizedOcc],
        str: addOccupationStr,
        dex: addOccupationDex,
        con: addOccupationCon,
        int: addOccupationInt,
        wis: addOccupationWis,
        cha: addOccupationCha,
        startStatTotal: totalNewStats,
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
  delete newCharacter.height;
  const raceWithAncestry = attachSelectedAncestryToRace(
    baseCharacter.race,
    {
      dragonAncestryKey: baseCharacter.dragonAncestryKey,
      dragonAncestry: baseCharacter.dragonAncestry,
      giantAncestryKey: baseCharacter.giantAncestryKey,
      giantAncestry: baseCharacter.giantAncestry,
      gnomeLineageKey: baseCharacter.gnomeLineageKey,
      gnomeLineage: baseCharacter.gnomeLineage,
      gnomeLineageAbility: baseCharacter.gnomeLineageAbility,
    }
  );
  if (raceWithAncestry) {
    newCharacter.race = raceWithAncestry;
  } else {
    delete newCharacter.race;
  }
  if (newCharacter.race == null) {
    delete newCharacter.race;
  }
  if (newCharacter.background == null) {
    delete newCharacter.background;
  }
  Object.keys(newCharacter).forEach((key) => {
    if (newCharacter[key] === "") {
      delete newCharacter[key];
    }
  });
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
}, [form, params.campaign, handleClose5, setRecords, setForm, createDefaultForm, attachSelectedAncestryToRace]);

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
  await sendManualToDb(updatedForm);
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

  const updatedRace = attachSelectedAncestryToRace(
    raceObj,
    {
      dragonAncestryKey: form.dragonAncestryKey,
      dragonAncestry: form.dragonAncestry,
      giantAncestryKey: form.giantAncestryKey,
      giantAncestry: form.giantAncestry,
      gnomeLineageKey: form.gnomeLineageKey,
      gnomeLineage: form.gnomeLineage,
      gnomeLineageAbility: form.gnomeLineageAbility,
    }
  );
  const updatedForm = { ...form, race: updatedRace };
  if (Object.keys(updatedSkills).length) {
    updatedForm.skills = updatedSkills;
  }

  setForm(updatedForm);
  setShowAbilitySkillModal(false);
  setAbilitySelections([]);
  setSkillSelections([]);
  if (show5) {
    sendManualToDb(updatedForm);
  } else {
    sendToDb(updatedForm);
  }
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
        {form.race?.name === "Dragonborn" && (
          <>
            <Form.Label className="text-light">Dragon Ancestry</Form.Label>
            <Form.Select
              value={form.dragonAncestryKey || ""}
              onChange={handleDragonAncestryChange}
            >
              <option value="" disabled>Select your dragon ancestry</option>
              {Object.entries(form.race.dragonAncestries || {}).map(([key, ancestry]) => (
                <option key={key} value={key}>{ancestry.label}</option>
              ))}
            </Form.Select>
          </>
        )}
        {form.race?.name === "Goliath" && (
          <>
            <Form.Label className="text-light">Giant Ancestry</Form.Label>
            <Form.Select
              value={form.giantAncestryKey || ""}
              onChange={handleGiantAncestryChange}
            >
              <option value="" disabled>Select your giant ancestry</option>
              {Object.entries(form.race.giantAncestries || {}).map(([key, ancestry]) => (
                <option key={key} value={key}>
                  {ancestry.ancestryName || ancestry.label || ancestry.name || "Giant Ancestry"}
                </option>
              ))}
            </Form.Select>
          </>
        )}
        {form.race?.name === "Gnome" && (
          <>
            <Form.Label className="text-light">Gnome Lineage</Form.Label>
            <Form.Select
              value={form.gnomeLineageKey || ""}
              onChange={handleGnomeLineageChange}
            >
              <option value="" disabled>Select your gnome lineage</option>
              {Object.entries(form.race.gnomeLineages || {}).map(([key, lineage]) => (
                <option key={key} value={key}>
                  {lineage.label || lineage.name || "Gnome Lineage"}
                </option>
              ))}
            </Form.Select>
            {form.gnomeLineage?.spellcastingAbilities?.length ? (
              <>
                <Form.Label className="text-light">Spellcasting Ability</Form.Label>
                <Form.Select
                  value={form.gnomeLineageAbility || ""}
                  onChange={handleGnomeLineageAbilityChange}
                >
                  <option value="" disabled>Select your spellcasting ability</option>
                  {(form.gnomeLineage?.spellcastingAbilities || []).map((ability) => (
                    <option key={ability} value={ability}>
                      {ability}
                    </option>
                  ))}
                </Form.Select>
              </>
            ) : null}
          </>
        )}
        <Form.Label className="text-light">Background</Form.Label>
        <Form.Select onChange={handleBackgroundChange} defaultValue="">
          <option value="" disabled>Select your background</option>
          {Object.keys(backgrounds).map((key) => (
            <option key={key} value={key}>{backgrounds[key].name}</option>
          ))}
        </Form.Select>
         <Form.Label className="text-light">Age</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ age: e.target.value })}
        type="number" placeholder="Enter age" pattern="[0-9]*" />
         <Form.Label className="text-light">Sex</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ sex: e.target.value })}
        type="text"  placeholder="Enter sex" pattern="[^0-9]+" />
        <Form.Label className="text-light">Size</Form.Label>
        <Form.Select
          className="mb-2"
          value={form.size || ""}
          onChange={(e) => updateForm({ size: e.target.value })}
        >
          <option value="" disabled>Select your size</option>
          {sizeOptionsForManual.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Form.Select>
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
          <Card.Title>Choose Bonus Options</Card.Title>
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
