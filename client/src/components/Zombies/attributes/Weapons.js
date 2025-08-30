import React, { useState, useEffect } from 'react'; // Import useState and React
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Table, Button, Form, Col, Row } from 'react-bootstrap'; // Adjust as per your actual UI library
import { useNavigate, useParams } from "react-router-dom";

export default function Weapons({form, showWeapons, handleCloseWeapons, strMod, dexMod}) {
  const params = useParams();
  const navigate = useNavigate();
  //--------------------------------------------Weapons Section-----------------------------------------------------------------------------------------------------------------------------------------------
const currentCampaign = form.campaign.toString();
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

const [weapon, setWeapon] = useState({ 
    weapon: [], 
  });
  const [addWeapon, setAddWeapon] = useState({ 
    weapon: "",
  });
  const [chosenWeapon, setChosenWeapon] = useState('');
  const handleChosenWeaponChange = (e) => {
      setChosenWeapon(e.target.value);
  }; 
  function updateWeapon(value) {
    return setAddWeapon((prev) => {
      return { ...prev, ...value };
    });
  }
  
  // Fetch Weapons
  useEffect(() => {
    async function fetchWeapons() {
      const response = await apiFetch(`/equipment/weapons/${currentCampaign}`);
  
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
    
  }, [navigate, currentCampaign]);
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
    await apiFetch(`/equipment/update-weapon/${params.id}`, {
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
   const showDeleteBtn = JSON.stringify(form.weapon) !== JSON.stringify([["","","","","",""]]);
   const showAtkBonusSave = showDeleteBtn;
  async function addDeleteWeaponToDb(){
    let newWeaponForm = form.weapon;
    if (JSON.stringify(form.weapon) === JSON.stringify([])){
      newWeaponForm = [["","","","","",""]];
      await apiFetch(`/equipment/update-weapon/${params.id}`, {
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
      window.alert("Weapon Deleted")
      navigate(0);
    } else {
    await apiFetch(`/equipment/update-weapon/${params.id}`, {
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
   window.alert("Weapon Deleted")
   navigate(0);
  }
  }
return(
    <div>
        {/* -----------------------------------------Weapons Render---------------------------------------------------------------------------------------------------------------------------------- */}
<Modal className="modern-modal" show={showWeapons} onHide={handleCloseWeapons} size="lg" centered>
  <div className="text-center">
    <Card className="modern-card">
      <Card.Header className="modal-header">
        <Card.Title className="modal-title">Weapons</Card.Title>
      </Card.Header>
      <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
        <Table striped bordered hover size="sm" className="modern-table">
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
                <td hidden={!showAtkBonusSave}>
                  {(() => {
                    if (el[4] === "0") {
                      return Number(atkBonus) + Number(strMod) + Number(el[1]);
                    } else if (el[4] === "1") {
                      return Number(atkBonus) + Number(strMod) + Number(el[1]);
                    } else if (el[4] === "2") {
                      return Number(atkBonus) + Number(dexMod) + Number(el[1]);
                    }
                  })()}
                </td>
                <td hidden={!showAtkBonusSave}>
                  {el[2]}
                  {(() => {
                    if (el[4] === "0") {
                      return "+" + (Number(el[1]) + Number(strMod));
                    } else if (el[4] === "1") {
                      return "+" + (Number(el[1]) + Math.floor(Number(strMod * 1.5)));
                    } else if (el[4] === "2") {
                      return "+" + (Number(el[1]) + Number(0));
                    }
                  })()}
                </td>
                <td>{el[3]}</td>
                <td>{el[5]}</td>
                <td>
                  <Button
                    size="sm"
                    className="btn-danger action-btn fa-solid fa-trash"
                    hidden={!showDeleteBtn}
                    onClick={() => {
                      deleteWeapons(el);
                    }}
                  ></Button>
                </td>
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
                  onChange={(e) => {
                    updateWeapon({ weapon: e.target.value });
                    handleChosenWeaponChange(e);
                  }}
                  defaultValue=""
                  type="text"
                >
                  <option value="" disabled>
                    Select your weapon
                  </option>
                  {weapon.weapon.map((el) => (
                    <option
                      key={el.weaponName}
                      value={[
                        el.weaponName,
                        el.enhancement,
                        el.damage,
                        el.critical,
                        el.weaponStyle,
                        el.range,
                      ]}
                    >
                      {el.weaponName}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Button disabled={!chosenWeapon} className="action-btn" type="submit">
                Add
              </Button>
            </Form>
          </Col>
        </Row>
      </Card.Body>
      <Card.Footer className="modal-footer">
        <Button className="action-btn close-btn" onClick={handleCloseWeapons}>
          Close
        </Button>
      </Card.Footer>
    </Card>
  </div>
</Modal>
    </div>
)
}