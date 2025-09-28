import React, { useState, useEffect } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Button, Form, Col, Row, Alert } from 'react-bootstrap';
import { useNavigate, useParams } from "react-router-dom";
import WeaponPropertyList from '../../Weapons/WeaponPropertyList';
import { resolveWeaponBaseName } from '../../../constants/weaponProperties';
import useWeaponCatalog from '../../../hooks/useWeaponCatalog';

const formatTypeLabel = (label) =>
  typeof label === 'string'
    ? label
        .split(/[-_]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : null;

export default function Weapons({ form, showWeapons, handleCloseWeapons }) {
  const params = useParams();
  const navigate = useNavigate();
  const currentCampaign = String(form.campaign ?? '');

  const [weapon, setWeapon] = useState({ weapon: [] });
  const [addWeapon, setAddWeapon] = useState({ weapon: '' });
  const [chosenWeapon, setChosenWeapon] = useState('');
  const [notification, setNotification] = useState(null);
  const { catalog: weaponCatalog } = useWeaponCatalog();

  const handleChosenWeaponChange = (e) => {
    setChosenWeapon(e.target.value);
  };

  function updateWeapon(value) {
    return setAddWeapon((prev) => ({ ...prev, ...value }));
  }

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
          setNotification({ message: 'Record not found', variant: 'danger' });
          navigate('/');
          return;
        }
        setWeapon({ weapon: record });
      } catch (error) {
        setNotification({ message: error.message || String(error), variant: 'danger' });
      }
    }
    fetchWeapons();
  }, [navigate, currentCampaign]);

  async function addWeaponToDb(e) {
    e.preventDefault();
    const weaponObj = JSON.parse(addWeapon.weapon);
    const newWeapon = [
      ...form.weapon.filter((w) => w[0]),
      [
        weaponObj.name,
        weaponObj.category,
        weaponObj.damage,
        Array.isArray(weaponObj.properties)
          ? weaponObj.properties.join(',')
          : '',
        weaponObj.weight,
        weaponObj.cost,
      ],
    ];
    try {
      await apiFetch(`/equipment/update-weapon/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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

  function deleteWeapons(el) {
    const index = form.weapon.indexOf(el);
    form.weapon.splice(index, 1);
    addDeleteWeaponToDb();
  }

  const showDeleteBtn = form.weapon.length > 0;

  async function addDeleteWeaponToDb() {
    const newWeaponForm = form.weapon.filter((w) => w[0]);
    try {
      await apiFetch(`/equipment/update-weapon/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weapon: newWeaponForm,
        }),
      });
      setNotification({ message: 'Weapon Deleted', variant: 'success' });
      navigate(0);
    } catch (error) {
      setNotification({ message: error.message || String(error), variant: 'danger' });
    }
  }

  return (
    <div>
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
                {form.weapon.map((el) => {
                  const [name, category, damage, rawProperties, weight, cost, type] = el;
                  const propertyArray = Array.isArray(rawProperties)
                    ? rawProperties
                    : typeof rawProperties === 'string'
                    ? rawProperties
                        .split(',')
                        .map((prop) => prop.trim())
                        .filter(Boolean)
                    : [];
                  const baseName = resolveWeaponBaseName({ name, type }, weaponCatalog);
                  const canonicalMatch = baseName && name
                    ? baseName.toLowerCase() === name.toLowerCase()
                    : false;
                  const fallbackBase = !baseName ? formatTypeLabel(type) : null;
                  const rootLabel = !canonicalMatch && (baseName || fallbackBase)
                    ? baseName || fallbackBase
                    : null;

                  return (
                    <Col xs={6} md={4} key={name}>
                      <Card className="weapon-card h-100">
                        <Card.Body>
                          <Card.Title as="h6">{name}</Card.Title>
                          {rootLabel && (
                            <Card.Subtitle className="text-muted small mb-2">
                              {rootLabel}
                            </Card.Subtitle>
                          )}
                          <Card.Text>Category: {category}</Card.Text>
                          <Card.Text>Damage: {damage}</Card.Text>
                          <Card.Text as="div" className="mt-2">
                            <span className="text-uppercase text-muted small fw-semibold d-block">
                              Properties
                            </span>
                            <WeaponPropertyList properties={propertyArray} />
                          </Card.Text>
                          <Card.Text>Weight: {weight}</Card.Text>
                          <Card.Text>Cost: {cost}</Card.Text>
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
                  );
                })}
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
  );
}
