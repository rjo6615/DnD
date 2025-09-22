import React, { useState, useEffect } from 'react'; // Import useState and React
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Button, Form, Col, Row, Alert } from 'react-bootstrap'; // Adjust as per your actual UI library
import { useNavigate, useParams } from "react-router-dom";

export default function Weapons({form, showWeapons, handleCloseWeapons}) {
  const params = useParams();
  const navigate = useNavigate();
  //--------------------------------------------Weapons Section-----------------------------------------------------------------------------------------------------------------------------------------------
const currentCampaign = form.campaign.toString();

const [weapon, setWeapon] = useState({ 
    weapon: [], 
  });
  const [addWeapon, setAddWeapon] = useState({
    weapon: "",
  });
  const [chosenWeapon, setChosenWeapon] = useState('');
  const [notification, setNotification] = useState(null);
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
      try {
        const response = await apiFetch(`/equipment/weapons/${currentCampaign}`);

        if (!response.ok) {
          const message = `An error has occurred: ${response.statusText}`;
          setNotification({ message, variant: 'danger' });
          return;
        }

        const record = await response.json();
        if (!record) {
          setNotification({ message: `Record not found`, variant: 'danger' });
          navigate("/");
          return;
        }
        setWeapon({ weapon: record });
      } catch (error) {
        setNotification({ message: error.message || String(error), variant: 'danger' });
      }
    }
    fetchWeapons();
    return;

  }, [navigate, currentCampaign]);
  //  Sends weapon data to database for update
  async function addWeaponToDb(e){
    e.preventDefault();
    const weaponObj = JSON.parse(addWeapon.weapon);
    const newWeapon = [
      ...form.weapon.filter((w) => w[0]),
      [
        weaponObj.name,
        weaponObj.category,
        weaponObj.damage,
        Array.isArray(weaponObj.properties) ? weaponObj.properties.join(',') : '',
        weaponObj.weight,
        weaponObj.cost,
      ],
    ];
    try {
      await apiFetch(`/equipment/update-weapon/${params.id}`, {
       method: "PUT",
       headers: {
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
        weapon: newWeapon,
       }),
     });
     navigate(0);
    } catch (error) {
     setNotification({ message: error.message || String(error), variant: 'danger' });
    }
  }
  // This method will delete a weapon
  function deleteWeapons(el) {
    const index = form.weapon.indexOf(el);
    form.weapon.splice(index, 1);
    addDeleteWeaponToDb();
   }
    const showDeleteBtn = form.weapon.length > 0;
  async function addDeleteWeaponToDb(){
    const newWeaponForm = form.weapon.filter((w) => w[0]);
    try {
      await apiFetch(`/equipment/update-weapon/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
         weapon: newWeaponForm,
        }),
      });
      setNotification({ message: "Weapon Deleted", variant: 'success' });
      navigate(0);
    } catch (error) {
      setNotification({ message: error.message || String(error), variant: 'danger' });
    }
  }
return(
    <div>
        {/* -----------------------------------------Weapons Render---------------------------------------------------------------------------------------------------------------------------------- */}
<Modal className="dnd-modal modern-modal" show={showWeapons} onHide={handleCloseWeapons} size="lg" centered>
  <div className="text-center">
    <Card className="modern-card">
      <Card.Header className="modal-header">
        <Card.Title className="modal-title">Weapons</Card.Title>
      </Card.Header>
      <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
        {notification && (
          <Alert
            variant={notification.variant}
            onClose={() => setNotification(null)}
            dismissible
          >
            {notification.message}
          </Alert>
        )}
        <Row className="g-2">
          {form.weapon.map((el) => (
            <Col xs={6} md={4} key={el[0]}>
              <Card className="weapon-card h-100">
                <Card.Body>
                  <Card.Title as="h6">{el[0]}</Card.Title>
                  <Card.Text>Category: {el[1]}</Card.Text>
                  <Card.Text>Damage: {el[2]}</Card.Text>
                  <Card.Text>Properties: {el[3]}</Card.Text>
                  <Card.Text>Weight: {el[4]}</Card.Text>
                  <Card.Text>Cost: {el[5]}</Card.Text>
                </Card.Body>
                <Card.Footer>
                  <Button
                    size="sm"
                    className="btn-danger action-btn fa-solid fa-trash"
                    hidden={!showDeleteBtn}
                    onClick={() => {
                      deleteWeapons(el);
                    }}
                  ></Button>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
        <Row>
          <Col>
            <Form onSubmit={addWeaponToDb}>
              <Form.Group className="mb-3 mx-5">
                <Form.Label className="text-light">Select Weapon</Form.Label>
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
                    <option key={el.name} value={JSON.stringify(el)}>
                      {el.name}
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