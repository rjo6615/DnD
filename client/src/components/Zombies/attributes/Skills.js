import React, { useState } from 'react'; // Import useState and React
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Table, Button, Form } from 'react-bootstrap'; // Adjust as per your actual UI library
import { useNavigate, useParams } from "react-router-dom";

import { SKILLS } from "../skillSchema";
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
    await apiFetch(`/skills/update-add-skill/${params.id}`, {
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
  
   // Sends skillForm data to database for update
   async function skillsUpdate(){
    const updatedSkills = { ...skillForm };
      await apiFetch(`/skills/update-skills/${params.id}`, {
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

const modMap = { str: strMod, dex: dexMod, con: conMod, int: intMod, wis: wisMod, cha: chaMod };

const itemTotals = SKILLS.reduce((acc, {key, itemIndex}) => {
  acc[key] = form.item.reduce((sum, el) => sum + Number(el[itemIndex] || 0), 0);
  return acc;
}, {});

const featTotals = SKILLS.reduce((acc, {key}) => {
  acc[key] = (form.feat || []).reduce((sum, el) => sum + Number(el[key] || 0), 0);
  return acc;
}, {});

const skillForm = SKILLS.reduce((acc, {key}) => ({ ...acc, [key]: form[key] }), {});

const skillTotalForm = SKILLS.reduce((acc, {key, mod, armorPenalty = 0}) => {
  const penalty = armorPenalty ? armorPenalty * totalCheckPenalty : 0;
  acc[key] = form[key] + modMap[mod] + penalty + itemTotals[key] + featTotals[key];
  return acc;
}, {});

let skillTotal = SKILLS.reduce((sum, {key}) => sum + form[key], 0);

let addedSkillsRanks= [];
form.newSkill.map((el) => (
  addedSkillsRanks.push(el[1])
))
let totalAddedSkills = addedSkillsRanks.reduce((partialSum, a) => Number(partialSum) + Number(a), 0);

let firstLevelSkill =
 Math.floor((Number(form.occupation[0].skillMod) + intMod) * 4);
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
  
  const skillKnown = SKILLS.reduce((acc, {key}) => ({ ...acc, [key]: "" }), {});

  function addSkill(skill, totalSkill) {
    if (totalSkillPointsLeft === 0){
    } else if (skillKnown[skill] === "0" && skillForm[skill] === Math.floor((Number(totalLevel) + 3) / 2)) {
    } else if (skillKnown[skill] === "1" && skillForm[skill] === Math.floor(Number(totalLevel) + 3)){
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
    await apiFetch(`/skills/updated-add-skills/${params.id}`, {
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
       <Modal className="modern-modal" show={showSkill} onHide={handleCloseSkill} size="lg" scrollable centered>
        <Card className="modern-card text-center">
          <Card.Header className="modal-header">
            <Card.Title className="modal-title">Skills</Card.Title>
          </Card.Header>
          <Card.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: showSkillBtn }}>
              Points Left:<span className="mx-1" id="skillPointLeft">{totalSkillPointsLeft}</span>
            </div>
            <Table striped bordered hover size="sm" className="modern-table">
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
                {SKILLS.map(({ key, label, mod }) => {
                  const totalId = `total${key.charAt(0).toUpperCase() + key.slice(1)}`;
                  return (
                    <tr key={key}>
                      <td>
                        <Button
                          size="sm"
                          style={{ display: showSkillBtn }}
                          onClick={() => removeSkill(key, totalId)}
                          className="action-btn bg-danger fa-solid fa-minus"
                        ></Button>
                      </td>
                      <td>{label}</td>
                      <td>
                        <span id={totalId}>{skillTotalForm[key]} </span>
                      </td>
                      <td>
                        <span id={key}>{skillForm[key]} </span>
                      </td>
                      <td>
                        <span id={`${mod}Mod`}>{modMap[mod]} </span>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          style={{ display: showSkillBtn }}
                          onClick={() => addSkill(key, totalId)}
                          className="action-btn fa-solid fa-plus"
                        ></Button>
                      </td>
                    </tr>
                  );
                })}

                {form.newSkill.map((el) => (
                  <tr key={el[0]} style={{ display: showSkills }}>
                    <td>
                      <Button
                        size="sm"
                        style={{ display: showSkillBtn }}
                        onClick={() => removeSkillNew(el[0], el[1])}
                        className="action-btn bg-danger fa-solid fa-minus"
                      ></Button>
                    </td>
                    <td>{el[0]}</td>
                    <td>
                      <span id={el[0] + "total"}>{Number(el[1]) + intMod}</span>
                    </td>
                    <td>
                      <span id={el[0]}>{Number(el[1])}</span>
                    </td>
                    <td>
                      <span>{intMod}</span>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        style={{ display: showSkillBtn }}
                        onClick={() => addSkillNew(el[0])}
                        className="action-btn fa-solid fa-plus"
                      ></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
          <Card.Footer className="modal-footer d-flex">
            <Button
              style={{ display: showSkillBtn }}
              onClick={() => {
                skillsUpdate();
                addUpdatedSkillToDb();
              }}
              className="action-btn save-btn fa-solid fa-floppy-disk flex-fill"
            ></Button>
            <Button
              onClick={() => handleShowAddSkill()}
              className="action-btn fa-solid fa-plus flex-fill"
            ></Button>
            <Button
              onClick={() => handleCloseSkill()}
              className="action-btn close-btn fa-solid fa-xmark flex-fill"
            ></Button>
          </Card.Footer>
        </Card>

        <Modal className="modern-modal" show={showAddSkill} onHide={handleCloseAddSkill} centered>
          <Card className="modern-card text-center">
            <Card.Header className="modal-header">
              <Card.Title className="modal-title">Add Skill</Card.Title>
            </Card.Header>
            <Card.Body>
              <Form id="addSkillForm" onSubmit={addSkillToDb} className="px-5">
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
              </Form>
            </Card.Body>
            <Card.Footer className="modal-footer">
              <Button
                className="action-btn close-btn"
                variant="secondary"
                onClick={handleCloseAddSkill}
              >
                Close
              </Button>
              <Button
                disabled={!chosenSkill || !newSkill.skill}
                className="action-btn save-btn ms-4"
                variant="primary"
                type="submit"
                form="addSkillForm"
              >
                Create
              </Button>
            </Card.Footer>
          </Card>
        </Modal>
      </Modal>
      </div>
   );
  }