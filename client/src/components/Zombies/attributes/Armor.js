import React, { useState, useEffect } from 'react'; // Import useState and React
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Table, Button, Form, Col, Row } from 'react-bootstrap'; // Adjust as per your actual UI library
import { useNavigate, useParams } from "react-router-dom";

export default function Armor({form, showArmor, handleCloseArmor, dexMod}) {
  const params = useParams();
  const navigate = useNavigate();
  // -------------------------------------------Armor---------------------------------------------------------------------------
  //------------------------------------------------------------------------
  const currentCampaign = form.campaign.toString();
  const [armor, setArmor] = useState({
    armor: [],
  });
  const [addArmor, setAddArmor] = useState({
    armor: "",
  });
  const [chosenArmor, setChosenArmor] = useState('');
  const handleChosenArmorChange = (e) => {
      setChosenArmor(e.target.value);
  };
  function updateArmor(value) {
    return setAddArmor((prev) => {
      return { ...prev, ...value };
    });
  }
  // Fetch Armors
  useEffect(() => {
    async function fetchArmor() {
      const response = await apiFetch(`/equipment/armor/${currentCampaign}`);

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

  }, [navigate, currentCampaign]);
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
    const armorArrChunks = splitArmorArr(newArmorArr, 4);
    newArmor = armorArrChunks;
  } else {
    let newArmorArr = (form.armor + "," + addArmor.armor).split(',');
    const armorArrChunks = splitArmorArr(newArmorArr, 4);
    newArmor = armorArrChunks;
  }
  async function addArmorToDb(e){
    e.preventDefault();
    await apiFetch(`/equipment/update-armor/${params.id}`, {
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
  const showDeleteArmorBtn = JSON.stringify(form.armor) !== JSON.stringify([["","","",""]]);
  async function addDeleteArmorToDb(){
    let newArmorForm = form.armor;
    if (JSON.stringify(form.armor) === JSON.stringify([])){
      newArmorForm = [["","","",""]];
      await apiFetch(`/equipment/update-armor/${params.id}`, {
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
      window.alert("Armor Deleted")
      navigate(0);
    } else {
    await apiFetch(`/equipment/update-armor/${params.id}`, {
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
   window.alert("Armor Deleted")
   navigate(0);
  }
  }

return(
    <div>
     {/* ------------------------------------------------Armor Render-----------------------------------------------------------
----------------------------------------------------- */}
<Modal className="dnd-modal modern-modal" show={showArmor} onHide={handleCloseArmor} size="lg" scrollable centered>
  <div className="text-center">
    <Card className="modern-card">
      <Card.Header className="modal-header">
        <Card.Title className="modal-title">Armor</Card.Title>
      </Card.Header>
      <Card.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        <Table striped bordered hover size="sm" className="modern-table">
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
              <td><Button size="sm" className="btn-danger action-btn fa-solid fa-trash" hidden={!showDeleteArmorBtn} onClick={() => {deleteArmors(el);}}></Button></td>
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
        onChange={(e) => {updateArmor({ armor: e.target.value }); handleChosenArmorChange(e);}}
        defaultValue=""
         type="text">
          <option value="" disabled>Select your armor</option>
          {armor.armor.map((el) => (
          <option key={el.armorName} value={[el.armorName, el.armorBonus, el.maxDex, el.armorCheckPenalty]}>{el.armorName}</option>
          ))}
        </Form.Select>
      </Form.Group>
        <Button disabled={!chosenArmor} className="action-btn" type="submit">Add</Button>
          </Form>
        </Col>
      </Row>
      </Card.Body>
      <Card.Footer className="modal-footer">
        <Button className="action-btn close-btn" onClick={handleCloseArmor}>Close</Button>
      </Card.Footer>
    </Card>
  </div>
</Modal>
    </div>
)
}

