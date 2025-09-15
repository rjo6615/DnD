import React, { useState, useEffect } from 'react'; // Import useState and React
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Button, Form, Col, Row, Alert } from 'react-bootstrap'; // Adjust as per your actual UI library
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
  const [notification, setNotification] = useState(null);
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
      try {
        const response = await apiFetch(`/equipment/armor/${currentCampaign}`);

        if (!response.ok) {
          const message = `An error has occurred: ${response.statusText}`;
          setNotification({ message, variant: 'danger' });
          return;
        }

        const record = await response.json();
        if (!record) {
          setNotification({ message: 'Record not found', variant: 'danger' });
          navigate("/");
          return;
        }
        setArmor({armor: record});
      } catch (error) {
        setNotification({ message: error.message || String(error), variant: 'danger' });
      }
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
  if (JSON.stringify(form.armor) === JSON.stringify([["","",""]])) {
    let newArmorArr = addArmor.armor.split(',');
    const armorArrChunks = splitArmorArr(newArmorArr, 3);
    newArmor = armorArrChunks;
  } else {
    let newArmorArr = (form.armor + "," + addArmor.armor).split(',');
    const armorArrChunks = splitArmorArr(newArmorArr, 3);
    newArmor = armorArrChunks;
  }
  async function addArmorToDb(e){
    e.preventDefault();
    try {
      await apiFetch(`/equipment/update-armor/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
         armor: newArmor,
        }),
      });
      navigate(0);
    } catch (error) {
      setNotification({ message: error.message || String(error), variant: 'danger' });
    }
  }
  // This method will delete a armor
  function deleteArmors(el) {
    const index = form.armor.indexOf(el);
    form.armor.splice(index, 1);
    updateArmor(form.armor);
    addDeleteArmorToDb();
  }
  const showDeleteArmorBtn = JSON.stringify(form.armor) !== JSON.stringify([["","",""]]);
  async function addDeleteArmorToDb(){
    let newArmorForm = form.armor;
    if (JSON.stringify(form.armor) === JSON.stringify([])){
      newArmorForm = [["","",""]];
    }
    try {
      await apiFetch(`/equipment/update-armor/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
         armor: newArmorForm,
        }),
      });
      setNotification({ message: 'Armor Deleted', variant: 'success' });
      navigate(0);
    } catch (error) {
      setNotification({ message: error.message || String(error), variant: 'danger' });
    }
  }

return(
    <div>
    {/* ------------------------------------------------Armor Render-----------------------------------------------------------
----------------------------------------------------- */}
<Modal className="dnd-modal modern-modal" show={showArmor} onHide={handleCloseArmor} size="lg" centered>
  <div className="text-center">
    <Card className="modern-card">
      <Card.Header className="modal-header">
        <Card.Title className="modal-title">Armor</Card.Title>
      </Card.Header>
      <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
        {notification && (
          <Alert variant={notification.variant} onClose={() => setNotification(null)} dismissible>
            {notification.message}
          </Alert>
        )}
        <Row className="g-2">
          {form.armor.map((el) => (
            <Col xs={6} md={4} key={el[0]}>
              <Card className="armor-card h-100">
                <Card.Body>
                  <Card.Title as="h6">{el[0]}</Card.Title>
                  <Card.Text>AC Bonus: {el[1]}</Card.Text>
                  <Card.Text>Max Dex Bonus: {el[2]}</Card.Text>
                </Card.Body>
                <Card.Footer>
                  <Button
                    size="sm"
                    className="btn-danger action-btn fa-solid fa-trash"
                    hidden={!showDeleteArmorBtn}
                    onClick={() => {
                      deleteArmors(el);
                    }}
                  ></Button>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
        <Row>
          <Col>
            <Form onSubmit={addArmorToDb}>
              <Form.Group className="mb-3 mx-5">
                <Form.Label className="text-light">Select Armor</Form.Label>
                <Form.Select
                  onChange={(e) => {updateArmor({ armor: e.target.value }); handleChosenArmorChange(e);}}
                  defaultValue=""
                  type="text"
                >
                  <option value="" disabled>Select your armor</option>
                  {armor.armor.map((el) => (
                    <option
                      key={el.armorName}
                      value={[el.armorName, el.acBonus || el.armorBonus, el.maxDex]}
                    >
                      {el.armorName}
                    </option>
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
